import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import PageHero from './PageHero';
import { PAGES } from './pages-data';

export default function InfoPage({ slug }: { slug: string }) {
  const p = PAGES[slug];
  return (
    <>
      <SiteHeader />
      <main id="icerik">
        <PageHero title={p.title} lead={p.lead} crumb={p.crumb} />
        {p.body}
        {p.cta ? (
          <section className="cta-band" style={{ marginTop: 'clamp(24px,4vw,56px)' }}>
            <div className="wrap">
              <h2>Hesabınızı birkaç dakikada açın</h2>
              <p>Kayıt olun, kimliğinizi doğrulayın, ilk emrinizi verin.</p>
              <div className="ctas"><a className="btn lime" href="/kayit">Hesap aç</a><a className="btn onDark" href="/iletisim">Bize yazın</a></div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
