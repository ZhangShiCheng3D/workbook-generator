"use client";

import { Download, Printer, Edit3, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkbookActionsProps {
  workbookId: string;
  onDownloadStudent?: () => void;
  onDownloadTeacher?: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
  onCreateVariant?: (type: "ell" | "iep" | "advanced") => void;
}

export function WorkbookActions({
  workbookId,
  onDownloadStudent,
  onDownloadTeacher,
  onPrint,
  onEdit,
  onCreateVariant,
}: WorkbookActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Download dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="default" size="sm" />
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onDownloadStudent} className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            Student Copy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadTeacher} className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            Teacher Copy (with Answers)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Print */}
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>

      {/* Create Variants dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" />
          }
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Variants
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onCreateVariant?.("ell")} className="cursor-pointer">
            ELL / Spanish Support
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreateVariant?.("iep")} className="cursor-pointer">
            IEP / Accommodated
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCreateVariant?.("advanced")} className="cursor-pointer">
            Advanced / Enrichment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
