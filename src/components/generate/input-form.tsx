"use client";

import { useState, useCallback, useRef } from "react";
import { Send, FileUp, Loader2, Sparkles, X, Check, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface InputFormProps {
  onSubmit: (input: string) => void;
  onEnhance?: (input: string, material: string, options: string[]) => void;
  isGenerating: boolean;
  /** Optional pre-filled value from query params */
  defaultValue?: string;
}

const MAX_CHARS = 500;
const MIN_CHARS = 3;

const quickSuggestions = [
  { label: "Fractions G4", value: "fractions adding subtracting 4th grade" },
  { label: "Multiplication G3", value: "multiplication tables up to 12, 3rd grade" },
  { label: "Photosynthesis G7", value: "photosynthesis process and steps, 7th grade science" },
  { label: "Reading Comp G5", value: "reading comprehension short passages, 5th grade ELA" },
  { label: "Decimals G5", value: "decimal operations add subtract multiply divide, 5th grade" },
  { label: "US Civil War G8", value: "causes and key battles of the Civil War, 8th grade" },
];

const examples = [
  {
    label: "Fractions practice for 4th grade",
    value: "Create 20 fraction addition and subtraction problems for 4th grade students, aligned with Common Core standards",
    icon: "1/4 + 2/4",
  },
  {
    label: "Photosynthesis quiz for 7th grade",
    value: "Create a 15-question assessment on photosynthesis for 7th grade science, including multiple choice and short answer",
    icon: "lightbulb",
  },
  {
    label: "Multiplication drills for 3rd grade",
    value: "Generate multiplication practice for 3rd grade, covering facts up to 12 x 12, with word problems",
    icon: "8 x 7",
  },
];

const ENHANCEMENT_OPTIONS = [
  { id: 'add_rubric', label: 'Add Grading Rubric', desc: 'Include a scoring rubric for the questions' },
  { id: 'add_answer_key', label: 'Ensure Answer Key', desc: 'Verify every question has a detailed answer' },
  { id: 'add_more_questions', label: 'Add More Questions', desc: 'Generate additional questions of similar difficulty' },
  { id: 'ell_friendly', label: 'ELL-Friendly Version', desc: 'Simplify language for English Language Learners' },
  { id: 'iep_support', label: 'IEP Support', desc: 'Add scaffolding and visual descriptions' },
  { id: 'advanced_enrichment', label: 'Advanced Enrichment', desc: 'Add higher-order thinking extensions' },
];

export function InputForm({
  onSubmit,
  onEnhance,
  isGenerating,
  defaultValue = "",
}: InputFormProps) {
  const [input, setInput] = useState(defaultValue);
  const [showEnhance, setShowEnhance] = useState(false);
  const [touched, setTouched] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set(['add_rubric', 'add_answer_key']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = input.length;
  const trimmedLength = input.trim().length;
  const isTooShort = touched && trimmedLength > 0 && trimmedLength < MIN_CHARS;
  const isTooLong = charCount > MAX_CHARS;
  const isValid = trimmedLength >= MIN_CHARS && charCount <= MAX_CHARS;
  const showCharWarning = charCount > 400;

  const isEmpty = input.trim().length === 0;

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    setTouched(true);
    if (!isValid || isGenerating) return;
    onSubmit(trimmed);
  }, [input, isValid, isGenerating, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (value: string) => {
    setInput(value);
    setTouched(false);
  };

  // Read a file as base64
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setSelectedFile(file);
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data:...;base64, prefix
      const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
      setFileBase64(base64);
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setSelectedFile(null);
      setFileBase64(null);
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const handleEnhanceSubmit = useCallback(() => {
    const trimmed = input.trim();
    setTouched(true);
    if (!fileBase64 || !onEnhance) return;
    if (trimmed.length < 3) return;
    onEnhance(trimmed, fileBase64, Array.from(selectedOptions));
  }, [input, fileBase64, selectedOptions, onEnhance]);

  return (
    <div className="space-y-4">
      {/* Main input */}
      <div className="relative">
        <Textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!touched && e.target.value.length > 0) setTouched(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTouched(true)}
          placeholder="e.g., fractions 4th grade, photosynthesis quiz 7th grade, multiplication tables G3"
          disabled={isGenerating}
          className={cn(
            "min-h-[120px] resize-none pr-14 text-base",
            isTooLong && "border-destructive focus-visible:ring-destructive/30",
            isTooShort && "border-amber-500 focus-visible:ring-amber-500/30"
          )}
          aria-label="What do you need? Describe the worksheet topic"
          aria-describedby="input-helper input-charcount"
          aria-invalid={isTooLong || isTooShort}
        />

        {/* Send button */}
        <Button
          size="icon"
          className="absolute bottom-4 right-4 h-9 w-9"
          onClick={handleSubmit}
          disabled={!isValid || isGenerating}
          aria-label="Generate workbook"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Try an example row - shown only when input is empty */}
      {isEmpty && !isGenerating && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Try an example
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {examples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setInput(example.value);
                  setTouched(false);
                }}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {example.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
                    {example.value}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation messages */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div>
          <p id="input-helper" className="text-muted-foreground">
            Describe your topic naturally. The AI will figure out subject, grade level, and question types.
          </p>
          {isTooShort && (
            <p className="mt-1 font-medium text-amber-600 dark:text-amber-400" role="alert">
              Please enter at least {MIN_CHARS} characters (you have {trimmedLength}).
            </p>
          )}
          {isTooLong && (
            <p className="mt-1 font-medium text-destructive" role="alert">
              Input exceeds {MAX_CHARS} characters. Please shorten your description.
            </p>
          )}
        </div>
        <span
          id="input-charcount"
          className={cn(
            "shrink-0 tabular-nums",
            showCharWarning && !isTooLong && "text-amber-600 dark:text-amber-400",
            isTooLong && "font-semibold text-destructive"
          )}
          aria-live="polite"
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {/* Quick suggestion chips */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.value)}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                "dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              )}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isGenerating}
          size="lg"
          className="h-11"
          aria-label={isGenerating ? "Generating workbook..." : "Generate workbook"}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            "Generate Workbook"
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-11"
          onClick={() => setShowEnhance(!showEnhance)}
          disabled={isGenerating}
          aria-expanded={showEnhance}
        >
          <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
          Enhance Existing
        </Button>
      </div>

      {/* Enhance section (expandable) */}
      {showEnhance && (
        <div className="rounded-lg border-2 border-dashed border-indigo-300 p-5 space-y-4 dark:border-indigo-700">
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Upload existing materials to enhance
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
            aria-label="Choose files to enhance"
          />

          {/* File picker */}
          {!selectedFile ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-20 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
            >
              <div className="text-center">
                <FileUp className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Click to upload (PDF, DOCX, JPG, PNG, TXT — max 10MB)
                </span>
              </div>
            </Button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
              {isReadingFile ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Check className="h-5 w-5 text-green-600" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setSelectedFile(null);
                  setFileBase64(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isGenerating}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Enhancement options checklist */}
          {selectedFile && (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Enhancement Options:
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {ENHANCEMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors text-xs",
                        selectedOptions.has(opt.id)
                          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                          : "border-border hover:border-indigo-200"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOptions.has(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                        className="mt-0.5 h-3.5 w-3.5"
                      />
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <span className="ml-1 text-muted-foreground">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={handleEnhanceSubmit}
                disabled={!fileBase64 || isGenerating || input.trim().length < 3}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
