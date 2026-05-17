"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shield,
  Lock,
  Users,
  Sparkles,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";

export function Hero() {
  const scrollToDemo = () => {
    const demo = document.getElementById("how-it-works");
    if (demo) {
      demo.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(79,70,229,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.04) 0%, transparent 50%)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,70,229,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-6 pb-2">
          <Badge
            variant="secondary"
            className="text-xs font-medium text-slate-500 border-slate-200 bg-white/80"
          >
            <Shield className="mr-1.5 h-3.5 w-3.5 text-green-600" />
            SOC 2 Compliant
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs font-medium text-slate-500 border-slate-200 bg-white/80"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5 text-green-600" />
            FERPA Safe
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs font-medium text-slate-500 border-slate-200 bg-white/80"
          >
            <Users className="mr-1.5 h-3.5 w-3.5 text-green-600" />
            No Student Data Collected
          </Badge>
        </div>

        {/* Main Hero Content */}
        <div className="mx-auto max-w-4xl pt-16 pb-20 text-center sm:pt-20 sm:pb-24">
          {/* Status badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <Sparkles className="h-4 w-4" />
            Now supporting Grades 3-5 Math
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            <span className="block">From Topic to Printable</span>
            <span className="mt-2 block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Workbook in 90 Seconds
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Type a topic, pick a grade, and get a complete workbook — Student
            Copy, Teacher Copy with Answer Key, and Grading Rubric.
            <strong className="text-slate-800"> Zero prompt engineering required.</strong>
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="2xl"
              className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              asChild
            >
              <Link href="/signup">
                Start Free — No Credit Card
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="2xl"
              className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={scrollToDemo}
            >
              See It In Action
            </Button>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="animate-float flex flex-col items-center rounded-xl bg-white/70 px-6 py-4 shadow-sm ring-1 ring-slate-200/60">
              <Users className="mb-1 h-5 w-5 text-indigo-500" />
              <div className="text-2xl font-bold text-slate-900">3.8M</div>
              <div className="text-sm text-slate-500">US K-12 Teachers</div>
            </div>
            <div className="animate-float-delay flex flex-col items-center rounded-xl bg-white/70 px-6 py-4 shadow-sm ring-1 ring-slate-200/60">
              <Clock className="mb-1 h-5 w-5 text-indigo-500" />
              <div className="text-2xl font-bold text-slate-900">90s</div>
              <div className="text-sm text-slate-500">From Topic to Print</div>
            </div>
            <div className="animate-float-slow flex flex-col items-center rounded-xl bg-white/70 px-6 py-4 shadow-sm ring-1 ring-slate-200/60">
              <Zap className="mb-1 h-5 w-5 text-indigo-500" />
              <div className="text-2xl font-bold text-slate-900">0</div>
              <div className="text-sm text-slate-500">Prompt Engineering</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
