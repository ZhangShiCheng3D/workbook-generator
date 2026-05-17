"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  WorkbookOutput,
  ParseResult,
  QuestionOutput,
} from "@/types";

type GenerationStatus = "idle" | "parsing" | "generating" | "complete" | "error";
type ActiveView = "student" | "teacher";

interface EditorState {
  // State
  workbook: WorkbookOutput | null;
  status: GenerationStatus;
  streamingQuestions: QuestionOutput[];
  activeView: ActiveView;
  parseResult: ParseResult | null;
  error: string | null;
  generationProgress: { current: number; total: number } | null;

  // Actions
  setWorkbook: (workbook: WorkbookOutput) => void;
  addStreamingQuestion: (question: QuestionOutput) => void;
  setStatus: (status: GenerationStatus) => void;
  toggleView: () => void;
  setActiveView: (view: ActiveView) => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setParseResult: (result: ParseResult) => void;
  setProgress: (progress: { current: number; total: number } | null) => void;
}

const initialState = {
  workbook: null as WorkbookOutput | null,
  status: "idle" as GenerationStatus,
  streamingQuestions: [] as QuestionOutput[],
  activeView: "student" as ActiveView,
  parseResult: null as ParseResult | null,
  error: null as string | null,
  generationProgress: null as { current: number; total: number } | null,
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    ...initialState,

    setWorkbook: (workbook: WorkbookOutput) =>
      set((state) => {
        state.workbook = workbook;
        state.streamingQuestions = workbook.questions;
        state.status = "complete";
        state.error = null;
      }),

    addStreamingQuestion: (question: QuestionOutput) =>
      set((state) => {
        state.streamingQuestions.push(question);
      }),

    setStatus: (status: GenerationStatus) =>
      set((state) => {
        state.status = status;
      }),

    toggleView: () =>
      set((state) => {
        state.activeView = state.activeView === "student" ? "teacher" : "student";
      }),

    setActiveView: (view: ActiveView) =>
      set((state) => {
        state.activeView = view;
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),

    setError: (error: string | null) =>
      set((state) => {
        state.error = error;
        if (error) {
          state.status = "error";
        }
      }),

    setParseResult: (result: ParseResult) =>
      set((state) => {
        state.parseResult = result;
      }),

    setProgress: (progress: { current: number; total: number } | null) =>
      set((state) => {
        state.generationProgress = progress;
      }),
  }))
);
