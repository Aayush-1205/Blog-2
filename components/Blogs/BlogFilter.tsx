"use client";

import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { MdOutlineFilterList, MdOutlineRestartAlt } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { FiSearch } from "react-icons/fi";
import { debounce } from "@/utils/debounce";
import { AppDispatch, RootState } from "@/store/store";
import { setSelectedTags, fetchAvailableTags } from "@/store/tagSlice";
import { setSelectedTopics, fetchAvailableTopics } from "@/store/topicSlice";
import { fetchFilteredBlogs } from "@/store/blogSlice";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { Tags, Topics } from "@/generated/prisma";

interface PageProp {
  setAllPosts: React.Dispatch<React.SetStateAction<boolean>>;
}

const BlogsFilter = ({ setAllPosts }: PageProp) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    availableTags,
    selectedTags,
    status: tagStatus,
  } = useSelector((state: RootState) => state.tag);
  const {
    availableTopics,
    selectedTopics,
    status: topicStatus,
  } = useSelector((state: RootState) => state.topic);

  const [detailsState, setDetailsState] = useState({
    topics: { active: true },
    tags: { active: true },
  });
  const [showCount, setShowCount] = useState({ topic: 4, tag: 4 });
  const [topicsQuery, setTopicsQuery] = useState("");
  const [tagsQuery, setTagsQuery] = useState("");

  // Fetch available tags and topics on mount
  useEffect(() => {
    if (tagStatus.fetchAvailableTags === "idle") {
      dispatch(fetchAvailableTags());
    }
    if (topicStatus.fetchAvailableTopics === "idle") {
      dispatch(fetchAvailableTopics());
    }
  }, [
    dispatch,
    tagStatus.fetchAvailableTags,
    topicStatus.fetchAvailableTopics,
  ]);

  // Sync with URL params and apply filters
  useEffect(() => {
    const tag = searchParams.get("tag");
    const topic = searchParams.get("topic");
    const page = Number(searchParams.get("page")) || 1;

    if (tag || topic) {
      setAllPosts(false);
      dispatch(setSelectedTags(tag ? [tag as Tags] : []));
      dispatch(setSelectedTopics(topic ? [topic as Topics] : []));
      dispatch(
        fetchFilteredBlogs({
          tag: tag ?? undefined,
          topic: topic ?? undefined,
          page,
        })
      );
    } else {
      setAllPosts(true);
      dispatch(setSelectedTags([]));
      dispatch(setSelectedTopics([]));
    }
  }, [dispatch, searchParams, setAllPosts]);

  // Memoized filtered data
  const filteredTopics = useMemo(
    () =>
      availableTopics.filter((topic) =>
        topic.toLowerCase().includes(topicsQuery.toLowerCase())
      ),
    [topicsQuery, availableTopics]
  );

  const filteredTags = useMemo(
    () =>
      availableTags.filter((tag) =>
        tag.toLowerCase().includes(tagsQuery.toLowerCase())
      ),
    [tagsQuery, availableTags]
  );

  const visibleTopics = useMemo(
    () => availableTopics.slice(0, showCount.topic),
    [filteredTopics, showCount.topic]
  );
  const visibleTags = useMemo(
    () => availableTags.slice(0, showCount.tag),
    [filteredTags, showCount.tag]
  );

  // Debounced search handlers
  const { debounced: debouncedSetTopicsQuery, cancel: cancelTopicsDebounce } =
    debounce((value: string) => setTopicsQuery(value), 300);
  const { debounced: debouncedSetTagsQuery, cancel: cancelTagsDebounce } =
    debounce((value: string) => setTagsQuery(value), 300);

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      cancelTopicsDebounce();
      cancelTagsDebounce();
    };
  }, [cancelTopicsDebounce, cancelTagsDebounce]);

  // Handlers
  const handleShowMore = (key: "topic" | "tag") => {
    setShowCount((prev) => ({
      ...prev,
      [key]:
        prev[key] >= 12
          ? key === "topic"
            ? filteredTopics.length
            : filteredTags.length
          : prev[key] + 4,
    }));
  };

  const handleFilter = (key: "topic" | "tag", param: string) => {
    setAllPosts(false);
    const newParams = new URLSearchParams();
    newParams.set("page", "1");
    newParams.set(key, param.toLowerCase());

    // Remove the other filter type
    if (key === "topic") {
      newParams.delete("tag");
      dispatch(setSelectedTags([]));
      setTopicsQuery(param);
      dispatch(setSelectedTopics([param] as any));
    } else {
      newParams.delete("topic");
      dispatch(setSelectedTopics([]));
      setTagsQuery(param);
      dispatch(setSelectedTags([param] as any));
    }

    router.push(`?${newParams.toString()}`, { scroll: false });

    dispatch(
      fetchFilteredBlogs({
        tag: newParams.get("tag") || undefined,
        topic: newParams.get("topic") || undefined,
        page: 1,
      })
    );
  };

  const handleClearFilter = () => {
    setAllPosts(true);
    setTopicsQuery("");
    setTagsQuery("");
    setShowCount({ topic: 4, tag: 4 });
    dispatch(setSelectedTags([]));
    dispatch(setSelectedTopics([]));
    router.push("?", { scroll: false });
  };

  const isLoading =
    tagStatus.fetchAvailableTags === "loading" ||
    topicStatus.fetchAvailableTopics === "loading";

  return (
    <aside
      className="w-full md:w-72 md:sticky md:top-20"
      aria-label="Blog filters"
    >
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <MdOutlineFilterList size={20} /> Filters
            </h3>
            <button
              onClick={handleClearFilter}
              aria-label="Reset filters"
              className="p-1 rounded-full hover:bg-gray-100 transition-transform duration-200 active:rotate-180"
            >
              <MdOutlineRestartAlt size={20} />
            </button>
          </div>

          <hr className="mb-6 border-gray-300" />

          {/* Topics Section */}
          <details open className="mb-6">
            <summary
              onClick={() =>
                setDetailsState((prev) => ({
                  ...prev,
                  topics: { ...prev.topics, active: !prev.topics.active },
                }))
              }
              className="flex items-center justify-between cursor-pointer mb-2 text-lg font-medium"
            >
              Topics
              <IoIosArrowDown
                className={`transition-transform ${
                  detailsState.topics.active ? "" : "rotate-180"
                }`}
                size={18}
              />
            </summary>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-between border border-gray-300 rounded-full px-3 py-1 w-full text-gray-600"
                  aria-label="Search topics"
                >
                  {selectedTopics.length
                    ? selectedTopics[0].replaceAll("_", " ")
                    : "Select Topic..."}
                  <FiSearch size={18} className="text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search Topics..."
                    className="h-9"
                    onValueChange={debouncedSetTopicsQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No Topics found.</CommandEmpty>
                    <CommandGroup>
                      {filteredTopics.map((topic) => (
                        <CommandItem
                          key={topic}
                          value={topic}
                          onSelect={() => handleFilter("topic", topic)}
                        >
                          {topic.replaceAll("_", " ")}
                          <Check
                            className={`ml-auto ${
                              selectedTopics.includes(topic as any)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleFilter("topic", topic)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedTopics.includes(topic)
                      ? "bg-black border-transparent text-white"
                      : "border border-black"
                  }`}
                  aria-label={`Filter by topic ${topic.replace("_", " ")}`}
                >
                  {topic.replace("_", " ")}
                </button>
              ))}
              {showCount.topic < filteredTopics.length ? (
                <button
                  onClick={() => handleShowMore("topic")}
                  className="px-3 py-1 text-sm text-accent border border-accent rounded-lg bg-accent/10 hover:bg-accent/20"
                >
                  {showCount.topic >= 12 ? "Show All" : "Show More"}
                </button>
              ) : (
                <button
                  onClick={() =>
                    setShowCount((prev) => ({ ...prev, topic: 4 }))
                  }
                  className="px-3 py-1 text-sm text-accent border border-accent rounded-lg bg-accent/10 hover:bg-accent/20"
                >
                  Show Less
                </button>
              )}
            </div>
          </details>

          <hr className="mb-6 border-gray-300" />

          {/* Tags Section */}
          <details open>
            <summary
              onClick={() =>
                setDetailsState((prev) => ({
                  ...prev,
                  tags: { ...prev.tags, active: !prev.tags.active },
                }))
              }
              className="flex items-center justify-between cursor-pointer mb-2 text-lg font-medium"
            >
              Tags
              <IoIosArrowDown
                className={`transition-transform ${
                  detailsState.tags.active ? "" : "rotate-180"
                }`}
                size={18}
              />
            </summary>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-between border border-gray-300 rounded-full px-3 py-1 w-full text-gray-600"
                  aria-label="Search tags"
                >
                  {selectedTags.length
                    ? selectedTags[0].replaceAll("_", " ")
                    : "Select Tag..."}
                  <FiSearch size={18} className="text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search Tags..."
                    className="h-9"
                    onValueChange={debouncedSetTagsQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No Tags found.</CommandEmpty>
                    <CommandGroup>
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => handleFilter("tag", tag)}
                        >
                          {tag.replaceAll("_", " ")}
                          <Check
                            className={`ml-auto ${
                              selectedTags.includes(tag as any)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleFilter("tag", tag)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    tagsQuery === tag
                      ? "bg-black border-transparent text-white"
                      : "border border-black"
                  }`}
                  aria-label={`Filter by tag ${tag.replace("_", " ")}`}
                >
                  {tag.replace("_", " ")}
                </button>
              ))}
              {showCount.tag < filteredTags.length ? (
                <button
                  onClick={() => handleShowMore("tag")}
                  className="px-3 py-1 text-sm text-[#7B00D3] border border-[#7B00D3] rounded-lg bg-[#7B00D3]/10 hover:bg-[#7B00D3]/20"
                >
                  {showCount.tag >= 12 ? "Show All" : "Show More"}
                </button>
              ) : (
                <button
                  onClick={() => setShowCount((prev) => ({ ...prev, tag: 4 }))}
                  className="px-3 py-1 text-sm text-[#7B00D3] border border-[#7B00D3] rounded-lg bg-[#7B00D3]/10 hover:bg-[#7B00D3]/20"
                >
                  Show Less
                </button>
              )}
            </div>
          </details>
        </>
      )}
    </aside>
  );
};

export default BlogsFilter;
