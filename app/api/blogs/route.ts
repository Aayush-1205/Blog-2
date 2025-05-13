import { Tags, Topics } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Force Node.js runtime to avoid Vercel Edge issues
export const runtime = "nodejs";

// Utility function to validate tags and topics
const validateTagsAndTopics = (tags: unknown, topics: unknown) => {
  const validTags: Tags[] = Object.values(Tags);
  const validTopics: Topics[] = Object.values(Topics);

  const parsedTags = Array.isArray(tags)
    ? tags
        .map((tag) => tag.trim() as Tags)
        .filter((tag): tag is Tags => validTags.includes(tag))
    : [];
  const parsedTopics = Array.isArray(topics)
    ? topics
        .map((topic) => topic.trim() as Topics)
        .filter((topic): topic is Topics => validTopics.includes(topic))
    : [];

  return { parsedTags, parsedTopics };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const tag = searchParams.get("tag")?.toUpperCase().trim() as Tags | null;
    const topic = searchParams.get("topic")?.toUpperCase().trim() as Topics | null;

    const validTags: Tags[] = Object.values(Tags);
    const validTopics: Topics[] = Object.values(Topics);
    const validatedTag = validTags.includes(tag as Tags) ? tag : null;
    const validatedTopic = validTopics.includes(topic as Topics) ? topic : null;

    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    if (slug) {
      const blog = await prisma.blog.findUnique({ where: { slug } });
      if (!blog) {
        return NextResponse.json({ error: "Blog not found" }, { status: 404 });
      }
      return NextResponse.json(blog, { status: 200 });
    }

    const searchFilter: {
      tags?: { has: Tags };
      topics?: { has: Topics };
    } = {};
    if (validatedTag) searchFilter.tags = { has: validatedTag };
    if (validatedTopic) searchFilter.topics = { has: validatedTopic };

    const [blogs, totalBlogs] = await prisma.$transaction([
      prisma.blog.findMany({
        where: searchFilter,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.blog.count({ where: searchFilter }),
    ]);

    const totalPages = Math.ceil(totalBlogs / limit);

    return NextResponse.json(
      { blogs, pagination: { currentPage: page, totalPages, totalBlogs } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subTitle, content, bannerUrl, slug, video, tags, topics } = body;

    // Validate required fields
    if (!title || !subTitle || !content || !bannerUrl || !slug) {
      return NextResponse.json(
        { error: "Missing required fields: title, subTitle, content, bannerUrl, slug" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingBlog = await prisma.blog.findUnique({ where: { slug } });
    if (existingBlog) {
      return NextResponse.json(
        { error: "Blog with this slug already exists" },
        { status: 409 }
      );
    }

    const { parsedTags, parsedTopics } = validateTagsAndTopics(tags, topics);

    const blogData = {
      title,
      subTitle,
      content,
      bannerUrl,
      slug,
      video,
      tags: parsedTags,
      topics: parsedTopics,
    };

    const result = await prisma.blog.create({ data: blogData });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required for editing" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, subTitle, content, bannerUrl, video, tags, topics } = body;

    // Validate that at least one field is provided for update
    if (
      !title &&
      !subTitle &&
      !content &&
      !bannerUrl &&
      !video &&
      !tags &&
      !topics
    ) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 }
      );
    }

    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({ where: { slug } });
    if (!existingBlog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const { parsedTags, parsedTopics } = validateTagsAndTopics(tags, topics);

    const blogData: {
      title?: string;
      subTitle?: string;
      content?: string;
      bannerUrl?: string;
      video?: string;
      tags?: Tags[];
      topics?: Topics[];
    } = {};
    if (title) blogData.title = title;
    if (subTitle) blogData.subTitle = subTitle;
    if (content) blogData.content = content;
    if (bannerUrl) blogData.bannerUrl = bannerUrl;
    if (video !== undefined) blogData.video = video;
    if (parsedTags.length > 0) blogData.tags = parsedTags;
    if (parsedTopics.length > 0) blogData.topics = parsedTopics;

    const result = await prisma.blog.update({
      where: { slug },
      data: blogData,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}