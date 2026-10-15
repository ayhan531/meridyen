import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import InfoPage from '@/components/site/InfoPage';
import { PAGES } from '@/components/site/pages-data';

export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(PAGES).map((sayfa) => ({ sayfa })); }
export async function generateMetadata({ params }: { params: Promise<{ sayfa: string }> }): Promise<Metadata> {
  const { sayfa } = await params; const p = PAGES[sayfa];
  return p ? { title: `${p.title} — Meridyen Yatırım`, description: p.lead } : {};
}
export default async function Page({ params }: { params: Promise<{ sayfa: string }> }) {
  const { sayfa } = await params;
  if (!PAGES[sayfa]) notFound();
  return <InfoPage slug={sayfa} />;
}
