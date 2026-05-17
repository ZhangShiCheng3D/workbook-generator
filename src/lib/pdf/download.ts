"use client";

import type { WorkbookOutput } from "@/types";

/**
 * Open a print-optimized HTML page for the Student Copy.
 * The browser's native print/save-as-PDF handles rendering reliably.
 */
export function downloadStudentPDF(workbookId: string): void {
  window.open(`/api/workbooks/${workbookId}/pdf?type=student`, '_blank');
}

/**
 * Open a print-optimized HTML page for the Teacher Copy.
 */
export function downloadTeacherPDF(workbookId: string): void {
  window.open(`/api/workbooks/${workbookId}/pdf?type=teacher`, '_blank');
}

/**
 * Trigger browser print dialog on the current page.
 */
export function printCurrentPage(): void {
  window.print();
}
