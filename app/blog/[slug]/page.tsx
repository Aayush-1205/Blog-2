"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type { FC } from "react";
import Loading from "@/app/loading";

// Dynamically import BlogDetails for better performance (code splitting)
const BlogDetails = dynamic(() => import("@/components/pages/BlogDetails"), {
  loading: () => <Loading />,
  ssr: false, // Client-side only, since you use `useParams`
});


// Define the expected params type for better type safety
interface Params {
  slug?: string | string[];
}

const Page: FC = () => {
  // useParams returns Record<string, string | string[]>
  const params = useParams() as Params;

  // Handle missing or malformed slug
  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
      ? params.slug[0]
      : undefined;

  if (!slug) {
    return <Loading />;
  }

  return <BlogDetails slug={slug} />;
};

export default Page;
