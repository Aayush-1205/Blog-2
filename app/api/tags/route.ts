import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { Tags } from "@/generated/prisma";

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
            .map((tag) => tag.trim())
            .filter((tag): tag is Tags =>
              Object.values(Tags).includes(tag as Tags)
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
  listTags: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
});

// Validation schema for POST body
const postBodySchema = z.object({
  tags: z
    .array(z.enum(Object.values(Tags) as [string, ...string[]]))
    .min(1, "At least one valid tag is required"),
  limit: z.number().min(1).max(100).default(10).optional(),
  page: z.number().min(1).default(1).optional(),
});

// Cache configuration (in-memory cache for simplicity)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Utility function to fetch blogs by tags
const fetchBlogsByTags = async (tags: Tags[], limit: number, page: number) => {
  const skip = (page - 1) * limit;
  const [blogs, totalBlogs] = await prisma.$transaction([
    prisma.blog.findMany({
      where: { tags: { hasSome: tags } },
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subTitle: true,
        slug: true,
        bannerUrl: true,
        createdAt: true,
        tags: true,
      },
    }),
    prisma.blog.count({ where: { tags: { hasSome: tags } } }),
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

    const { q: tags, limit, page, listTags } = parsed.data;

    // Handle request to list all available tags
    if (listTags) {
      const availableTags = Object.values(Tags);
      return NextResponse.json({ tags: availableTags }, { status: 200 });
    }

    // Validate tags
    if (tags.length === 0) {
      return NextResponse.json(
        { error: "At least one valid tag is required" },
        { status: 400 }
      );
    }

    const cacheKey = `tags:${tags.join(",")}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const { blogs, totalBlogs, totalPages } = await fetchBlogsByTags(
      tags as Tags[],
      limit,
      page
    );
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching blogs by tags:", error);
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

    const { tags, limit, page } = parsed.data;
    const cacheKey = `tags:${tags.join(",")}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, { status: 200 });
    }

    const { blogs, totalBlogs, totalPages } = await fetchBlogsByTags(
      tags as Tags[],
      limit as number,
      page as number
    );
    const response = {
      blogs,
      pagination: { currentPage: page, totalPages, totalBlogs },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching blogs by tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
