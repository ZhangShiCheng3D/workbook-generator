import { Clock, FileText, Zap } from "lucide-react";

const problems = [
  "Hours wasted searching for the right worksheet",
  "Mixing and matching from different sources",
  "No answer key or the answers are wrong",
  "Doesn't align with your standards",
  "Still have to format it for printing",
];

const solutions = [
  "Type what you need in plain English",
  "AI generates complete workbook in 90 seconds",
  "Review and edit before printing",
  "Standards-aligned, properly formatted PDF",
  "Walk into class prepared on Monday morning",
];

export function ProblemSolution() {
  return (
    <section className="relative bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Stop Spending Sundays Making Worksheets
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            There is a better way. Compare your current reality with what we offer.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Problem Side */}
          <div className="group relative rounded-2xl border border-red-200 bg-red-50/60 p-8 sm:p-10 transition-all hover:shadow-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
              <Clock className="h-4 w-4" />
              The Old Way
            </div>
            <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Sunday Panic
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">
              Spent your entire Sunday afternoon making worksheets? Scrolling
              Pinterest, Teachers Pay Teachers, and Google Images trying to
              piece together something usable?
            </p>
            <ul className="mt-6 space-y-3">
              {problems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
            {/* Visual: messy search mockup */}
            <div className="mt-8 rounded-xl border border-red-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400">
                  fractions worksheets 4th grade...
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
              <p className="mt-2 text-xs text-slate-400 italic">
                Another 45 minutes of scrolling...
              </p>
            </div>
          </div>

          {/* Solution Side */}
          <div className="group relative rounded-2xl border border-green-200 bg-green-50/60 p-8 sm:p-10 transition-all hover:shadow-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              <Zap className="h-4 w-4" />
              The New Way
            </div>
            <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Your Emergency Kit
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">
              Type a topic. Get a complete, printable workbook in 90 seconds.
              Student Copy + Teacher Copy with Answer Key + Rubric. Every time.
            </p>
            <ul className="mt-6 space-y-3">
              {solutions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            {/* Visual: clean PDF mockup */}
            <div className="mt-8 rounded-xl border border-green-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-indigo-500" />
                <div>
                  <div className="h-3 w-32 rounded bg-slate-200" />
                  <div className="mt-1 h-2 w-24 rounded bg-slate-100" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-3/4 rounded bg-slate-100" />
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-2/3 rounded bg-slate-100" />
              </div>
              <p className="mt-3 text-xs font-medium text-green-600">
                Professional PDF — ready to print
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
