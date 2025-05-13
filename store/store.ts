import { configureStore } from "@reduxjs/toolkit";
import blogReducer from "@/store/blogSlice";
import searchReducer from "@/store/searchSlice";
import tagReducer from "@/store/tagSlice";
import topicReducer from "@/store/topicSlice";

export const store = configureStore({
  reducer: {
    blog: blogReducer,
    search: searchReducer,
    tag: tagReducer,
    topic: topicReducer,
  },
});

// This allows for automatic typing of the dispatch hook
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
