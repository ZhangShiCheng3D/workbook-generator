import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Blog — Teaching Resources & Worksheet Tips | Practice Packs',
  description: 'Tips, best practices, and free resources for K-12 teachers. Learn how to create effective worksheets, align with standards, and save prep time.',
};

const posts = [
  {
    title: 'How to Create Effective Fraction Worksheets for 4th Grade',
    slug: 'fractions-worksheets-grade-4',
    excerpt: 'Learn the key elements of fraction worksheets that actually help students understand equivalence, comparison, and operations — aligned with CCSS.MATH.CONTENT.4.NF.',
    date: '2026-05-10',
    tags: ['Math', 'Grade 4'],
  },
  {
    title: 'Multiplication Practice That Works: A 3rd Grade Guide',
    slug: 'multiplication-practice-grade-3',
    excerpt: 'Move beyond drill-and-kill. Research-backed multiplication activities that help 3rd graders build fluency while developing conceptual understanding.',
    date: '2026-05-08',
    tags: ['Math', 'Grade 3'],
  },
  {
    title: 'Teaching Decimals in 5th Grade: From Concrete to Abstract',
    slug: 'decimals-worksheets-grade-5',
    excerpt: 'A step-by-step approach to decimal instruction that connects place value, fractions, and real-world applications.',
    date: '2026-05-05',
    tags: ['Math', 'Grade 5'],
  },
  {
    title: 'Reading Comprehension Strategies for 5th Grade',
    slug: 'reading-comprehension-grade-5',
    excerpt: 'Build critical reading skills with text-dependent questions, inference practice, and evidence-based responses aligned with CCSS ELA.',
    date: '2026-05-01',
    tags: ['ELA', 'Grade 5'],
  },
  {
    title: 'Why Every Worksheet Needs an Answer Key and Rubric',
    slug: 'answer-key-rubric-best-practices',
    excerpt: 'How providing answer keys and grading rubrics improves student outcomes and saves teachers hours each week.',
    date: '2026-04-28',
    tags: ['Teaching Tips', 'Assessment'],
  },
  {
    title: 'Supporting ELL Students with Differentiated Worksheets',
    slug: 'ell-differentiated-worksheets',
    excerpt: 'Practical strategies for adapting worksheets for English Language Learners: simplified language, visual supports, word banks.',
    date: '2026-04-25',
    tags: ['ELL', 'Differentiation'],
  },
];

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-12 text-center text-4xl font-bold tracking-tight">Teaching Resources & Tips</h1>
      <div className="grid gap-8 sm:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <Card className="h-full transition-all hover:border-indigo-300 hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex flex-wrap gap-2">
                  {post.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
                <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors">{post.title}</CardTitle>
                <CardDescription className="text-xs">{post.date}</CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{post.excerpt}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
