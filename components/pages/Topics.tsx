"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  Suspense,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { FiSearch } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { AppDispatch, RootState } from "@/store/store";
import {
  clearTopics,
  fetchAvailableTopics,
  fetchBlogs,
  setSelectedTopics,
} from "@/store/topicSlice";
import Loading from "@/app/loading";
import { debounce } from "@/utils/debounce";
import { Blog, Topics } from "@/generated/prisma";

const TopicsComponent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topicsQuery, setTopicsQuery] = useState("");
  const [filteredTopics, setFilteredTopics] = useState<Topics[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedInitial = useRef(false);

  const { blogIds, entities, status, error, pagination, availableTopics } =
    useSelector((state: RootState) => state.topic);

  // Memoize blogs to stabilize reference
  const blogs = useMemo(
    () => blogIds.map((id) => entities.blogs[id]).filter(Boolean),
    [blogIds, entities.blogs]
  );

  // Debounced topic search
  const debouncedFetchBlogs = useCallback(
    debounce((topic: string) => {
      dispatch(setSelectedTopics([topic as Topics]));
      dispatch(fetchBlogs({ topic: topic || undefined, page: 1, limit: 12 }));
    }, 300).debounced,
    [dispatch]
  );

  // Debounced URL update
  const debouncedUpdateUrl = useCallback(
    debounce((topic: string | null) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (topic) {
        newParams.set("q", topic);
      } else {
        newParams.delete("q");
      }
      router.push(`?${newParams.toString()}`, { scroll: false });
    }, 300).debounced,
    [router, searchParams]
  );

  // Set topicsQuery from URL
  useEffect(() => {
    const topic = searchParams.get("q");
    if (topic && topic !== topicsQuery) {
      setTopicsQuery(topic);
    } else if (!topic && topicsQuery) {
      setTopicsQuery("");
    }
  }, [searchParams]);

  // Fetch initial data
  useEffect(() => {
    if (!hasFetchedInitial.current) {
     ("[Initial Fetch Effect] Fetching initial data");
      dispatch(fetchAvailableTopics());
      const topic = searchParams.get("q");
      dispatch(fetchBlogs({ topic: topic || undefined, page: 1, limit: 12 }));
      hasFetchedInitial.current = true;
    }
  }, [dispatch, searchParams]);

  // Client-side filtering with memoization
  const filteredResults = useMemo(() => {
    const lowerQuery = topicsQuery.toLowerCase();
    const results = {
      topics: availableTopics.filter((topic) =>
        topic.toLowerCase().includes(lowerQuery)
      ),
      blogs: topicsQuery
        ? blogs.filter((blog) =>
            blog.topics.some((topic) =>
              topic.toLowerCase().includes(lowerQuery)
            )
          )
        : blogs,
    };
    return results;
  }, [topicsQuery, availableTopics, blogs]);

  useEffect(() => {
    setFilteredTopics(filteredResults.topics);
    setFilteredBlogs(filteredResults.blogs);
  }, [filteredResults]);

  // Infinite scroll with debounced callback
  const handleObserver = useCallback(
    debounce((entries: IntersectionObserverEntry[]) => {
      if (
        entries[0].isIntersecting &&
        status.fetchBlogs !== "loading" &&
        pagination.currentPage < pagination.totalPages
      ) {
        const nextPage = pagination.currentPage + 1;
        dispatch(
          fetchBlogs({
            topic: topicsQuery || undefined,
            page: nextPage,
            limit: 12,
          })
        );
      }
    }, 300).debounced,
    [
      dispatch,
      status.fetchBlogs,
      pagination.currentPage,
      pagination.totalPages,
      topicsQuery,
    ]
  );

  useEffect(() => {
    if (
      status.fetchBlogs !== "loading" &&
      pagination.currentPage < pagination.totalPages
    ) {
      observerRef.current = new IntersectionObserver(handleObserver, {
        threshold: 0.1,
      });

      if (loadMoreRef.current) {
        observerRef.current.observe(loadMoreRef.current);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Update URL when topicsQuery changes
  useEffect(() => {
    const currentTopic = searchParams.get("q");
    if (topicsQuery !== currentTopic) {
      debouncedUpdateUrl(topicsQuery || null);
    }
  }, [topicsQuery, searchParams, debouncedUpdateUrl]);

  // Event handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      setTopicsQuery(value);
      if (value) {
        debouncedFetchBlogs(value);
      } else {
        dispatch(clearTopics());
        dispatch(fetchBlogs({ page: 1, limit: 12 }));
        setFilteredBlogs(blogs);
      }
    },
    [debouncedFetchBlogs, dispatch, blogs]
  );

  const handleClearInput = useCallback(() => {
   ("[handleClearInput] Clearing input");
    setTopicsQuery("");
    dispatch(clearTopics());
    dispatch(fetchBlogs({ page: 1, limit: 12 }));
    setFilteredBlogs(blogs);
  }, [dispatch, blogs]);

  const handleTopicClick = useCallback(
    (topic: string) => {
      dispatch(setSelectedTopics([topic as Topics]));
      setTopicsQuery(topic);
      dispatch(fetchBlogs({ topic, page: 1, limit: 12 }));
    },
    [dispatch]
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.currentPage + 1;
    dispatch(
      fetchBlogs({
        topic: topicsQuery || undefined,
        page: nextPage,
        limit: 12,
      })
    );
  }, [dispatch, pagination.currentPage, topicsQuery]);

  // Capitalize first letter
  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Animation variants
  const topicVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  };

  return (
    <article className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full mt-8">
        <div>
          <h1 className="font-semibold text-2xl sm:text-3xl lg:text-4xl text-[#7B00D3]">
            #
            {topicsQuery
              ? capitalizeFirstLetter(topicsQuery).replace("_", " ")
              : "Topics"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Discover blogs by topics and explore new ideas!
          </p>
        </div>

        <div
          className={`flex items-center gap-3 px-3 py-2 mt-4 border-2 rounded-full w-full md:w-1/3 transition-colors ${
            isFocused ? "border-[#7B00D3]" : "border-gray-300"
          }`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <input
            type="text"
            className="border-none focus:outline-none w-full text-base sm:text-lg px-2 py-1"
            placeholder="Search Topics..."
            value={topicsQuery}
            onChange={handleInputChange}
            aria-label="Search blogs by topic"
          />
          {topicsQuery && (
            <button
              onClick={handleClearInput}
              className="text-[#7B00D3] hover:text-[#6A00B8] focus:outline-none"
              aria-label="Clear topic search"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <FiSearch className="size-5 sm:size-6 text-[#7B00D3]" />
        </div>
      </div>

      {status.fetchAvailableTopics === "loading" && (
        <div className="flex justify-center mt-8">
          <Loading />
        </div>
      )}
      {status.fetchAvailableTopics === "failed" && (
        <p className="text-center text-red-500 mt-8">
          {error.fetchAvailableTopics}
        </p>
      )}
      {filteredTopics.length > 0 && (
        <div className="w-full overflow-x-auto px-4 mt-8 border-y-2 border-gray-200 py-4 flex items-center gap-2">
          <AnimatePresence>
            {filteredTopics.map((topic) => (
              <motion.button
                key={topic}
                variants={topicVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={() => handleTopicClick(topic)}
                className={`py-1.5 px-4 sm:px-6 rounded-full border-2 border-[#7B00D3] text-sm sm:text-base cursor-pointer text-nowrap hover:bg-[#7B00D3]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7B00D3] focus:ring-offset-2 ${
                  topic.toLowerCase() === topicsQuery.toLowerCase()
                    ? "bg-[#7B00D3] text-white"
                    : "text-[#7B00D3]"
                }`}
                aria-label={`Filter by topic: ${topic.replace("_", " ")}`}
              >
                {topic.replace("_", " ")}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {status.fetchBlogs === "loading" && blogs.length === 0 && (
        <div className="flex justify-center mt-8">
          <Loading />
        </div>
      )}
      {status.fetchBlogs === "failed" && (
        <p className="text-center text-red-500 mt-8">{error.fetchBlogs}</p>
      )}

      <div className="mt-8 mb-4">
        {(!topicsQuery &&
          blogs.length === 0 &&
          status.fetchBlogs !== "loading") ||
        (topicsQuery &&
          filteredBlogs.length === 0 &&
          status.fetchBlogs !== "loading") ? (
          <p className="text-center text-gray-500">No blogs found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(topicsQuery ? filteredBlogs : blogs).map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="group flex flex-col items-center h-fit"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="h-full rounded-xl overflow-hidden"
                  aria-label={`Read ${post.title}`}
                >
                  <Image
                    src={post.bannerUrl || "/placeholder.png"}
                    placeholder="blur"
                    blurDataURL={post.bannerUrl}
                    alt={post.title || "Blog cover image"}
                    width={500}
                    height={500}
                    loading="lazy"
                    className="aspect-[4/3] w-full max-h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </Link>

                <div className="flex flex-col w-full mt-4 text-wrap">
                  <div className="flex items-center gap-2">
                    <p className="uppercase border border-[#7B00D3] rounded-full text-[#7B00D3] text-xs overflow-hidden">
                      <span className="bg-gradient-to-r from-[#7B00D3] to-[#7B00D3] bg-[length:0px_20px] group-hover:text-white group-hover:bg-[length:100%_20px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 px-3 py-0.5">
                        {post.topics[0]?.replace("_", " ") || "No Topic"}
                      </span>
                    </p>
                    <hr className="bg-gray-400 w-[1px] h-4" />
                    <p className="text-gray-500 text-xs">
                      {post.createdAt
                        ? format(new Date(post.createdAt), "MMMM dd, yyyy")
                        : "No Date"}
                    </p>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block my-1"
                    aria-label={post.title}
                  >
                    <h2 className="font-semibold capitalize text-base sm:text-lg hover:text-[#7B00D3] transition-colors">
                      {post.title || "Untitled Blog"}
                    </h2>
                    <p className="line-clamp-2 text-xs text-gray-600">
                      {post.subTitle || "No description available"}
                    </p>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {pagination.currentPage < pagination.totalPages && (
          <>
            <div ref={loadMoreRef} className="h-10 w-full" aria-hidden="true" />
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                className="py-2 px-4 rounded-full border-2 border-[#7B00D3] text-[#7B00D3] hover:bg-[#7B00D3]/10 transition-colors"
                disabled={status.fetchBlogs === "loading"}
              >
                Load More
              </button>
            </div>
          </>
        )}
        {status.fetchBlogs === "loading" &&
          (topicsQuery ? filteredBlogs : blogs).length > 0 && (
            <div className="flex justify-center mt-8">
              <Loading />
            </div>
          )}
      </div>
    </article>
  );
};

const TopicsPage = () => (
  <Suspense fallback={<Loading />}>
    <TopicsComponent />
  </Suspense>
);

export default TopicsPage;
