import Link from "next/link";
import { Sparkles } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Demo", href: "/dashboard/generate" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Data Processing", href: "/dpa" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-slate-900"
            >
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Practice Packs
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              90 seconds from topic to printable workbook. Built for US K-12
              teachers.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Practice Packs. All rights
              reserved.
            </p>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-slate-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-indigo-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p>
            Designed for US K-12 teachers. No student accounts. No student data
            collected. FERPA &amp; COPPA compliant by design.
          </p>
        </div>
      </div>
    </footer>
  );
}
