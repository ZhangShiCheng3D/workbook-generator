import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function CtaFinal() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 py-20 lg:py-28">
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 30%, rgba(255,255,255,0.8) 0%, transparent 40%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.6) 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Sparkle badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
          <Sparkles className="h-4 w-4" />
          Free for your first 3 workbooks every month
        </div>

        {/* Headline */}
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Ready to Reclaim Your Sundays?
        </h2>

        {/* Subheadline */}
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-indigo-100 sm:text-xl">
          Start generating professional workbooks in 90 seconds. No credit card
          required. No prompt engineering. Just type and print.
        </p>

        {/* CTA Button */}
        <div className="mt-10">
          <Button
            size="2xl"
            className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl shadow-indigo-900/30 transition-all hover:shadow-2xl hover:shadow-indigo-900/40 hover:scale-105"
            asChild
          >
            <Link href="/signup">
              Start Free Now
              <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-sm text-indigo-200">
          No credit card required. 3 free workbooks per month. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
