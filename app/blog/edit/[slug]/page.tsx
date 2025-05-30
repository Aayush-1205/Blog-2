"use client";

import Loading from "@/app/loading";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type { FC } from "react";

const BlogEdit = dynamic(() => import("@/components/Blogs/Edit/BlogEdit"), {
  loading: () => <Loading />,
  ssr: false, // Client-side only, since you use `useParams`
});

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

  return <BlogEdit slug={slug} />;
};

export default Page;
