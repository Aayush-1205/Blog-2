import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { Topics } from "@/generated/prisma";

// Force Node.js runtime to avoid Vercel Edge issues
export const runtime = "nodejs";

// Validation schema for GET query parameters
const getQuerySchema = z.object({
  q: z
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
  limit: z
    .string()
    .default("10")
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10)))),
  page: z
    .string()
    .default("1")
    .transform((val) => Math.max(1, parseInt(val, 10))),
  sort: z.enum(["createdAt", "title"]).default("createdAt").optional(),
  listTopics: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
});

// Validation schema for POST body
const postBodySchema = z.object({
  topics: z
    .array(z.enum(Object.values(Topics) as [string, ...string[]]))
    .min(1, "At least one valid topic is required"),
  limit: z.number().min(1).max(100).default(10).optional(),
  page: z.number().min(1).default(1).optional(),
  sort: z.enum(["createdAt", "title"]).default("createdAt").optional(),
});

// Cache configuration (in-memory cache for simplicity)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Utility function to fetch blogs by topics
const fetchBlogsByTopics = async (
  topics: Topics[],
  limit: number,
  page: number,
  sort: "createdAt" | "title"
) => {
  const skip = (page - 1) * limit;
  const [blogs, totalBlogs] = await prisma.$transaction([
    prisma.blog.findMany({
      where: { topics: { hasSome: topics } },
      take: limit,
      skip,
      orderBy: sort === "title" ? { title: "asc" } : { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subTitle: true,
        slug: true,
        bannerUrl: true,
        createdAt: true,
        topics: true,
      },
    }),
    prisma.blog.count({ where: { topics: { hasSome: topics } } }),
  ]);

  return { blogs, totalBlogs, totalPages: Math.ceil(totalBlogs / limit) };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = getQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { q: topics, limit, page, sort, listTopics } = parsed.data;

    // Handle request to list all available topics
    if (listTopics) {
      const availableTopics = Object.values(Topics);
      return NextResponse.json({ topics: availableTopics }, { status: 200 });
    }

    // Validate topics
    if (topics.length === 0) {
      return NextResponse.json(
        { error: "At least one valid topic is required" },
        { status: 400 }
      );
    }

    const cacheKey = `topics:${topics.join(",")}:${page}:${limit}:${sort}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const { blogs, totalBlogs, totalPages } = await fetchBlogsByTopics(
      topics,
      limit,
      page,
      sort ?? "createdAt"
    );
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching blogs by topics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { topics, limit, page, sort } = parsed.data;
    const cacheKey = `topics:${topics.join(",")}:${page}:${limit}:${sort}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const { blogs, totalBlogs, totalPages } = await fetchBlogsByTopics(
      topics as Topics[],
      limit as number,
      page as number,
      sort ?? "createdAt"
    );
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching blogs by topics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
