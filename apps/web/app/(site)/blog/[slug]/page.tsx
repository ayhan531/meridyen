import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { POSTS, bySlug, fmtDate } from '@/lib/blog';
import PageHero from '@/components/site/PageHero';

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
      <main id="icerik">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <PageHero title={p.title} crumb={[['/blog', 'Blog']]}>
          <div className="art-meta"><span>{p.category}</span><span>{fmtDate(p.date)}</span><span>{p.read} dk okuma</span></div>
        </PageHero>
        <div className="wrap pg">
          <article className="prose art-wrap">
            <p style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>{p.excerpt}</p>
            {p.blocks.map((b, k) => (
              <section key={k}>
                {b.h && <h2>{b.h}</h2>}
                {b.p?.map((t, j) => <p key={j}>{t}</p>)}
                {b.ul && <ul>{b.ul.map((t, j) => <li key={j}>{t}</li>)}</ul>}
                {b.note && <div className="callout">{b.note}</div>}
              </section>
            ))}
            <div className="art-cta"><b style={{ fontSize: '1.2rem' }}>Hesabınızı birkaç dakikada açın</b><p>Piyasaları izleyin, emir verin, portföyünüzü tek ekranda takip edin.</p><a className="btn lime" href="/kayit">Hesap aç</a></div>
          </article>
          <h2 className="morehd">Diğer yazılar</h2>
          <div className="posts">
            {more.map((m) => <a key={m.slug} className="post" href={`/blog/${m.slug}`}><span className="cat">{m.category}</span><h3>{m.title}</h3><p>{m.excerpt}</p><span className="meta">{fmtDate(m.date)} · {m.read} dk okuma</span></a>)}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
