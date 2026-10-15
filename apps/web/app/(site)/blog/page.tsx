import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import PageHero from '@/components/site/PageHero';
import { POSTS, fmtDate } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — Meridyen Yatırım',
  description: 'Borsa, emir türleri, takas, fonlar ve risk yönetimi hakkında yatırımcı rehberleri.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const [first, ...rest] = POSTS;
  return (
    <>
      <SiteHeader />
      <main id="icerik">
        <PageHero title="Yatırımcı rehberi" lead="Borsayı, emir türlerini, takası ve riski sade bir dille anlatan yazılar. Genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir." />
        <div className="wrap pg blogx">
          <a className="feat" href={`/blog/${first.slug}`}>
            <span className="cat">{first.category}</span>
            <h2>{first.title}</h2>
            <p>{first.excerpt}</p>
            <span className="meta">{fmtDate(first.date)} · {first.read} dk okuma</span>
          </a>
          <div className="posts auto">
            {rest.map((p) => (
              <a key={p.slug} className="post" href={`/blog/${p.slug}`}>
                <span className="cat">{p.category}</span><h3>{p.title}</h3><p>{p.excerpt}</p><span className="meta">{fmtDate(p.date)} · {p.read} dk okuma</span>
              </a>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
