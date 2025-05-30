"use client";

import Loading from "@/app/loading";
import { Tags, Topics } from "@/generated/prisma";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAvailableTags } from "@/store/tagSlice";
import { fetchAvailableTopics } from "@/store/topicSlice";
import { debounce } from "@/utils/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import useSWR from "swr";
import BlogEditor from "../BlogEditor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";
import ImageUpload from "../Image-Upload";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("ERROR: Account fetching error");
    return res.json();
  });

const BlogEdit = ({ slug }: { slug: string }) => {
  const {
    data,
    error,
    isLoading: isDataLoading,
  } = useSWR(`/api/blogs?slug=${slug}`, fetcher);
  const [formData, setFormData] = useState({
    title: "",
    subTitle: "",
    slug: "",
    content: "",
    bannerUrl: "",
    video: "",
    tags: [] as Tags[],
    topics: [] as Topics[],
  });

  const dispatch = useDispatch<AppDispatch>();
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [tagsQuery, setTagsQuery] = useState("");
  const [topicsQuery, setTopicsQuery] = useState("");
  const {
    availableTags,
    status: tagStatus,
    error: tagError,
  } = useSelector((state: RootState) => state.tag);
  const {
    availableTopics,
    status: topicStatus,
    error: topicError,
  } = useSelector((state: RootState) => state.topic);
  const router = useRouter();

  // Fetch tags and topics on mount
  useEffect(() => {
    dispatch(fetchAvailableTags());
    dispatch(fetchAvailableTopics());
  }, [dispatch]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Debounced search for tags and topics
  const debouncedSetTagsQuery = useCallback(
    debounce((value: string) => {
      setTagsQuery(value);
      setFormData((p) => ({
        ...p,
        tags: value ? p.tags : [],
      }));
    }, 300).debounced,
    []
  );
  const debouncedSetTopicsQuery = useCallback(
    debounce((value: string) => {
      setTopicsQuery(value);
      setFormData((p) => ({
        ...p,
        topics: value ? p.topics : [],
      }));
    }, 300).debounced,
    []
  );

  // Debounced autosave
  const debouncedAutosave = useMemo(
    () =>
      debounce((data: typeof formData) => {
        localStorage.setItem("blogDraft", JSON.stringify(data));
      }, 1000).debounced,
    []
  );

  // Auto-save on formData change
  useEffect(() => {
    debouncedAutosave(formData);
    // No cancel needed for debounce in this usage
  }, [formData, debouncedAutosave]);

  useEffect(() => {
    if (data) {
      setFormData({
        title: data.title,
        subTitle: data.subTitle,
        slug: data.slug,
        content: data.content,
        bannerUrl: data.bannerUrl,
        video: data.video,
        tags: data.tags,
        topics: data.topics,
      });
    }
  }, [data]);

  // Memoized filtered tags/topics
  const filteredTags = useMemo(() => {
    return availableTags.filter((tag) =>
      tag.toLowerCase().includes(tagsQuery.toLowerCase())
    );
  }, [availableTags, tagsQuery]);

  const filteredTopics = useMemo(() => {
    return availableTopics.filter((topic) =>
      topic.toLowerCase().includes(topicsQuery.toLowerCase())
    );
  }, [availableTopics, topicsQuery]);

  // Handle tag/topic selection
  const handleSelectTag = (tag: Tags) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
    setValidationErrors((prev) => ({ ...prev, tags: "" }));
  };

  const handleSelectTopic = (topic: Topics) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
    setValidationErrors((prev) => ({ ...prev, topics: "" }));
  };

  // Generate slug from title
  const createSlug = useMemo(() => {
    return formData.title
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 100); // Limit slug length
  }, [formData.title]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // if (!validateForm()) return;

    setIsLoading(true);
    // setError(null);
    // setSuccess(false);

    const submitData = { ...formData, slug: createSlug };

    try {
      const response = await fetch(`/api/blogs?slug=${createSlug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to update blog post");
      }

      setTagsQuery("");
      setTopicsQuery("");
      toast.success("Blog post updated successfully");
      // setSuccess(true);
      setFormData({
        title: "",
        subTitle: "",
        slug: "",
        content: "",
        bannerUrl: "",
        video: "",
        tags: [],
        topics: [],
      });
      router.push(`/blog/${slug}`);
      localStorage.removeItem("blogDraft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    toast.error("Error fetching blog data", {
      description: error.message,
    });
  }

  if (isDataLoading) {
    return <Loading />;
  }

  return (
    <section className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Edit Blog</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Slug */}
        <div className="flex flex-col sm:flex-row gap-2 [&_div]:w-full">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Blog Title"
              className="w-full p-2 border rounded focus:outline-none mt-1"
              aria-invalid={!!validationErrors.title}
              aria-describedby={
                validationErrors.title ? "title-error" : undefined
              }
            />
            {validationErrors.title && (
              <p id="title-error" className="text-red-500 text-xs mt-1">
                {validationErrors.title}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              defaultValue={createSlug}
              disabled
              placeholder="Generated slug"
              aria-readonly="true"
              className="w-full p-2 border rounded focus:outline-none mt-1 bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subTitle" className="block text-sm font-medium">
            Subtitle
          </label>

          <textarea
            name="subTitle"
            id="subTitle"
            value={formData.subTitle}
            onChange={handleChange}
            aria-invalid={!!validationErrors.subTitle}
            aria-describedby={
              validationErrors.subTitle ? "subTitle-error" : undefined
            }
            placeholder="Blog SubTitle"
            className="w-full p-2 border rounded focus:outline-none mt-1"
          />
          {validationErrors.subTitle && (
            <p id="subTitle-error" className="text-red-500 text-xs mt-1">
              {validationErrors.subTitle}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bannerUrl" className="block text-sm font-medium">
            Banner URL
          </label>
          <input
            type="text"
            id="bannerUrl"
            name="bannerUrl"
            value={formData.bannerUrl}
            onChange={handleChange}
            aria-invalid={!!validationErrors.bannerUrl}
            aria-describedby={
              validationErrors.bannerUrl ? "bannerUrl-error" : undefined
            }
            placeholder="Blog Banner URL"
            className="w-full p-2 border rounded focus:outline-none mt-1"
          />
          {validationErrors.bannerUrl && (
            <p id="bannerUrl-error" className="text-red-500 text-xs mt-1">
              {validationErrors.bannerUrl}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="videoUrl" className="block text-sm font-medium">
            Video URL (optional)
          </label>

          <input
            type="text"
            id="videoURL"
            name="videoUrl"
            value={formData.video || ""}
            onChange={handleChange}
            placeholder="Blog Video URL"
            className="w-full p-2 border rounded focus:outline-none mt-1"
            aria-invalid={!!validationErrors.video}
            aria-describedby={
              validationErrors.video ? "video-error" : undefined
            }
          />
          {validationErrors.video && (
            <p id="video-error" className="text-red-500 text-xs mt-1">
              {validationErrors.video}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 [&_div]:w-full">
          <div>
            <label htmlFor="tags" className="block text-sm font-medium">
              Tags
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between border border-gray-300 rounded p-1.5 mt-1">
                  Select Tags...
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command className="w-full text-gray-600">
                  <CommandInput
                    placeholder="Search Tags..."
                    className="w-full"
                    aria-label="Search tags"
                    aria-invalid={!!validationErrors.tags}
                    aria-describedby={
                      validationErrors.tags ? "tags-error" : undefined
                    }
                    onValueChange={debouncedSetTagsQuery}
                  />
                  <CommandList className="w-full">
                    {tagStatus.fetchAvailableTags === "loading" && (
                      <CommandEmpty>Loading tags...</CommandEmpty>
                    )}
                    {tagStatus.fetchAvailableTags === "failed" && (
                      <CommandEmpty>{tagError.fetchAvailableTags}</CommandEmpty>
                    )}
                    <CommandGroup>
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              tags: prev.tags.includes(tag as Tags)
                                ? prev.tags.filter((t) => t !== (tag as Tags))
                                : [...prev.tags, tag as Tags],
                            }));
                          }}
                        >
                          {tag.replaceAll("_", " ")}
                          <Check
                            className={`ml-auto ${
                              formData.tags.includes(tag)
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
            {validationErrors.tags && (
              <p id="tags-error" className="text-red-500 text-xs mt-1">
                {validationErrors.tags}
              </p>
            )}

            {formData.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap w-full">
                {formData.tags.map((t, i) => {
                  return (
                    <p
                      key={i}
                      className="px-2 py-1 bg-[#7B00D3]/50 border border-[#7B00D3] text-[#7B00D3] text-sm rounded flex items-center gap-2"
                    >
                      {t.replace("_", " ")}
                      <button
                        type="button"
                        onClick={() => handleSelectTag(t)}
                        className="text-accent cursor-pointer hover:text-accent/60 focus:outline-none"
                        aria-label={`Remove tag: ${t.replace("_", " ")}`}
                      >
                        <RxCross2
                          size={18}
                          className="text-[#7B00D3] cursor-pointer hover:text-[#7B00D3]/60"
                        />
                      </button>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="topics" className="block text-sm font-medium">
              Topics
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between border border-gray-300 rounded p-1.5 mt-1">
                  Select Topics...
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command className="w-full text-gray-600">
                  <CommandInput
                    placeholder="Search Topics..."
                    className="w-full"
                    aria-label="Search topics"
                    aria-invalid={!!validationErrors.topics}
                    aria-describedby={
                      validationErrors.topics ? "topics-error" : undefined
                    }
                    onValueChange={debouncedSetTopicsQuery}
                  />
                  <CommandList>
                    {topicStatus.fetchAvailableTopics === "loading" && (
                      <CommandEmpty>Loading topics...</CommandEmpty>
                    )}
                    {topicStatus.fetchAvailableTopics === "failed" && (
                      <CommandEmpty>
                        {topicError.fetchAvailableTopics}
                      </CommandEmpty>
                    )}
                    <CommandGroup>
                      {filteredTopics.map((topic) => (
                        <CommandItem
                          key={topic}
                          value={topic}
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              topics: prev.topics.includes(topic as Topics)
                                ? prev.topics.filter(
                                    (t) => t !== (topic as Topics)
                                  )
                                : [...prev.topics, topic as Topics],
                            }));
                          }}
                        >
                          {topic.replaceAll("_", " ")}
                          <Check
                            className={`ml-auto ${
                              formData.topics.includes(topic)
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

            {validationErrors.topics && (
              <p id="topics-error" className="text-red-500 text-xs mt-1">
                {validationErrors.topics}
              </p>
            )}

            {formData.topics.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap w-full">
                {formData.topics.map((t, i) => {
                  return (
                    <p
                      key={i}
                      className="px-2 py-1 bg-[#7B00D3]/50 border border-[#7B00D3] text-[#7B00D3] text-sm rounded flex items-center gap-2"
                    >
                      {t.replace("_", " ")}
                      <button
                        type="button"
                        onClick={() => handleSelectTopic(t)}
                        className="text-accent cursor-pointer hover:text-accent/60 focus:outline-none"
                        aria-label={`Remove topic: ${t.replace("_", " ")}`}
                      >
                        <RxCross2
                          size={18}
                          className="text-[#7B00D3] cursor-pointer hover:text-[#7B00D3]/60"
                        />
                      </button>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <ImageUpload formData={formData} setFormData={setFormData} />

        <BlogEditor formData={formData} setFormData={setFormData} />

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {isLoading ? "Updating..." : "Update Blog"}
        </button>
      </form>
    </section>
  );
};

export default BlogEdit;
