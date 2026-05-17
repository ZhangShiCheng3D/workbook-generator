import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollAnimate } from "@/components/ui/scroll-animate";

const faqs = [
  {
    question: "What subjects and grades do you support?",
    answer:
      "We currently support Math for Grades 3-5 (Fractions, Decimals, Multiplication, Division, Word Problems, and more). We are actively expanding to cover Grades K-8 Math and Grades 3-8 ELA (Reading Comprehension, Writing, Grammar). Science (NGSS-aligned) is on the roadmap for 2026.",
  },
  {
    question: "Is this really free?",
    answer:
      "Yes! Our Free plan includes 3 complete workbook generations per month. You get full access to Student Copy + Teacher Copy with Answer Key and Rubric. Upgrade to Pro ($8/month) for unlimited generation, advanced differentiation (ELL, Advanced, IEP), and priority support.",
  },
  {
    question: "Can I edit the generated workbooks?",
    answer:
      "Absolutely. We believe in human-in-the-loop quality control. After generation, you can edit any question, change the difficulty level, remove questions, add your own, and adjust the layout before downloading as PDF. The AI is your assistant, not your replacement.",
  },
  {
    question: "Are the answers accurate?",
    answer:
      "Our AI generates answers with confidence markers (green = high confidence, yellow = review recommended, red = low confidence). We use a 3-tier model routing system: straightforward computations use fast, reliable models, while complex word problems use more capable reasoning models. A teacher should always review — we never claim 100% accuracy. If an answer cannot be confidently generated, we do not include that question.",
  },
  {
    question: "Do you collect student data?",
    answer:
      "No. We are a teacher-facing tool only. We do not create student accounts, store student PII, or track student activity. Our product is compliant with FERPA and COPPA by design because we simply do not collect or store any student information. Your workbooks are generated and stay in your account. Read our Privacy Policy for full details.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "ChatGPT is a general-purpose AI chat — it can give you text, but it cannot produce a professionally formatted, print-ready workbook. With our tool: (1) No prompt engineering required — just type your topic in plain English. (2) Every output includes both Student Copy and Teacher Copy with Answer Key + Rubric. (3) PDFs are formatted for real classroom use with cover pages, question numbering, and standards tags. (4) Built-in standards alignment (CCSS, TEKS, NGSS). (5) We generate first, then let you differentiate — not the other way around.",
  },
];

export function FAQ() {
  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollAnimate>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Everything you need to know before you start.
            </p>
          </div>
        </ScrollAnimate>

        {/* FAQ Accordion */}
        <ScrollAnimate delay={100}>
          <div className="mt-12 rounded-xl border border-slate-200/60 bg-white p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-slate-100"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:text-indigo-600 hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollAnimate>

        {/* Bottom CTA */}
        <ScrollAnimate delay={200}>
          <div className="mt-10 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 p-8 text-center">
            <p className="text-slate-700">
              Still have questions?{" "}
              <a
                href="mailto:hello@workbook-generator.com"
                className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 transition-colors"
              >
                Email us
              </a>{" "}
              and we will get back to you within 24 hours.
            </p>
          </div>
        </ScrollAnimate>
      </div>
    </section>
  );
}
