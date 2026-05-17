import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://practicepacks.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = APP_URL.replace(/\/$/, '');

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/dpa`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.2 },
  ];

  // Topic landing pages for SEO
  const seoPages = [
    'fractions-worksheets-grade-4',
    'multiplication-practice-grade-3',
    'decimals-worksheets-grade-5',
    'reading-comprehension-grade-5',
    'photosynthesis-worksheets-grade-7',
    'algebra-practice-grade-8',
    'grammar-worksheets-grade-3',
    'word-problems-grade-4',
    'science-vocabulary-grade-6',
    'social-studies-worksheets-grade-5',
  ];

  const topicPages = seoPages.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...topicPages];
}
