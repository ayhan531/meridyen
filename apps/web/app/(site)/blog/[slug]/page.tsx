import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/landing.css';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { POSTS, bySlug, fmtDate } from '@/lib/blog';
import { BLOG_CSS } from '@/components/site/blog-css';

export const dynamicParams = false;
export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const p = bySlug(slug);
  if (!p) return {};
  return { title: `${p.title} — Meridyen Yatırım`, description: p.excerpt, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { title: p.title, description: p.excerpt, type: 'article', locale: 'tr_TR', publishedTime: p.date } };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const p = bySlug(slug);
  if (!p) notFound();
  const i = POSTS.findIndex((x) => x.slug === p.slug), more = POSTS.filter((x) => x.slug !== p.slug).slice(i % 3, (i % 3) + 3);
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.excerpt, datePublished: p.date, inLanguage: 'tr', publisher: { '@type': 'Organization', name: 'Meridyen Yatırım' } };
  return (
    <>
      <SiteHeader />
      <main className="blog wrap art">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <p className="crumb"><a href="/">Ana sayfa</a> / <a href="/blog">Blog</a> / {p.category}</p>
        <article>
          <span className="cat">{p.category}</span>
          <h1>{p.title}</h1>
          <p className="meta">{fmtDate(p.date)} · {p.read} dk okuma</p>
          <p className="lead">{p.excerpt}</p>
          {p.blocks.map((b, k) => (
            <section key={k}>
              {b.h && <h2>{b.h}</h2>}
              {b.p?.map((t, j) => <p key={j}>{t}</p>)}
              {b.ul && <ul>{b.ul.map((t, j) => <li key={j}>{t}</li>)}</ul>}
              {b.note && <p className="note">{b.note}</p>}
            </section>
          ))}
          <div className="cta"><b>Hesabınızı birkaç dakikada açın</b><span>Piyasaları izleyin, emir verin, portföyünüzü tek ekranda takip edin.</span><a className="btn primary" href="/kayit">Hesap aç</a></div>
        </article>
        <h2 className="morehd">Diğer yazılar</h2>
        <div className="grid">
          {more.map((m) => <a key={m.slug} className="card" href={`/blog/${m.slug}`}><span className="cat">{m.category}</span><h3>{m.title}</h3><p>{m.excerpt}</p><span className="meta">{fmtDate(m.date)} · {m.read} dk okuma</span></a>)}
        </div>
        <style>{BLOG_CSS}</style>
      </main>
      <SiteFooter />
    </>
  );
}
