import { Blog, Tags, Topics } from "@/generated/prisma";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { normalize, schema } from "normalizr";

// Define normalized entity schema
const blogEntity = new schema.Entity("blogs");
const blogListSchema = new schema.Array(blogEntity);

// Types
export interface Pagination {
  totalPages: number;
  currentPage: number;
  totalBlogs: number;
  limit: number;
}

export interface SearchState {
  isActivated: boolean;
  searchQuery: string | null;
  selectedTags: Tags[];
  selectedTopics: Topics[];
  blogIds: string[];
  entities: {
    blogs: Record<string, Blog>;
  };
  status: {
    fetchSearchResults: "idle" | "loading" | "succeeded" | "failed";
  };
  error: {
    fetchSearchResults: string | null;
  };
  pagination: Pagination;
  cache: Record<string, { ids: string[]; timestamp: number }>;
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initial state
const initialState: SearchState = {
  isActivated: false,
  searchQuery: null,
  selectedTags: [],
  selectedTopics: [],
  blogIds: [],
  entities: {
    blogs: {},
  },
  status: {
    fetchSearchResults: "idle",
  },
  error: {
    fetchSearchResults: null,
  },
  pagination: { totalPages: 1, currentPage: 1, totalBlogs: 0, limit: 10 },
  cache: {},
};

// Thunk for fetching search results
export const fetchSearchResults = createAsyncThunk<
  { blogs: Blog[]; pagination: Pagination },
  {
    query?: string;
    tags?: Tags[];
    topics?: Topics[];
    limit?: number;
    page?: number;
  },
  {
    state: {
      search: SearchState;
      blog: { entities: { blogs: Record<string, Blog> } };
    };
  }
>(
  "search/fetchSearchResults",
  async (
    { query = "", tags = [], topics = [], limit = 10, page = 1 },
    { getState, rejectWithValue }
  ) => {
    try {
      const cacheKey = `search:${query}:${tags.join(",")}:${topics.join(
        ","
      )}:${limit}:${page}`;
      const cache = getState().search.cache[cacheKey];
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return { blogs: [], pagination: getState().search.pagination }; // Return empty to use cached IDs
      }

      const params = new URLSearchParams({
        ...(query.trim() && { q: query.trim() }),
        ...(tags.length && { tags: tags.join(",") }),
        ...(topics.length && { topics: topics.join(",") }),
        limit: limit.toString(),
        page: page.toString(),
      });

      const endpoint =
        query.trim() || tags.length || topics.length
          ? `/api/search?${params.toString()}`
          : `/api/blogs?${params.toString()}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return {
        blogs: data.blogs || [],
        pagination: data.pagination || {
          totalPages: 1,
          currentPage: page,
          totalBlogs: data.blogs?.length || 0,
          limit,
        },
      };
    } catch (error: any) {
      return rejectWithValue(
        (error as Error).message || ("Failed to fetch search results" as string)
      );
    }
  }
);

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchActivated: (state, action: PayloadAction<boolean>) => {
      state.isActivated = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string | null>) => {
      state.searchQuery = action.payload;
      if (action.payload) {
        state.blogIds = Object.keys(state.entities.blogs).filter(
          (id) =>
            state.entities.blogs[id].title
              .toLowerCase()
              .includes(action.payload?.toLowerCase() || "") ||
            state.entities.blogs[id].subTitle
              .toLowerCase()
              .includes(action.payload?.toLowerCase() || "")
        );
      } else {
        state.blogIds = Object.keys(state.entities.blogs);
      }
    },
    setSelectedTags: (state, action: PayloadAction<Tags[]>) => {
      state.selectedTags = action.payload;
      state.blogIds = Object.keys(state.entities.blogs).filter((id) =>
        action.payload.every((tag) =>
          state.entities.blogs[id].tags.includes(tag)
        )
      );
    },
    setSelectedTopics: (state, action: PayloadAction<Topics[]>) => {
      state.selectedTopics = action.payload;
      state.blogIds = Object.keys(state.entities.blogs).filter((id) =>
        action.payload.every((topic) =>
          state.entities.blogs[id].topics.includes(topic)
        )
      );
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = Math.max(1, action.payload);
    },
    clearSearch: (state) => {
      state.searchQuery = null;
      state.selectedTags = [];
      state.selectedTopics = [];
      state.blogIds = [];
      state.pagination = initialState.pagination;
      state.status.fetchSearchResults = "idle";
      state.error.fetchSearchResults = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSearchResults.pending, (state) => {
        state.status.fetchSearchResults = "loading";
        state.error.fetchSearchResults = null;
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.status.fetchSearchResults = "succeeded";
        if (action.payload.blogs.length > 0) {
          const normalized = normalize(action.payload.blogs, blogListSchema);
          state.entities.blogs = {
            ...state.entities.blogs,
            ...normalized.entities.blogs,
          };
          const cacheKey = `search:${action.meta.arg.query || ""}:${
            action.meta.arg.tags?.join(",") || ""
          }:${action.meta.arg.topics?.join(",") || ""}:${
            action.meta.arg.limit || 10
          }:${action.meta.arg.page || 1}`;
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
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.status.fetchSearchResults = "failed";
        state.error.fetchSearchResults =
          typeof action.payload === "string" ? action.payload : "Unknown error";
      });
  },
});

export const {
  setSearchActivated,
  setSearchQuery,
  setSelectedTags,
  setSelectedTopics,
  setPage,
  clearSearch,
} = searchSlice.actions;
export default searchSlice.reducer;
