"use client";
import { fetchSlugBlog } from "@/store/blogSlice";
import { AppDispatch, RootState } from "@/store/store";
import { format } from "date-fns";
import Image from "next/image";
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoIosLink } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import Link from "next/link";
import Loading from "@/app/loading";
import { Tags, Topics } from "@/generated/prisma";
import BlogContent from "../Blogs/BlogContent";

const BlogDetails = ({ slug }: { slug: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { entities, slugBlogId, status, error } = useSelector(
    (state: RootState) => state.blog
  );

  // Fetch blog by slug
  useEffect(() => {
    dispatch(fetchSlugBlog({ slug }));
  }, [dispatch, slug]);

  // Memoize blog to stabilize reference
  const blog = useMemo(() => {
    if (slugBlogId && entities.blogs[slugBlogId]) {
      return entities.blogs[slugBlogId];
    }
    return null;
  }, [slugBlogId, entities.blogs]);

  // Handle URL copy
  const handleCopyUrl = useCallback(() => {
    const url = window.location.href;
    console.log("[handleCopyUrl] Copying URL:", url);
    navigator.clipboard.writeText(url).then(() => {
      console.log("[handleCopyUrl] URL copied successfully");
    });
  }, []);

  // Loading state
  if (status.fetchSlugBlog === "loading") {
    return <Loading />;
  }

  // Error state
  if (status.fetchSlugBlog === "failed") {
    console.error("[BlogDetails] Rendering error state:", error.fetchSlugBlog);
    return (
      <p className="text-center text-red-500">
        Error: {error.fetchSlugBlog || "Failed to load blog"}
      </p>
    );
  }

  // No blog found
  if (!blog) {
    console.error("[BlogDetails] Rendering no blog found state");
    return <p className="text-center text-gray-500">Blog not found</p>;
  }

  return (
    <div>
      <div className="w-[97vw] h-[45vh] md:h-[87vh] mx-auto border rounded-3xl">
        <div className="w-full h-full">
          <Image
            src={blog.bannerUrl}
            width={1000}
            height={1000}
            placeholder="blur"
            blurDataURL={blog.bannerUrl}
            alt={"Blog Cover -" + blog.title}
            className="w-full h-full object-cover object-center rounded-3xl -z-10"
          />
        </div>
      </div>

      <div className="mt-8 w-full h-full px-3 md:px-6 flex justify-between gap-3 md:gap-8">
        <div className="h-full sticky top-20 left-0 sm:w-8 lg:w-12 text-center space-y-4">
          <div className="flex flex-col items-center justify-center gap-1">
            <p className="text-gray text-xs lg:text-sm font-semibold">SHARE</p>
            <button
              onClick={handleCopyUrl}
              className="border-gray text-gray border rounded-full w-fit p-1.5 cursor-pointer active:bg-gray active:text-white"
            >
              <IoIosLink size={20} />
            </button>
          </div>

          <Link
            href={`/blog/edit/${blog.slug}`}
            className="flex flex-col items-center justify-center gap-1"
          >
            <p className="text-gray text-xs lg:text-sm font-semibold">EDIT</p>
            <div className="border-gray text-gray border rounded-full w-fit p-1.5 cursor-pointer">
              <FiEdit size={20} />
            </div>
          </Link>
        </div>

        <div className="w-[95%]">
          <div className="w-full mt-2 mb-4">
            <p className="text-2xl lg:text-3xl font-semibold">{blog.title}</p>
            <p className="mt-1 text-sm lg:text-base">{blog.subTitle}</p>

            <div className="flex flex-col xl:flex-row justify-between w-full xl:items-center mt-2 xl:mt-4">
              <div className="flex xl:flex-col items-center gap-2">
                <p className="text-xs">Published on:</p>
                {blog.createdAt ? (
                  <p className="text-xs">
                    {format(blog.createdAt, "MMMM dd, yyyy") || "No Date"}
                  </p>
                ) : (
                  <p className="text-xs">No date</p>
                )}
              </div>

              <div className="flex flex-col w-full sm:w-fit sm:flex-row sm:items-center gap-2 xl:gap-4 mt-4 xl:mt-0">
                <div className="space-y-2">
                  <p className="text-xs">Tags:</p>
                  <div className="flex items-center flex-wrap gap-2">
                    {blog.tags.map((t: Tags, i: number) => {
                        return (
                          <Link
                            href={`/tags?q=${t.toLowerCase()}`}
                            key={i}
                            className="border border-[#7B00D3] rounded-full text-[#7B00D3] text-[11px] overflow-hidden group"
                          >
                            <p className="bg-gradient-to-r from-[#7B00D3] to-[#7B00D3] bg-[length:0px_30px] group-hover:text-white group-hover:bg-[length:100%_30px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 px-3 py-1">
                              {t.replace("_", " ")}
                            </p>
                          </Link>
                        );
                      })}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs">Topics:</p>
                  <div className="flex items-center flex-wrap gap-2">
                    {blog.topics.map((t: Topics, i: number) => {
                        return (
                          <Link
                            href={`/topics?q=${t.toLowerCase()}`}
                            key={i}
                            className="border border-[#7B00D3] rounded-full text-[#7B00D3] text-[11px] overflow-hidden group"
                          >
                            <p className="bg-gradient-to-r from-[#7B00D3] to-[#7B00D3] bg-[length:0px_30px] group-hover:text-white group-hover:bg-[length:100%_30px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 px-3 py-1">
                              {t.replace("_", " ")}
                            </p>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="bg-black h-[1px] my-4" />

          <BlogContent content={blog} />
        </div>
      </div>
    </div>
  );
};

export default BlogDetails;
