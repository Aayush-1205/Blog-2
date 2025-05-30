import { Tags, Topics } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: process.env.AI_URL,
  apiKey: process.env.OPENAI_OPEN_ROUTER_KEY,
});

// Define request body interface
interface BlogMetadata {
  title: string;
  subTitle: string;
}

// Define response interface
interface EnhancedMetadata {
  enhancedTitle: string;
  enhancedSubtitle: string;
}

// Define response interface
interface TagsTopics {
  tags: Tags[];
  topics: Topics[];
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: BlogMetadata = await req.json();

    // Validate input
    if (!body.title || !body.subTitle) {
      return NextResponse.json(
        { error: "Title and subtitle are required" },
        { status: 400 }
      );
    }

    // Craft prompt for GPT-4o
    const promptTitleSubTitle = `
You are a professional content strategist tasked with enhancing blog metadata to make it more engaging, clear, and SEO-friendly. Given a blog title and subtitle, refine them to be concise, captivating, and aligned with the original intent. Ensure the enhanced title is under 60 characters and the subtitle under 160 characters for optimal SEO. Maintain a professional yet creative tone, avoiding clichés and overly generic phrases.

**Original Title**: "${body.title}"
**Original Subtitle**: "${body.subTitle}"

**Instructions**:
1. Enhance the title to be attention-grabbing, specific, and reflective of the blog's core topic.
2. Enhance the subtitle to provide a clear, compelling summary of the blog's content or value.
3. Return the response in JSON format with keys "enhancedTitle" and "enhancedSubtitle".

**Example**:
Original Title: "Creating a blog"
Original Subtitle: "this blog will explain how to create a blog"
Enhanced Output: {
  "enhancedTitle": "Build Your Blog from Scratch",
  "enhancedSubtitle": "A step-by-step guide to creating a blog that stands out."
}
`;

    // Call OpenAI API
    const completionTitleSubTitle = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a skilled content strategist with expertise in crafting engaging blog metadata.",
        },
        { role: "user", content: promptTitleSubTitle },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 200,
    });

    // Parse AI response
    const enhancedMetadata: EnhancedMetadata = JSON.parse(
      completionTitleSubTitle.choices[0].message.content || "{}"
    );

    console.log("Enhanced Metadata: ", enhancedMetadata);

    // Validate AI response
    if (!enhancedMetadata.enhancedTitle || !enhancedMetadata.enhancedSubtitle) {
      throw new Error("Invalid response from AI");
    }

    const allowedTags = Object.values(Tags);
    const allowedTopics = Object.values(Topics);

    // Craft prompt for GPT-4o
    const promptTagsTopics = `
You are a professional content analyst tasked with identifying relevant tags and topics for a blog based on its title and subtitle. Your goal is to select only the tags and topics that directly match the content described in the title and subtitle, using the provided lists. Do not include any tags or topics outside these lists or infer additional ones beyond what is explicitly relevant.

**Provided Tags**: ${allowedTags.join(", ")}
**Provided Topics**: ${allowedTopics.join(", ")}

**Blog Metadata**:
- **Title**: "${enhancedMetadata.enhancedTitle}"
- **Subtitle**: "${enhancedMetadata.enhancedSubtitle}"

**Instructions**:
1. Analyze the title and subtitle to identify relevant tags and topics from the provided lists.
2. Select only tags and topics that are explicitly related to the content described.
3. Avoid adding any tags or topics not present in the provided lists.
4. Return the response in JSON format with keys "tags" (array of strings) and "topics" (array of strings).
5. Ensure the response is concise and accurate, reflecting the blog's focus.

**Example**:
Input Title: "Build Your Blog from Scratch"
Input Subtitle: "A step-by-step guide to creating a blog that stands out."
Output: {
  "tags": ["WEB_DEVELOPMENT", "BLOG", "TUTORIALS"],
  "topics": ["WEB_DEVELOPMENT", "BLOG", "HOW_TO_GUIDES"]
}
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a skilled content analyst with expertise in categorizing blog metadata.",
        },
        { role: "user", content: promptTagsTopics },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 150,
    });

    // Parse AI response
    const result: TagsTopics = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    console.log("Tags & Topics Result:", result);

    // Validate AI response
    if (
      !result.tags ||
      !result.topics ||
      !Array.isArray(result.tags) ||
      !Array.isArray(result.topics)
    ) {
      throw new Error("Invalid response format from AI");
    }

    // Filter tags and topics to ensure they are in the allowed lists
    const validTags = result.tags.filter((tag) => allowedTags.includes(tag));
    const validTopics = result.topics.filter((topic) =>
      allowedTopics.includes(topic)
    );

    console.log("Valid Tags:", validTags);
    console.log("Valid Topics:", validTopics);

    // Return enhanced metadata
    return NextResponse.json(
      {
        enhancedTitle: enhancedMetadata.enhancedTitle,
        enhancedSubtitle: enhancedMetadata.enhancedSubtitle,
        enhancedTopics: validTopics,
        enhancedTags: validTags,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error enhancing blog metadata:", error);
    return NextResponse.json(
      { error: "Failed to enhance metadata" },
      { status: 500 }
    );
  }
}
