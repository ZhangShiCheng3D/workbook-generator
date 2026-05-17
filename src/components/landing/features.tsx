import {
  MessageSquareText,
  BookOpen,
  Printer,
  GraduationCap,
} from "lucide-react";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const features = [
  {
    icon: MessageSquareText,
    title: "Natural Language Input",
    description:
      "Just type what you need. Our AI handles grade level, question types, and standards alignment automatically. No prompt engineering. No templates. No complexity.",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: BookOpen,
    title: "Student + Teacher Copy",
    description:
      "Every workbook includes both: clean student pages ready for printing, and teacher pages with answer keys, step-by-step solutions, and grading rubrics.",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    icon: Printer,
    title: "Professional PDF Output",
    description:
      "Not ChatGPT text. Real, formatted, print-ready workbooks with cover pages, question numbering, answer blanks, and standards tags. Just download and print.",
    iconBg: "bg-rose-100 text-rose-600",
  },
  {
    icon: GraduationCap,
    title: "Standards-Aligned",
    description:
      "Every question tagged with CCSS, NGSS, or TEKS standards. Automatic coverage reports for administrators. Built-in differentiation for ELL, Advanced, and IEP learners.",
    iconBg: "bg-amber-100 text-amber-600",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollAnimate>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need to Create
              <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Professional Workbooks
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Four pillars that make us different from a generic AI chatbot.
            </p>
          </div>
        </ScrollAnimate>

        {/* Features Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollAnimate key={feature.title} delay={index * 100}>
                <div className="group relative rounded-xl border border-slate-200/60 bg-white p-8 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 hover:-translate-y-1">
                  {/* Top accent bar on hover */}
                  <div className="absolute top-0 left-0 h-1 w-full rounded-t-xl bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.iconBg} shadow-sm`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </ScrollAnimate>
            );
          })}
        </div>
      </div>
    </section>
  );
}
