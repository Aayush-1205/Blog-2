"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  Suspense,
  lazy,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fetchBlogs, fetchFilteredBlogs } from "@/store/blogSlice";
import { AppDispatch, RootState } from "@/store/store";
import { ErrorBoundary } from "react-error-boundary";
import MotionDiv from "../MotionDiv";
import Loading from "@/app/loading";

// Lazy load components
const BlogSwiper = lazy(() => import("../Blogs/BlogSwiper"));
const BlogsFilter = lazy(() => import("../Blogs/BlogFilter"));

// Error fallback component
const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="text-center text-red-500 py-10">
    <p>Error: {error.message || "Failed to fetch blogs"}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-[#7B00D3] text-white rounded hover:bg-[#6A00B8]"
    >
      Retry
    </button>
  </div>
);

// Skeleton placeholder component
const BlogCardSkeleton = () => (
  <div className="animate-pulse space-y-4 w-[90%]">
    <div className="h-48 bg-gray-200 rounded-xl"></div>
    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);

const Blogs = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entities, ids, filteredIds, status, error, pagination } = useSelector(
    (state: RootState) => state.blog
  );
  const [showAllPosts, setShowAllPosts] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedInitial = useRef(false);

  // Convert normalized state to blog array
  const displayedPosts = showAllPosts ? ids : filteredIds;
  const blogs = displayedPosts.map((id) => entities.blogs[id]).filter(Boolean);

  // Fetch initial blogs or filtered blogs based on URL params
  useEffect(() => {
    if (!hasFetchedInitial.current) {
      const tag = searchParams.get("tag");
      const topic = searchParams.get("topic");
      const initialPage = Number(searchParams.get("page")) || 1;

      if (tag || topic) {
        setShowAllPosts(false);
        dispatch(
          fetchFilteredBlogs({ tag: tag ?? undefined, topic: topic ?? undefined, page: initialPage, limit: 10 })
        );
      } else {
        dispatch(fetchBlogs({ page: initialPage, limit: 10 }));
      }
      hasFetchedInitial.current = true;
    }
  }, [dispatch, searchParams]);

  // Infinite scroll for pagination
  useEffect(() => {
    if (
      status.fetchBlogs === "loading" ||
      status.fetchFilteredBlogs === "loading" ||
      page >= pagination.totalPages
    ) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const newPage = page + 1;
          setPage(newPage);

          const tag = searchParams.get("tag");
          const topic = searchParams.get("topic");

          if (tag || topic) {
            dispatch(
              fetchFilteredBlogs({ tag: tag ?? undefined, topic: topic ?? undefined, page: newPage, limit: 10 })
            );
          } else {
            dispatch(fetchBlogs({ page: newPage, limit: 10 }));
          }

          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set("page", newPage.toString());
          router.push(`?${newParams.toString()}`, { scroll: false });
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    dispatch,
    page,
    pagination.totalPages,
    router,
    searchParams,
    status.fetchBlogs,
    status.fetchFilteredBlogs,
  ]);

  // Retry handler for error boundary
  const handleRetry = useCallback(() => {
    const tag = searchParams.get("tag");
    const topic = searchParams.get("topic");
    setPage(1);
    if (tag || topic) {
      dispatch(fetchFilteredBlogs({ tag: tag ?? undefined, topic: topic ?? undefined, page: 1, limit: 10 }));
    } else {
      dispatch(fetchBlogs({ page: 1, limit: 10 }));
    }
    router.push("?page=1", { scroll: false });
  }, [dispatch, router, searchParams]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={handleRetry}
      resetKeys={[
        status.fetchBlogs,
        status.fetchFilteredBlogs,
        error.fetchBlogs,
        error.fetchFilteredBlogs,
      ]}
    >
      <div className="container mx-auto px-6 py-8 max-w-screen-2xl">
        <Suspense fallback={<BlogCardSkeleton />}>
          {blogs.length > 0 && <BlogSwiper blog={blogs.slice(0, 3)} />}
        </Suspense>

        <div className="flex flex-col md:flex-row gap-8 mt-12">
          <Suspense
            fallback={<div className="h-64 bg-gray-200 rounded w-1/4"></div>}
          >
            <BlogsFilter setAllPosts={setShowAllPosts} />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-2 place-items-center gap-y-6 w-full md:w-3/4 ml-auto">
            {blogs.length === 0 &&
            status.fetchBlogs !== "loading" &&
            status.fetchFilteredBlogs !== "loading" ? (
              <p className="text-center text-gray-500 col-span-full">
                No blogs found
              </p>
            ) : (
              blogs.map((p, i) => (
                <MotionDiv
                  index={i}
                  key={p.id}
                  className="group flex flex-col items-center h-fit w-[90%]"
                >
                  <Link
                    href={`/blog/${p.slug}`}
                    className="h-full rounded-xl overflow-hidden"
                    aria-label={`Read ${p.title}`}
                  >
                    <Image
                      src={p.bannerUrl}
                      placeholder="blur"
                      blurDataURL={p.bannerUrl}
                      alt={p.title || "Blog cover image"}
                      width={500}
                      height={500}
                      loading="lazy"
                      className="aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  <div className="flex flex-col w-full mt-4 text-wrap">
                    <div className="flex items-center gap-2">
                      <p className="uppercase border border-[#7B00D3] rounded-full text-[#7B00D3] text-xs overflow-hidden">
                        <span className="bg-gradient-to-r from-[#7B00D3] to-[#7B00D3] bg-[length:0px_20px] group-hover:text-white group-hover:bg-[length:100%_20px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 px-3 py-0.5">
                          {p?.topics[0]?.replaceAll("_", " ") || "No Topic"}
                        </span>
                      </p>
                      <hr className="bg-gray-400 w-[1px] h-4" />
                      <p className="text-gray-500 text-xs">
                        {p?.createdAt
                          ? format(new Date(p.createdAt), "MMMM dd, yyyy")
                          : "No Date"}
                      </p>
                    </div>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="inline-block my-1"
                      aria-label={p.title}
                    >
                      <h2 className="font-semibold capitalize text-base sm:text-lg hover:text-[#7B00D3] transition-colors">
                        {p.title || "Untitled Blog"}
                      </h2>
                      <p className="line-clamp-2 text-xs text-gray-600">
                        {p.subTitle || "No description available"}
                      </p>
                    </Link>
                  </div>
                </MotionDiv>
              ))
            )}
          </div>
        </div>

        {(status.fetchBlogs === "loading" ||
          status.fetchFilteredBlogs === "loading") && (
          <div className="flex justify-center mt-8">
            <Loading />
          </div>
        )}
        {page < pagination.totalPages && (
          <div ref={loadMoreRef} className="h-10 w-full" aria-hidden="true" />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Blogs;
