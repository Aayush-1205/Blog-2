import { Blog, Tags } from "@/generated/prisma";
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

export interface TagState {
  entities: {
    blogs: Record<string, Blog>;
  };
  blogIds: string[];
  selectedTags: Tags[];
  availableTags: Tags[];
  status: {
    fetchBlogs: "idle" | "loading" | "succeeded" | "failed";
    fetchAvailableTags: "idle" | "loading" | "succeeded" | "failed";
  };
  error: {
    fetchBlogs: string | null;
    fetchAvailableTags: string | null;
  };
  pagination: Pagination;
  cache: Record<string, { ids: string[]; timestamp: number }>;
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initial state
const initialState: TagState = {
  entities: { blogs: {} },
  blogIds: [],
  selectedTags: [],
  availableTags: [],
  status: {
    fetchBlogs: "idle",
    fetchAvailableTags: "idle",
  },
  error: {
    fetchBlogs: null,
    fetchAvailableTags: null,
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
  { tag?: string; page?: number; limit?: number },
  { state: { tag: TagState } }
>(
  "tag/fetchBlogs",
  async ({ tag, page = 1, limit = 12 }, { getState, rejectWithValue }) => {
    try {
      const cacheKey = `tag:${tag || "all"}:${page}:${limit}`;
      const cache = getState().tag.cache[cacheKey];
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return { blogs: [], pagination: getState().tag.pagination }; // Use cached IDs
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (tag) {
        params.set("tag", tag);
      }

      return await fetchFromApi(`/api/blogs?${params.toString()}`);
    } catch (error) {
      return rejectWithValue(
        (error as Error).message || "Failed to fetch blogs"
      );
    }
  }
);

export const fetchAvailableTags = createAsyncThunk<Tags[], void>(
  "tags/fetchAvailableTags",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchFromApi("/api/tags?listTags=true");
      return data.tags || [];
    } catch (error) {
      return rejectWithValue(
        (error as Error).message || "Failed to fetch available tags"
      );
    }
  }
);

const tagSlice = createSlice({
  name: "tags",
  initialState,
  reducers: {
    setSelectedTags: (state, action: PayloadAction<Tags[]>) => {
      state.selectedTags = action.payload;
      if (action.payload.length > 0) {
        state.blogIds = Object.keys(state.entities.blogs).filter((id) =>
          action.payload.every((tag) =>
            state.entities.blogs[id].tags.includes(tag)
          )
        );
      } else {
        state.blogIds = Object.keys(state.entities.blogs);
      }
    },
    clearTags: (state) => {
      state.selectedTags = [];
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
          const cacheKey = `tag:${action.meta.arg.tag || "all"}:${
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

    // fetchAvailableTags
    builder
      .addCase(fetchAvailableTags.pending, (state) => {
        state.status.fetchAvailableTags = "loading";
        state.error.fetchAvailableTags = null;
      })
      .addCase(fetchAvailableTags.fulfilled, (state, action) => {
        state.status.fetchAvailableTags = "succeeded";
        state.availableTags = action.payload;
      })
      .addCase(fetchAvailableTags.rejected, (state, action) => {
        state.status.fetchAvailableTags = "failed";
        state.error.fetchAvailableTags =
          typeof action.payload === "string" ? action.payload : "Unknown error";
      });
  },
});

export const { setSelectedTags, clearTags, setPage } = tagSlice.actions;
export default tagSlice.reducer;
