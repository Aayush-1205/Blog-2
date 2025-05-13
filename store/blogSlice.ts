import { Blog, Tags, Topics } from "@/generated/prisma";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { normalize, schema } from "normalizr";

// Define normalized entity schemas
const blogEntity = new schema.Entity("blogs");
const blogListSchema = new schema.Array(blogEntity);

// Types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalBlogs: number;
}

export interface BlogState {
  entities: {
    blogs: Record<string, Blog>;
  };
  ids: string[];
  slugBlogId: string | null;
  filteredIds: string[];
  selectedTag: Tags | null;
  selectedTopic: Topics | null;
  searchQuery: string | null;
  status: {
    fetchBlogs: "idle" | "loading" | "succeeded" | "failed";
    fetchSlugBlog: "idle" | "loading" | "succeeded" | "failed";
    fetchFilteredBlogs: "idle" | "loading" | "succeeded" | "failed";
    createBlog: "idle" | "loading" | "succeeded" | "failed";
  };
  error: {
    fetchBlogs: string | null;
    fetchSlugBlog: string | null;
    createBlog: string | null;
    fetchFilteredBlogs: string | null;
  };
  pagination: Pagination;
  cache: Record<string, { ids: string[]; timestamp: number }>;
}

interface FetchBlogsParams {
  page?: number;
  limit?: number;
  tag?: string;
  topic?: string;
  query?: string;
}

interface CreateBlogParams {
  title: string;
  subTitle: string;
  content: string;
  bannerUrl: string;
  slug: string;
  video?: string;
  tags: Tags[];
  topics: Topics[];
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initial state
const initialState: BlogState = {
  entities: { blogs: {} },
  ids: [],
  slugBlogId: null,
  filteredIds: [],
  selectedTag: null,
  selectedTopic: null,
  searchQuery: null,
  status: {
    fetchBlogs: "idle",
    fetchSlugBlog: "idle",
    fetchFilteredBlogs: "idle",
    createBlog: "idle",
  },
  error: {
    fetchBlogs: null,
    fetchSlugBlog: null,
    createBlog: null,
    fetchFilteredBlogs: null,
  },
  pagination: { currentPage: 1, totalPages: 1, totalBlogs: 0 },
  cache: {},
};

// Utility function for fetching from API
const fetchFromApi = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error || `Failed to fetch from ${url}`);
  }
  return response.json();
};

// Thunk to fetch filtered blogs based on tags, topics, and pagination
export const fetchFilteredBlogs = createAsyncThunk<
  { blogs: Blog[]; pagination: Pagination },
  { tag?: string; topic?: string; page?: number; limit?: number },
  {
    state: {
      blog: { cache: Record<string, { ids: string[]; timestamp: number }> };
    };
  }
>(
  "blog/fetchFilteredBlogs",
  async (
    { tag, topic, page = 1, limit = 10 },
    { getState, rejectWithValue }
  ) => {
    try {
      const cacheKey = `filter:tag:${tag || ""}:topic:${
        topic || ""
      }:${page}:${limit}`;
      const cache = getState().blog.cache[cacheKey];
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return { blogs: [], pagination: [] }; // Return empty to use cached IDs
      }

      const params = new URLSearchParams({
        tag: tag || "",
        topic: topic || "",
        page: page.toString(),
        limit: limit.toString(),
      });

      return await fetchFromApi(`/api/blogs?${params.toString()}`);
    } catch (error) {
      return rejectWithValue(
        (error as Error).message || "Failed to fetch filtered blogs"
      );
    }
  }
);

// Thunks
export const fetchBlogs = createAsyncThunk<
  { blogs: Blog[]; pagination: Pagination },
  FetchBlogsParams,
  { state: { blog: BlogState } }
>(
  "blog/fetchBlogs",
  async (
    { page = 1, limit = 10, tag, topic, query },
    { getState, rejectWithValue }
  ) => {
    try {
      const cacheKey = `blogs:${page}:${limit}:${tag || ""}:${topic || ""}:${
        query || ""
      }`;
      const cache = getState().blog.cache[cacheKey];
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return { blogs: [], pagination: getState().blog.pagination }; // Return empty to use cached IDs
      }
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (tag) queryParams.set("tag", tag);
      if (topic) queryParams.set("topic", topic);
      if (query) queryParams.set("q", query);
      return await fetchFromApi(`/api/blogs?${queryParams.toString()}`);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchSlugBlog = createAsyncThunk<Blog, { slug: string }>(
  "blog/fetchSlugBlog",
  async ({ slug }, { rejectWithValue }) => {
    try {
      return await fetchFromApi(`/api/blogs?slug=${slug}`);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createBlog = createAsyncThunk<Blog, CreateBlogParams>(
  "blog/createBlog",
  async (blogData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...blogData, action: "create" }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to create blog");
      }
      return response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const blogSlice = createSlice({
  name: "blog",
  initialState,
  reducers: {
    resetBlogState: () => initialState,
    setSelectedTag: (state, action: PayloadAction<Tags | null>) => {
      state.selectedTag = action.payload;
      state.filteredIds = state.ids.filter((id) =>
        state.entities.blogs[id].tags.includes(action.payload as Tags)
      );
    },
    setSelectedTopic: (state, action: PayloadAction<Topics | null>) => {
      state.selectedTopic = action.payload;
      state.filteredIds = state.ids.filter((id) =>
        state.entities.blogs[id].topics.includes(action.payload as Topics)
      );
    },
    setSearchQuery: (state, action: PayloadAction<string | null>) => {
      state.searchQuery = action.payload;
      if (action.payload) {
        const query = action.payload.toLowerCase();
        state.filteredIds = state.ids.filter(
          (id) =>
            state.entities.blogs[id].title.toLowerCase().includes(query) ||
            state.entities.blogs[id].subTitle.toLowerCase().includes(query)
        );
      } else {
        state.filteredIds = state.ids;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchBlogs
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.status.fetchBlogs = "loading";
        state.error.fetchBlogs = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.status.fetchBlogs = "succeeded";
        if (action.payload.blogs.length > 0) {
          const normalized = normalize(action.payload.blogs, blogListSchema);
          state.entities.blogs = {
            ...state.entities.blogs,
            ...normalized.entities.blogs,
          };
          const cacheKey = `blogs:${action.meta.arg.page || 1}:${
            action.meta.arg.limit || 10
          }:${action.meta.arg.tag || ""}:${action.meta.arg.topic || ""}:${
            action.meta.arg.query || ""
          }`;
          state.cache[cacheKey] = {
            ids: normalized.result,
            timestamp: Date.now(),
          };
          state.ids = [...new Set([...state.ids, ...normalized.result])];
          state.filteredIds = state.ids;
        }
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.status.fetchBlogs = "failed";
        state.error.fetchBlogs = action.payload as string;
      });

    // fetchSlugBlog
    builder
      .addCase(fetchSlugBlog.pending, (state) => {
        state.status.fetchSlugBlog = "loading";
        state.error.fetchSlugBlog = null;
      })
      .addCase(fetchSlugBlog.fulfilled, (state, action) => {
        state.status.fetchSlugBlog = "succeeded";
        const normalized = normalize([action.payload], blogListSchema);
        state.entities.blogs = {
          ...state.entities.blogs,
          ...normalized.entities.blogs,
        };
        state.slugBlogId = normalized.result[0];
      })
      .addCase(fetchSlugBlog.rejected, (state, action) => {
        state.status.fetchSlugBlog = "failed";
        state.error.fetchSlugBlog = action.payload as string;
      });

    // createBlog
    builder
      .addCase(createBlog.pending, (state, action) => {
        state.status.createBlog = "loading";
        state.error.createBlog = null;
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        state.entities.blogs[tempId] = {
          ...action.meta.arg,
          id: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Blog;
        state.ids.unshift(tempId);
        state.filteredIds.unshift(tempId);
      })
      .addCase(createBlog.fulfilled, (state, action) => {
        state.status.createBlog = "succeeded";
        const normalized = normalize([action.payload], blogListSchema);
        state.entities.blogs = {
          ...state.entities.blogs,
          ...normalized.entities.blogs,
        };
        // Replace temp ID with real ID
        const tempId = state.ids.find((id) => id.startsWith("temp-"));
        if (tempId) {
          state.ids = state.ids.map((id) =>
            id === tempId ? normalized.result[0] : id
          );
          state.filteredIds = state.filteredIds.map((id) =>
            id === tempId ? normalized.result[0] : id
          );
          delete state.entities.blogs[tempId];
        }
        state.pagination.totalBlogs += 1;
      })
      .addCase(createBlog.rejected, (state, action) => {
        state.status.createBlog = "failed";
        state.error.createBlog = action.payload as string;
        // Rollback optimistic update
        const tempId = state.ids.find((id) => id.startsWith("temp-"));
        if (tempId) {
          state.ids = state.ids.filter((id) => id !== tempId);
          state.filteredIds = state.filteredIds.filter((id) => id !== tempId);
          delete state.entities.blogs[tempId];
        }
      });
    builder
      // fetchFilteredBlogs
      .addCase(fetchFilteredBlogs.pending, (state) => {
        state.status.fetchFilteredBlogs = "loading";
        state.error.fetchFilteredBlogs = null;
      })
      .addCase(
        fetchFilteredBlogs.fulfilled,
        (
          state,
          action: PayloadAction<{ blogs: Blog[]; pagination: Pagination }>
        ) => {
          state.status.fetchFilteredBlogs = "succeeded";
          // const cacheKey = `filter:tag:${action.meta.arg.tag || ""}:topic:${
          //   action.meta.arg.topic || ""
          // }:${action.meta.arg.page || 1}:${action.meta.arg.limit || 10}`;

          if (action.payload.blogs.length > 0) {
            // Normalize blogs
            const newBlogs: Record<string, Blog> = {};
            const newIds: string[] = [];

            action.payload.blogs.forEach((blog) => {
              newBlogs[blog.id] = blog;
              newIds.push(blog.id);
            });

            // Update entities and filteredIds
            state.entities.blogs = { ...state.entities.blogs, ...newBlogs };
            state.filteredIds = newIds;

            // Update pagination
            state.pagination = action.payload.pagination;

            // Cache results
            // state.cache[cacheKey] = {
            //   ids: newIds,
            //   timestamp: Date.now(),
            // };
          } else {
            // Use cached IDs if available
            // if (state.cache[cacheKey]) {
            //   state.filteredIds = state.cache[cacheKey].ids;
            //   state.pagination = action.payload.pagination;
            // }
          }
        }
      )
      .addCase(fetchFilteredBlogs.rejected, (state, action) => {
        state.status.fetchFilteredBlogs = "failed";
        state.error.fetchFilteredBlogs =
          (action.payload as string) || "Failed to fetch filtered blogs";
        state.filteredIds = [];
      });
  },
});

export const {
  resetBlogState,
  setSelectedTag,
  setSelectedTopic,
  setSearchQuery,
} = blogSlice.actions;
export default blogSlice.reducer;
