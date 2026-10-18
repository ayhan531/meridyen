import type { Metadata } from 'next';
import Faq from '@/components/site/Faq';
import MarketTape from '@/components/site/MarketTape';
import HeroCarousel from '@/components/site/HeroCarousel';
import MarketTabs from '@/components/site/MarketTabs';
import NewsList from '@/components/site/NewsList';
import Channels from '@/components/site/Channels';
import QuickActions from '@/components/site/QuickActions';
import Calculators from '@/components/site/Calculators';
import CountUp from '@/components/site/CountUp';
import PhoneDemo from '@/components/site/PhoneDemo';
import Reveal from '@/components/site/Reveal';
import SiteFooter from '@/components/site/SiteFooter';
import SiteHeader from '@/components/site/SiteHeader';
import Steps from '@/components/site/Steps';
import { Ico } from '@/components/site/icons';
import { POSTS } from '@/lib/blog';
import { FAQ } from '@/lib/site-content';

export const metadata: Metadata = {
  title: "Meridyen Yatırım — Borsa İstanbul'a sade ve şeffaf bir hat",
  description: 'Borsa İstanbul paylarını izleyin, emir verin, portföyünüzü takip edin. Komisyon ve BSMV emri onaylamadan önce görünür; fiyatlar canlı kaynaktan gelir.',
  alternates: { canonical: '/' },
  openGraph: { title: 'Meridyen Yatırım', description: "Borsa İstanbul'a sade ve şeffaf bir hat.", type: 'website', locale: 'tr_TR' },
};

const PRODUCTS: [string, string, string, string, boolean][] = [
  ['/hizmetler#pay', 'Pay piyasası', 'Borsa İstanbul hisselerinde piyasa ve limit emri, bekleyen emir takibi ve T+2 takas bilgisi.', 'Çevrim içi işlem', true],
  ['/hizmetler#fon', 'Yatırım fonları', 'Canlı fon fiyatlarını izleyin. Alım satım için müşteri temsilcinizle çalışırsınız.', 'İzleme', false],
  ['/hizmetler#viop', 'Vadeli işlemler', 'VİOP sözleşmelerini tek listede takip edin. İşlem müşteri temsilcisi üzerinden yapılır.', 'İzleme', false],
  ['/hizmetler#doviz', 'Döviz', 'Anlık kurlar ve yerleşik döviz çevirici. Alım satım müşteri temsilcisi üzerinden yapılır.', 'İzleme ve çevirici', false],
  ['/hizmetler#emtia', 'Altın ve emtia', 'Gram altın ve Brent petrol fiyatları, piyasa panelinde canlı olarak yer alır.', 'İzleme', false],
];

const STEPS: [string, string][] = [
  ['Hesabınızı oluşturun', 'T.C. kimlik numaranız ve temel bilgilerinizle kayıt olun. Yatırımcı profili sorularını yanıtlayın, sözleşmeleri onaylayın.'],
  ['Kimliğinizi doğrulayın', 'Kimlik belgenizin ön ve arka yüzünü uygulamadan yükleyin. Belgeler incelenir ve hesabınız onaylanır.'],
  ['Bakiyenizi yükleyin', 'Havale veya EFT için talep oluşturun, açıklamaya transfer kodunu yazın. Talep onaylanınca tutar bakiyenize geçer.'],
  ['Emrinizi verin', 'Hisseyi seçin, tutarı girin; komisyon ve BSMV dahil toplamı görün, onaylayın. Bekleyen emirleri istediğinizde iptal edin.'],
];

const TRUST: [string, string, string][] = [
  ['eye', 'Maliyet önce görünür', 'Komisyon ve BSMV, emri onaylamadan önce kuruşu kuruşuna gösterilir. Sonradan çıkan kalem olmaz.'],
  ['globe', 'Fiyat doğrulanamazsa emir kapanır', 'Canlı fiyat kaynağına ulaşılamadığında alım satım güvenlik için geçici olarak durur; eski fiyattan işlem yapılmaz.'],
  ['user', 'Kimliği doğrulanmış hesap', 'Alım satım, kimlik belgeleriniz incelenip hesabınız onaylandıktan sonra açılır.'],
  ['wallet', 'Para hareketlerinde onay adımı', 'Yatırma ve çekme talepleri kontrol edilir. Çekim yalnızca adınıza kayıtlı banka hesabına yapılır.'],
  ['bell', 'Her adımda bildirim ve kayıt', 'Emir ve para hareketleriniz hesap geçmişinde tutulur; isterseniz tarayıcı bildirimiyle haberdar olursunuz.'],
  ['lock', 'Şifreli bağlantı', 'Tüm sayfalar ve e-şube HTTPS üzerinden sunulur. Şifrenizi istediğiniz zaman e-şubeden değiştirebilirsiniz.'],
];

const FEATURES: [string, string, string, string][] = [
  ['layers', 'Portföy ve emirler tek yerde', 'Pozisyonlarınız, bekleyen ve gerçekleşen emirleriniz, nakit ve T+2 bakiyeniz tek ekranda. Kâr ve zarar anlık fiyatla hesaplanır.', 'w4 big dk'],
  ['bell', 'Bildirimler', 'Emir gerçekleştiğinde ve para hareketi onaylandığında bildirim alın.', 'w2 lm'],
  ['swap', 'Döviz çevirici', 'Canlı kurlarla hızlı hesap.', ''],
  ['list', 'Hesap hareketleri', 'Tarih ve metin filtresiyle tüm işlemleriniz.', ''],
  ['phone', 'Her cihazda aynı hesap', 'Telefon, tablet ve bilgisayarda aynı e-şube.', ''],
];

export default function LandingPage() {
  const posts = POSTS.slice(0, 3);
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.slice(0, 8).map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) };
  return (
    <>
      <SiteHeader />
      <main id="icerik">
        <HeroCarousel />
        <MarketTape />

        <section className="sec" style={{ paddingBlock: 'clamp(36px,5vw,64px) 0' }} aria-label="İşleyiş kuralları">
          <div className="wrap">
            <Reveal as="dl" className="rules4" stagger>
              <div><dt>Pay komisyonu</dt><dd><CountUp to={0.1} dec={1} prefix="%" /><small>üzerine komisyonun %5&apos;i kadar BSMV</small></dd></div>
              <div><dt>Seans</dt><dd className="num">10:00–18:00<small>hafta içi, sürekli işlem</small></dd></div>
              <div><dt>Takas</dt><dd><CountUp to={2} prefix="T+" /><small>satış bedeli ikinci iş gününde çekilebilir</small></dd></div>
              <div><dt>Para çekme</dt><dd>En az <CountUp to={500} suffix=" ₺" /><small>yalnızca adınıza kayıtlı hesaba</small></dd></div>
            </Reveal>
          </div>
        </section>

        <section className="sec" style={{ paddingBlock: 'clamp(28px,4vw,48px) 0' }} aria-label="Hızlı işlemler">
          <div className="wrap"><Reveal><QuickActions /></Reveal></div>
        </section>

        <section className="sec" id="piyasalar" aria-labelledby="mkT">
          <div className="wrap">
            <Reveal className="sec-head split">
              <h2 id="mkT">Piyasa şu an böyle görünüyor</h2>
              <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
                <p>Günün en çok hareket eden hisseleri ile endeks, kur ve emtia değerleri canlı veri kaynağından gelir.</p>
                <a className="sec-link" href="/piyasalar">Tüm piyasaları gör</a>
              </div>
            </Reveal>
            <Reveal className="mk" delay={120}><MarketTabs /><div className="panel"><div className="panel-hd"><h3>Piyasa haberleri</h3><a className="sec-link" href="/haberler">Tümü</a></div><NewsList limit={6} /></div></Reveal>
          </div>
        </section>

        <section className="sec tint" aria-labelledby="prT">
          <div className="wrap prods-wrap">
            <Reveal className="sticky">
              <div className="sec-head" style={{ marginBottom: 0 }}>
                <h2 id="prT">Yatırım ürünleri</h2>
                <p>Borsa İstanbul payları çevrim içi işlem görür. Diğer ürünleri izleyebilir, işlem için temsilcinizle çalışabilirsiniz.</p>
                <a className="sec-link" href="/hizmetler" style={{ justifySelf: 'start' }}>Ürünlerin ayrıntıları</a>
              </div>
            </Reveal>
            <Reveal className="prods" stagger>
              {PRODUCTS.map(([h, t, d, tag, live]) => (
                <a key={h} className="prod" href={h}>
                  <div style={{ display: 'grid', gap: 10 }}><h3>{t}</h3><span className={`tag${live ? ' live' : ''}`}>{tag}</span></div>
                  <p>{d}</p>
                  <span className="go" aria-hidden="true"><Ico n="arrow" size={18} /></span>
                </a>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="sec" aria-labelledby="chT">
          <div className="wrap">
            <Reveal className="sec-head split"><h2 id="chT">Size uygun kanaldan işlem yapın</h2><p>Web, Android ve bildirimlerle e-şubeye nerede olursanız olun ulaşın.</p></Reveal>
            <Reveal delay={100}><Channels /></Reveal>
          </div>
        </section>

        <section className="sec tint" aria-labelledby="stT">
          <div className="wrap">
            <Reveal className="sec-head"><h2 id="stT">Hesap açıştan ilk emre dört adım</h2><p>Süreç baştan sona uygulama içinde ilerler; hangi aşamada olduğunuzu her zaman görürsünüz.</p></Reveal>
            <Steps>
              {STEPS.map(([t, d]) => (<li key={t}><h3>{t}</h3><p>{d}</p></li>))}
            </Steps>
            <Reveal style={{ marginTop: 44, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a className="btn primary" href="/kayit">Hesap aç</a>
              <a className="btn ghost" href="/sss">Sık sorulan sorular</a>
            </Reveal>
          </div>
        </section>

        <section className="sec demo" aria-labelledby="dmT">
          <div className="wrap demo-in">
            <Reveal className="demo-copy">
              <h2 id="dmT">Emir ekranı, vereceğiniz kararı sadeleştirir</h2>
              <p>Hisseyi, tutarı ve emir türünü seçersiniz. Komisyon ve BSMV dahil toplam, onay düğmesinin hemen üstünde görünür. Onayladığınızda emir iletilir; durumunu portföyünüzden izlersiniz.</p>
              <ul className="feat-list">
                <li><Ico n="check" /><span>Piyasa ve limit emri</span></li>
                <li><Ico n="check" /><span>Maliyet onaydan önce, kalem kalem</span></li>
                <li><Ico n="check" /><span>Bekleyen emri tek dokunuşla iptal</span></li>
              </ul>
              <div style={{ marginTop: 26 }}><a className="sec-link" href="/platform">Platformu keşfedin</a></div>
            </Reveal>
            <Reveal delay={150}><PhoneDemo /></Reveal>
          </div>
        </section>

        <section className="sec dark" aria-labelledby="tsT">
          <div className="wrap">
            <Reveal className="sec-head split">
              <h2 id="tsT">Güven, söylenenle değil işleyişle kurulur</h2>
              <p>Aşağıdaki her madde platformun gerçekte nasıl çalıştığını anlatır. Ayrıntılar için güvenlik sayfasına bakabilirsiniz.</p>
            </Reveal>
            <Reveal as="ul" className="trust trust-wrap" stagger>
              {TRUST.map(([i, t, d]) => (<li key={t}><Ico n={i} /><div><h3>{t}</h3><p>{d}</p></div></li>))}
            </Reveal>
            <p style={{ marginTop: 34 }}><a className="sec-link" href="/guvenlik">Güvenlik ve şeffaflık</a></p>
          </div>
        </section>

        <section className="sec" aria-labelledby="ccT">
          <div className="wrap cost">
            <Reveal>
              <div className="sec-head" style={{ marginBottom: 0 }}>
                <h2 id="ccT">Karar vermeden önce hesaplayın</h2>
                <p>Emir maliyetini, kâr ve zararı ve kur çevirisini önceden görün. Pay piyasasında işlem tutarının binde biri komisyon, komisyonun %5&apos;i kadar BSMV alınır.</p>
                <a className="sec-link" href="/araclar" style={{ justifySelf: 'start' }}>Tüm araçlar</a>
              </div>
            </Reveal>
            <Reveal delay={150}><Calculators /></Reveal>
          </div>
        </section>

        <section className="sec tint" aria-labelledby="ftT">
          <div className="wrap">
            <Reveal className="sec-head split"><h2 id="ftT">E-şube, işinize yarayan şeylerle dolu</h2><p>Gösteriş için değil, günlük kullanımda ihtiyaç duyulanlar için tasarlandı.</p></Reveal>
            <Reveal className="bento" stagger spot>
              {FEATURES.map(([i, t, d, c]) => (<div key={t} className={`bn ${c}`}><Ico n={i} /><h3>{t}</h3><p>{d}</p></div>))}
            </Reveal>
            <p style={{ marginTop: 28 }}><a className="sec-link" href="/platform">Platformu keşfedin</a></p>
          </div>
        </section>

        <section className="sec" aria-labelledby="blT">
          <div className="wrap">
            <Reveal className="sec-head split">
              <h2 id="blT">Yatırımcı rehberi</h2>
              <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}><p>Borsayı, emir türlerini, takası ve riski sade bir dille anlatan yazılar.</p><a className="sec-link" href="/blog">Tüm yazılar</a></div>
            </Reveal>
            <Reveal className="posts" stagger>
              {posts.map((p) => (
                <a key={p.slug} className="post" href={`/blog/${p.slug}`}>
                  <span className="cat">{p.category}</span><h3>{p.title}</h3><p>{p.excerpt}</p><span className="meta">{p.read} dk okuma</span>
                </a>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="warn-band" aria-label="Güvenlik uyarısı">
          <div className="wrap warn-in">
            <Ico n="shield" size={34} />
            <div><b>Dolandırıcılığa karşı dikkatli olun</b><p>Meridyen çalışanları sosyal medya, mesajlaşma uygulaması veya telefonla şifrenizi istemez, garantili kazanç vaat etmez ve kişisel bir hesaba para göndermenizi istemez. Para yatırma yalnızca e-şubede görünen sistem hesabına yapılır.</p></div>
            <a className="btn ghost sm" href="/guvenlik">Güvenlik rehberi</a>
          </div>
        </section>

        <section className="sec tint" aria-labelledby="fqT">
          <div className="wrap faq-wrap">
            <Reveal className="sticky"><div className="sec-head" style={{ marginBottom: 0 }}><h2 id="fqT">Aklınıza takılanlar</h2><p>Hesap, para ve emirlerle ilgili en çok sorulanlar.</p><a className="sec-link" href="/sss" style={{ justifySelf: 'start' }}>Tüm sorular</a></div></Reveal>
            <Reveal delay={120}><Faq items={FAQ.filter((x) => ['Nasıl hesap açabilirim?', 'Hesabım ne zaman onaylanır?', 'Para çekme için koşullar nelerdir?', 'Hangi emir türlerini kullanabilirim?', 'Komisyon ve vergiler ne kadar?', 'Fon, VİOP ve döviz alım satımı yapabilir miyim?'].includes(x.q))} /></Reveal>
          </div>
        </section>

        <section className="cta-band" aria-labelledby="ctaT">
          <div className="wrap">
            <h2 id="ctaT">Piyasada yönünüzü bulmaya hazır mısınız?</h2>
            <p>Hesabınızı birkaç dakikada oluşturun, kimliğinizi doğrulayın ve ilk emrinizi verin.</p>
            <div className="ctas"><a className="btn lime" href="/kayit">Hesap aç</a><a className="btn onDark" href="/iletisim">Bize yazın</a></div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
