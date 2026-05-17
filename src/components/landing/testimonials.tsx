import { Star, Quote } from "lucide-react";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const testimonials = [
  {
    quote:
      "I used to spend my entire Sunday making worksheets. Now I type 'fractions 4th grade 20 questions with word problems' and have a complete workbook in 90 seconds. Game changer.",
    name: "Sarah M.",
    role: "4th Grade Teacher",
    school: "Public School, Texas",
    avatar: "SM",
  },
  {
    quote:
      "The answer keys with step-by-step solutions are incredible. I can hand the Teacher Copy to a substitute and they know exactly what to do. My principal noticed the standards tags too!",
    name: "James R.",
    role: "5th Grade Math Teacher",
    school: "Charter School, Florida",
    avatar: "JR",
  },
  {
    quote:
      "Finally — an AI tool that actually understands what teachers need. Not a chatbot, not a prompt playground. A real workbook generator. The differentiation feature saved me hours on IEP prep.",
    name: "Maria G.",
    role: "3rd Grade Teacher",
    school: "Public School, California",
    avatar: "MG",
  },
];

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollAnimate>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Trusted by Teachers
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Join 500+ teachers who have already reclaimed their Sundays.
            </p>
          </div>
        </ScrollAnimate>

        {/* Testimonial Cards */}
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, index) => (
            <ScrollAnimate key={t.name} delay={index * 100}>
              <div className="group relative rounded-xl border border-slate-200/60 bg-white p-6 pt-8 transition-all duration-300 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1">
                {/* Quote icon */}
                <Quote className="absolute top-4 left-6 h-8 w-8 text-indigo-100 -z-0 group-hover:text-indigo-200 transition-colors" />

                {/* Quote text */}
                <blockquote className="relative z-10 text-sm leading-relaxed text-slate-600">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Stars */}
                <div className="mt-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Author */}
                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                    <div className="text-xs text-slate-400">{t.school}</div>
                  </div>
                </div>

                {/* Beta badge */}
                <div className="absolute top-3 right-3 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                  Beta User
                </div>
              </div>
            </ScrollAnimate>
          ))}
        </div>

        {/* Social proof line */}
        <ScrollAnimate delay={300}>
          <p className="mt-10 text-center text-sm font-medium text-slate-500">
            Join{" "}
            <span className="text-indigo-600 font-semibold">500+ teachers</span>{" "}
            who now spend Sundays relaxing instead of making worksheets.
          </p>
        </ScrollAnimate>
      </div>
    </section>
  );
}
