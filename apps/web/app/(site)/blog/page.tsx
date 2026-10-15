import type { Metadata } from 'next';
import '@/styles/landing.css';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { POSTS, fmtDate } from '@/lib/blog';
import { BLOG_CSS } from '@/components/site/blog-css';

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
      <main className="blog wrap">
        <p className="crumb"><a href="/">Ana sayfa</a> / Blog</p>
        <p className="eyebrow">Yatırımcı rehberi</p>
        <h1>Blog</h1>
        <p className="lead">Borsayı, emir türlerini, takası ve riski sade bir dille anlatan rehber yazılar.</p>
        <a className="feat" href={`/blog/${first.slug}`}>
          <span className="cat">{first.category}</span>
          <h2>{first.title}</h2>
          <p>{first.excerpt}</p>
          <span className="meta">{fmtDate(first.date)} · {first.read} dk okuma</span>
        </a>
        <div className="grid">
          {rest.map((p) => (
            <a key={p.slug} className="card" href={`/blog/${p.slug}`}>
              <span className="cat">{p.category}</span>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="meta">{fmtDate(p.date)} · {p.read} dk okuma</span>
            </a>
          ))}
        </div>
        <style>{BLOG_CSS}</style>
      </main>
      <SiteFooter />
    </>
  );
}
