import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In — Printable Practice Packs",
  description: "Sign in to your Printable Practice Packs account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4 dark:from-zinc-950 dark:to-zinc-900">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/25">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Practice Packs
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Printable workbooks for K-12 teachers
        </p>
      </div>

      {/* Card */}
      {children}
    </div>
  );
}
