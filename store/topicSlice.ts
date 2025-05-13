import { Blog, Topics } from "@/generated/prisma";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { normalize, schema } from "normalizr";

// Define normalized entity schema
const blogEntity = new schema.Entity("blogs");
const blogListSchema = new schema.Array(blogEntity);

// Types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalBlogs: number;
  limit: number;
}

export interface TopicState {
  entities: {
    blogs: Record<string, Blog>;
  };
  blogIds: string[];
  selectedTopics: Topics[];
  availableTopics: Topics[];
  status: {
    fetchBlogs: "idle" | "loading" | "succeeded" | "failed";
    fetchAvailableTopics: "idle" | "loading" | "succeeded" | "failed";
  };
  error: {
    fetchBlogs: string | null;
    fetchAvailableTopics: string | null;
  };
  pagination: Pagination;
  cache: Record<string, { ids: string[]; timestamp: number }>;
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initial state
const initialState: TopicState = {
  entities: { blogs: {} },
  blogIds: [],
  selectedTopics: [],
  availableTopics: [],
  status: {
    fetchBlogs: "idle",
    fetchAvailableTopics: "idle",
  },
  error: {
    fetchBlogs: null,
    fetchAvailableTopics: null,
  },
  pagination: { currentPage: 1, totalPages: 1, totalBlogs: 0, limit: 12 },
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

// Thunks
export const fetchBlogs = createAsyncThunk<
  { blogs: Blog[]; pagination: Pagination },
  { topic?: string; page?: number; limit?: number },
  { state: { topic: TopicState } }
>(
  "topic/fetchBlogs",
  async ({ topic, page = 1, limit = 12 }, { getState, rejectWithValue }) => {
    try {
      const cacheKey = `topic:${topic || "all"}:${page}:${limit}`;
      const cache = getState().topic.cache[cacheKey];
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return { blogs: [], pagination: getState().topic.pagination };
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (topic) {
        params.set("q", topic);
      }

      return await fetchFromApi(`/api/blogs?${params.toString()}`);
    } catch (error) {
      return rejectWithValue(
        (error as Error).message || "Failed to fetch blogs"
      );
    }
  }
);

export const fetchAvailableTopics = createAsyncThunk<Topics[], void>(
  "topic/fetchAvailableTopics",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchFromApi("/api/topics?listTopics=true");
      return data.topics || [];
    } catch (error) {
      return rejectWithValue(
        (error as Error).message || "Failed to fetch available topics"
      );
    }
  }
);

const topicSlice = createSlice({
  name: "topic",
  initialState,
  reducers: {
    setSelectedTopics: (state, action: PayloadAction<Topics[]>) => {
      state.selectedTopics = action.payload;
      if (action.payload.length > 0) {
        state.blogIds = Object.keys(state.entities.blogs).filter((id) =>
          action.payload.every((topic) =>
            state.entities.blogs[id].topics.includes(topic)
          )
        );
      } else {
        state.blogIds = Object.keys(state.entities.blogs);
      }
    },
    clearTopics: (state) => {
      state.selectedTopics = [];
      state.blogIds = Object.keys(state.entities.blogs);
      state.pagination = initialState.pagination;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = Math.max(1, action.payload);
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
          const cacheKey = `topic:${action.meta.arg.topic || "all"}:${
            action.meta.arg.page || 1
          }:${action.meta.arg.limit || 12}`;
          state.cache[cacheKey] = {
            ids: normalized.result,
            timestamp: Date.now(),
          };
          state.blogIds = [
            ...new Set([...state.blogIds, ...normalized.result]),
          ];
        }
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.status.fetchBlogs = "failed";
        state.error.fetchBlogs =
          typeof action.payload === "string" ? action.payload : "Unknown error";
      });

    // fetchAvailableTopics
    builder
      .addCase(fetchAvailableTopics.pending, (state) => {
        state.status.fetchAvailableTopics = "loading";
        state.error.fetchAvailableTopics = null;
      })
      .addCase(fetchAvailableTopics.fulfilled, (state, action) => {
        state.status.fetchAvailableTopics = "succeeded";
        state.availableTopics = action.payload;
      })
      .addCase(fetchAvailableTopics.rejected, (state, action) => {
        state.status.fetchAvailableTopics = "failed";
        state.error.fetchAvailableTopics =
          typeof action.payload === "string" ? action.payload : "Unknown error";
      });
  },
});

export const { setSelectedTopics, clearTopics, setPage } = topicSlice.actions;
export default topicSlice.reducer;
