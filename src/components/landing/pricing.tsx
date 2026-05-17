import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const plans = [
  {
    name: "Free",
    description: "Try it out in your classroom",
    price: "$0",
    period: "forever",
    cta: "Get Started",
    href: "/signup",
    popular: false,
    features: [
      "3 workbooks per month",
      "Basic question types",
      "Watermarked PDFs",
      "Student Copy + Teacher Copy",
      "Answer Key included",
    ],
  },
  {
    name: "Pro",
    description: "For individual teachers who want more",
    price: "$8",
    period: "/month",
    cta: "Start Pro",
    href: "/signup?plan=pro",
    popular: true,
    features: [
      "50 workbooks per month",
      "No watermark",
      "All question types",
      "Differentiated versions (ELL, IEP, Advanced)",
      "Enhance existing materials",
      "Priority generation speed",
    ],
  },
  {
    name: "School",
    description: "For departments and entire schools",
    price: "$99",
    period: "/month",
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
    features: [
      "Unlimited workbooks",
      "Up to 10 teachers included",
      "Google & Microsoft SSO",
      "Shared school library",
      "Admin dashboard",
      "District data export",
      "Priority support",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollAnimate>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple Pricing, No Surprises
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Start free, upgrade when you need more. Cancel anytime.
            </p>
          </div>
        </ScrollAnimate>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <ScrollAnimate key={plan.name} delay={index * 100}>
              <div
                className={cn(
                  "relative flex flex-col rounded-xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:shadow-lg",
                  plan.popular &&
                    "border-indigo-600 shadow-lg shadow-indigo-100"
                )}
              >
                {/* Most Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Popular
                  </div>
                )}

                {/* Plan Name & Description */}
                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

                {/* Price */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-base text-slate-500">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="mt-8">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      plan.popular
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/25"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                    asChild
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </div>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}
