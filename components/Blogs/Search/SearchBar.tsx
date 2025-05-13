"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { FiSearch } from "react-icons/fi";
import { RxCross2 } from "react-icons/rx";
import { AppDispatch, RootState } from "@/store/store";
import {
  setSearchActivated,
  fetchSearchResults,
  setSearchQuery,
  clearSearch,
} from "@/store/searchSlice";
import { fetchBlogs } from "@/store/blogSlice";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/app/loading";
import { debounce } from "@/utils/debounce";
import { Blog } from "@/generated/prisma";

const SearchBar = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [searchQ, setSearchQ] = useState("");

  const {
    isActivated,
    blogIds: searchIds,
    entities: searchEntities,
    status: searchStatus,
    error: searchError,
    pagination,
  } = useSelector((state: RootState) => state.search);
  const {
    ids: blogIds,
    entities: blogEntities,
    status: blogStatus,
  } = useSelector((state: RootState) => state.blog);

  const posts = blogIds.map((id) => blogEntities.blogs[id]).filter(Boolean);
  const searchResults = searchIds
    .map((id) => searchEntities.blogs[id])
    .filter(Boolean);

  // Initial blog fetch
  useEffect(() => {
    if (!blogIds.length && blogStatus.fetchBlogs === "idle") {
      dispatch(fetchBlogs({ page: 1, limit: 10 }));
    }
  }, [dispatch, blogIds.length, blogStatus]);

  // Focus input when search is activated
  useEffect(() => {
    if (isActivated && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [isActivated]);

  // Debounced search handler
  const handleSearch = useCallback(
    (query: string, page: number) => {
      if (query.trim()) {
        dispatch(fetchSearchResults({ query, limit: pagination.limit, page }));
      } else {
        dispatch(clearSearch());
      }
    },
    [dispatch, pagination.limit]
  );

  const { debounced: debouncedSearch, cancel: cancelDebounce } = useMemo(
    () => debounce((value: string) => handleSearch(value, 1), 200),
    [handleSearch]
  );

  // Infinite scroll for search results
  useEffect(() => {
    if (
      searchStatus.fetchSearchResults !== "loading" &&
      searchQ &&
      pagination.currentPage < pagination.totalPages
    ) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            const nextPage = pagination.currentPage + 1;
            handleSearch(searchQ, nextPage);
          }
        },
        { threshold: 0.5 }
      );

      if (loadMoreRef.current) {
        observerRef.current.observe(loadMoreRef.current);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    searchStatus.fetchSearchResults,
    searchQ,
    pagination.currentPage,
    pagination.totalPages,
    handleSearch,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelDebounce();
      dispatch(clearSearch());
    };
  }, [dispatch, cancelDebounce]);

  // Handlers
  const openSearch = () => dispatch(setSearchActivated(true));
  const closeSearch = () => {
    dispatch(setSearchActivated(false));
    dispatch(clearSearch());
    dispatch(setSearchQuery(""));
    setIsFocused(false);
  };

  const handleSearchRoute = () => {
    if (!searchQ.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQ)}`);
    closeSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") closeSearch();
    if (e.key === "Enter") handleSearchRoute();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQ(value);
    dispatch(setSearchQuery(value));
    debouncedSearch(value);
  };

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
  };

  return (
    <>
      <button
        onClick={openSearch}
        className="border border-black rounded-full bg-white/80 backdrop-blur-sm p-3 sm:p-4 hover:bg-gray-100 transition-colors"
        aria-label="Open search"
      >
        <FiSearch className="size-5 sm:size-6" />
      </button>

      <AnimatePresence>
        {isActivated && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-start pt-12 sm:pt-16 overflow-y-auto"
            aria-modal="true"
            role="dialog"
            aria-label="Search overlay"
          >
            <div className="w-full max-w-4xl px-4 sm:px-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#7B00D3]">
                  How can we help you?
                </h3>
                <button
                  onClick={closeSearch}
                  className="p-2 hover:text-[#6A00B8] focus:outline-none focus:ring-2 focus:ring-[#7B00D3] focus:ring-offset-2 flex flex-col items-center"
                  aria-label="Close search (Escape)"
                >
                  <RxCross2 className="size-6 sm:size-7 text-[#7B00D3]" />
                  <span className="text-[#7B00D3] text-xs mt-1">ESC</span>
                </button>
              </div>

              <div
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 border-2 rounded-lg transition-colors ${
                  isFocused ? "border-[#7B00D3]" : "border-gray-300"
                }`}
              >
                <FiSearch
                  onClick={handleSearchRoute}
                  className="size-6 cursor-pointer text-[#7B00D3]"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search blogs..."
                  value={searchQ}
                  onKeyDown={handleKeyDown}
                  onChange={handleInputChange}
                  className="w-full text-lg sm:text-xl focus:outline-none placeholder:text-gray-400"
                  aria-label="Search blogs"
                />
              </div>

              {searchError.fetchSearchResults && (
                <p className="mt-4 text-center text-red-500">
                  {searchError.fetchSearchResults}
                </p>
              )}

              <div className="mt-6 pb-8">
                {searchQ.length > 0 ? (
                  <SearchResults
                    blogs={searchResults}
                    status={searchStatus.fetchSearchResults}
                    error={searchError.fetchSearchResults}
                    closeSearch={closeSearch}
                  />
                ) : (
                  <DefaultResults
                    posts={posts}
                    status={blogStatus.fetchBlogs}
                    closeSearch={closeSearch}
                  />
                )}
                {searchQ && pagination.currentPage < pagination.totalPages && (
                  <div
                    ref={loadMoreRef}
                    className="h-10 w-full"
                    aria-hidden="true"
                  />
                )}
                {searchStatus.fetchSearchResults === "loading" &&
                  searchResults.length > 0 && (
                    <div className="flex justify-center mt-6">
                      <Loading />
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface ResultsProps {
  blogs: Blog[];
  status: string;
  error: string | null;
  closeSearch: () => void;
}

interface DefaultResultsProps {
  posts: Blog[];
  status: string;
  closeSearch: () => void;
}

const SearchResults = ({ blogs, status, error, closeSearch }: ResultsProps) => (
  <div className="w-full">
    {status === "loading" && blogs.length === 0 && (
      <p className="text-center text-gray-500">Searching...</p>
    )}
    {status === "failed" && (
      <p className="text-center text-red-500">
        {error || "Failed to load results"}
      </p>
    )}
    {status !== "loading" && blogs.length === 0 && (
      <p className="text-center text-gray-500">No results found</p>
    )}
    {blogs.length > 0 && (
      <div className="grid gap-4 sm:grid-cols-2">
        {blogs.map((blog) => (
          <BlogItem key={blog.id} blog={blog} onClick={closeSearch} />
        ))}
      </div>
    )}
  </div>
);

const DefaultResults = ({
  posts,
  status,
  closeSearch,
}: DefaultResultsProps) => (
  <div className="w-full">
    {status === "loading" && posts.length === 0 && (
      <p className="text-center text-gray-500">Loading...</p>
    )}
    {status === "failed" && posts.length === 0 && (
      <p className="text-center text-red-500">Failed to load blogs</p>
    )}
    {posts.length > 0 && (
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.slice(0, 6).map((blog) => (
          <BlogItem key={blog.id} blog={blog} onClick={closeSearch} />
        ))}
      </div>
    )}
  </div>
);

const BlogItem = ({ blog, onClick }: { blog: Blog; onClick: () => void }) => (
  <Link
    href={`/blog/${blog.slug}`}
    onClick={onClick}
    className="mb-4 px-2 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
  >
    <div className="space-y-4 mr-4 flex-1">
      <div className="flex items-center gap-2">
        {blog.topics[0] && (
          <p className="px-2 py-0.5 border border-[#7B00D3] text-[#7B00D3] text-[10px] rounded-full">
            {blog.topics[0].replace("_", " ")}
          </p>
        )}
        <hr className="bg-gray-300 w-[1px] h-4" />
        <p className="text-gray-500 text-[11px]">
          {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
        </p>
      </div>
      <h3 className="text-2xl font-semibold line-clamp-2">{blog.title}</h3>
    </div>
    <Image
      src={blog.bannerUrl || "/placeholder.png"}
      alt={blog.title}
      width={144}
      height={96}
      className="rounded-lg max-w-36 max-h-24 aspect-[3/2] object-cover"
    />
  </Link>
);

export default SearchBar;
