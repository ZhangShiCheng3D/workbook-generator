"use client";

import { Type, Sparkles, Download } from "lucide-react";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const steps = [
  {
    icon: Type,
    title: "Describe",
    description:
      "Type what you need in plain English. Say 'Fractions worksheets for 4th grade, 20 questions with word problems.' No special formatting or prompt engineering needed.",
    time: "~15 seconds",
    color: "from-indigo-500 to-blue-500",
    bgColor: "bg-indigo-50",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description:
      "Our AI creates a complete workbook: Student Copy with clean question layout, Teacher Copy with answer keys and step-by-step solutions, plus a grading rubric.",
    time: "~60 seconds",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
  },
  {
    icon: Download,
    title: "Print & Teach",
    description:
      "Review, edit if needed, then download as a professionally formatted PDF. Print and hand out to your students. You are ready with zero last-minute prep.",
    time: "~15 seconds",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollAnimate>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Three simple steps from idea to printed workbook — all in under 90 seconds.
            </p>
          </div>
        </ScrollAnimate>

        {/* Steps */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ScrollAnimate key={step.title} delay={index * 150}>
                <div className="relative flex flex-col items-center text-center px-4">
                  {/* Connector line for desktop */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-14 left-[60%] hidden h-0.5 w-[80%] lg:block">
                      <div className="h-full w-full bg-gradient-to-r from-slate-300 via-slate-300 to-transparent" />
                    </div>
                  )}

                  {/* Numbered Circle */}
                  <div
                    className={`relative z-10 mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-lg shadow-indigo-500/20`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl font-bold text-white">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-white/80" />
                    </div>
                  </div>

                  {/* Time Badge */}
                  <span className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    {step.time}
                  </span>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              </ScrollAnimate>
            );
          })}
        </div>

        {/* Bottom line: total time */}
        <ScrollAnimate delay={450}>
          <p className="mt-12 text-center text-sm font-medium text-slate-500">
            Total: under{" "}
            <span className="font-bold text-indigo-600">90 seconds</span> from
            topic to printable workbook
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}
