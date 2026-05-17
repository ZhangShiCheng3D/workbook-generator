import { toast } from "sonner";

/**
 * Typed toast notification helpers wrapping the sonner library.
 * Provides a consistent API surface for success, error, loading, and promise-based toasts.
 *
 * Usage:
 *   import { notify } from "@/lib/toast";
 *   notify.success("Workbook generated!");
 *   notify.error("Failed to delete workbook");
 *   notify.loading("Generating questions...");
 *   await notify.promise(fetchData(), {
 *     loading: "Saving...",
 *     success: "Saved!",
 *     error: "Save failed",
 *   });
 */
export const notify = {
  /** Show a success toast (green checkmark). */
  success: (msg: string) => toast.success(msg),

  /** Show an error toast (red X icon). */
  error: (msg: string) => toast.error(msg),

  /** Show a neutral info toast. */
  info: (msg: string) => toast.info(msg),

  /** Show a warning toast (yellow triangle). */
  warning: (msg: string) => toast.warning(msg),

  /** Show a persistent loading toast. Returns the toast ID for manual dismissal. */
  loading: (msg: string) => toast.loading(msg),

  /**
   * Show a loading toast that resolves to success or error based on the promise outcome.
   * Returns a promise that resolves with the original data.
   */
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ): Promise<T> => {
    // sonner's toast.promise wraps the promise and returns it with a .unwrap() method.
    // We cast through unknown since sonner v2 types the return as string|number with .unwrap().
    const result = toast.promise(promise, msgs) as unknown as Promise<T> & {
      unwrap: () => Promise<T>;
    };
    return result.unwrap ? result.unwrap() : result;
  },

  /** Dismiss a specific toast by its ID. */
  dismiss: (toastId: string | number) => toast.dismiss(toastId),
} as const;
