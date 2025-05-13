"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  Suspense,
  lazy,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBlogs } from "@/store/blogSlice";
import { AppDispatch, RootState } from "@/store/store";
import Loading from "./loading";
import { ErrorBoundary } from "react-error-boundary";

// Lazy load components
// const HomeCover = lazy(() => import("@/components/Blogs/HomeCover"));
// const RecentBlogs = lazy(() => import("@/components/Blogs/RecentBlogs"));
// const BlogHomeGrid = lazy(() => import("@/components/Blogs/BlogHomeGrid"));

// Error fallback component
const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="text-center text-red-500 py-10">
    <p>Error: {error.message || "Something went wrong"}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Retry
    </button>
  </div>
);

// Skeleton placeholder component
const BlogSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-64 bg-gray-200 rounded"></div>
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const { entities, ids, status, error, pagination } = useSelector(
    (state: RootState) => state.blog
  );
  const { isActivated } = useSelector((state: RootState) => state.search);

  // Body scroll lock for search activation
  useLayoutEffect(() => {
    document.body.style.overflow = isActivated ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isActivated]);

  // Fetch initial blogs
  useEffect(() => {
    if (ids.length === 0 && status.fetchBlogs === "idle") {
      dispatch(fetchBlogs({ page: 1, limit: 10 }));
    }
  }, [dispatch, ids.length, status.fetchBlogs]);

  // Debugging logs (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Home component state:", { ids, status, error, pagination });
    }
  }, [ids, status, error, pagination]);

  // Convert normalized state to blog array
  const blogs = ids.map((id) => entities.blogs[id]).filter(Boolean);

  // Retry handler for error boundary
  const handleRetry = () => {
    dispatch(fetchBlogs({ page: 1, limit: 10 }));
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={handleRetry}
      resetKeys={[status.fetchBlogs, error.fetchBlogs]}
    >
      <div className="flex min-h-screen flex-col items-center justify-between px-3 sm:px-6 min-[1500px]:max-w-screen-2xl min-[1500px]:mx-auto">
        {/* <Suspense fallback={<BlogSkeleton />}>
          <HomeCover blog={blogs} />
        </Suspense>
        <Suspense fallback={<BlogSkeleton />}>
          <RecentBlogs blog={blogs} />
        </Suspense>
        <Suspense fallback={<BlogSkeleton />}>
          <BlogHomeGrid blog={blogs} />
        </Suspense> */}
        {status.fetchBlogs === "loading" && <Loading />}
      </div>
    </ErrorBoundary>
  );
}
