import { Prisma, Tags, Topics } from "@/generated/prisma";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Force Node.js runtime to avoid Vercel Edge issues
export const runtime = "nodejs";

// Validation schema for query parameters
const searchQuerySchema = z.object({
  q: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .toUpperCase()
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag): tag is Tags =>
              Object.values(Tags).includes(tag as Tags)
            )
        : []
    ),
  topics: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .toUpperCase()
            .split(",")
            .map((topic) => topic.trim())
            .filter((topic): topic is Topics =>
              Object.values(Topics).includes(topic as Topics)
            )
        : []
    ),
  page: z
    .string()
    .default("1")
    .transform((val) => Math.max(1, parseInt(val, 10))),
  limit: z
    .string()
    .default("10")
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10)))),
  sort: z.enum(["createdAt", "title"]).default("createdAt").optional(),
});

// Validation schema for POST body
const searchBodySchema = z.object({
  query: z.string().optional(),
  tags: z
    .array(z.enum(Object.values(Tags) as [string, ...string[]]))
    .optional(),
  topics: z
    .array(z.enum(Object.values(Topics) as [string, ...string[]]))
    .optional(),
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(100).default(10).optional(),
  sort: z.enum(["createdAt", "title"]).default("createdAt").optional(),
});

// Cache configuration (in-memory cache for simplicity)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Utility function to build search filter
const buildSearchFilter = (
  query: string | undefined,
  tags: Tags[],
  topics: Topics[]
): Prisma.BlogWhereInput => {
  const filter: Prisma.BlogWhereInput = {
    OR: query
      ? [
          { title: { contains: query, mode: "insensitive" } },
          { subTitle: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ]
      : undefined,
    tags: tags.length ? { hasSome: tags } : undefined,
    topics: topics.length ? { hasSome: topics } : undefined,
  };

  // Remove undefined keys
  Object.keys(filter).forEach((key) => {
    const typedKey = key as keyof Prisma.BlogWhereInput;
    if (filter[typedKey] === undefined) {
      delete filter[typedKey];
    }
  });
  return filter;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { q: query, tags, topics, page, limit, sort } = parsed.data;
    const cacheKey = `search:${query}:${tags.join(",")}:${topics.join(
      ","
    )}:${page}:${limit}:${sort}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const offset = (page - 1) * limit;
    const searchFilter = buildSearchFilter(
      query,
      tags as Tags[],
      topics as Topics[]
    );

    const [blogs, totalBlogs] = await prisma.$transaction([
      prisma.blog.findMany({
        where: searchFilter,
        skip: offset,
        take: limit,
        orderBy: sort === "title" ? { title: "asc" } : { createdAt: "desc" },
      }),
      prisma.blog.count({ where: searchFilter }),
    ]);

    const totalPages = Math.ceil(totalBlogs / limit);
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error searching blogs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = searchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      query,
      tags = [],
      topics = [],
      page = 1,
      limit = 50,
      sort,
    } = parsed.data;
    const cacheKey = `search:${query}:${tags.join(",")}:${topics.join(
      ","
    )}:${page}:${limit}:${sort}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const offset = (page - 1) * limit;
    const searchFilter = buildSearchFilter(
      query,
      tags as Tags[],
      topics as Topics[]
    );

    const [blogs, totalBlogs] = await prisma.$transaction([
      prisma.blog.findMany({
        where: searchFilter,
        skip: offset,
        take: limit,
        orderBy: sort === "title" ? { title: "asc" } : { createdAt: "desc" },
      }),
      prisma.blog.count({ where: searchFilter }),
    ]);

    const totalPages = Math.ceil(totalBlogs / limit);
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error searching blogs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
