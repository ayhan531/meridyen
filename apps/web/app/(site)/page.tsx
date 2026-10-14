import type { Metadata } from 'next';
import '@/styles/landing.css';
import CostCalculator from '@/components/site/CostCalculator';
import DevicePreview from '@/components/site/DevicePreview';
import MarketStatus from '@/components/site/MarketStatus';
import { IndexCards, MoversRows } from '@/components/site/MarketTables';
import SiteHeader from '@/components/site/SiteHeader';
import SkyImage from '@/components/site/SkyImage';

export const metadata: Metadata = {
  title: "Meridyen Yatırım — Borsa İstanbul'da hızlı ve sade alım satım",
  description: 'Meridyen Yatırım ile Borsa İstanbul paylarını izleyin, emir verin ve portföyünüzü tek ekrandan takip edin. Komisyon ve BSMV, onaydan önce görünür.',
  openGraph: { title: 'Meridyen Yatırım', description: "Borsa İstanbul'da emrinizi saniyeler içinde verin.", type: 'website', locale: 'tr_TR' },
};

export default function LandingPage() {
  return (
    <>
      <a className="skip" href="#icerik">İçeriğe geç</a>

      <SiteHeader />

      <main id="icerik">

        <section className="hero" aria-labelledby="heroTitle">
          <div className="wrap">
            <div className="hero-panel">
              <div className="hero-sky" aria-hidden="true"><SkyImage id="heroSky" /></div>
              <div className="hero-copy">
                <MarketStatus />
                <h1 id="heroTitle">Borsa İstanbul&apos;da emrinizi saniyeler içinde verin.</h1>
                <p className="lead">Piyasaları izlemek, emir vermek ve portföyünüzü takip etmek tek bir sade ekranda. Komisyon ve vergi, emri onaylamadan önce kuruşu kuruşuna görünür.</p>
                <div className="ctas">
                  <a className="btn lime" href="/kayit">Ücretsiz hesap aç</a>
                  <a className="btn onDark" href="/giris">Giriş yap</a>
                </div>
                <dl className="facts">
                  <div><dt>Pay alım satım komisyonu</dt><dd>%0,1 + BSMV</dd></div>
                  <div><dt>Seans saatleri</dt><dd className="num">10:00 – 18:00</dd></div>
                  <div><dt>Takas</dt><dd>T+2</dd></div>
                </dl>
              </div>
              <DevicePreview />
            </div>
          </div>
        </section>

        <section className="sec" id="piyasalar" aria-labelledby="mkTitle">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="mkTitle">Bugün piyasada</h2>
              <p>Endeksler, döviz ve altın bir bakışta; günün en çok hareket eden payları logolarıyla. Uygulamadaki Piyasalar bölümü aynı görünümü daha ayrıntılı sunar.</p>
            </div>
            <div className="mk">
              <IndexCards />
              <div className="card mtable">
                <table>
                  <caption>Günün hareketlileri<span>Günlük değişime göre en büyük beş hareket</span></caption>
                  <thead><tr><th scope="col">Pay</th><th scope="col" className="col-spark"><span className="sr">Gün içi grafik</span></th><th scope="col">Fiyat</th><th scope="col">Değişim</th></tr></thead>
                  <MoversRows />
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="sec tint" id="uygulama" aria-labelledby="tourTitle">
          <div className="wrap tour">
            <div className="sec-head">
              <h2 id="tourTitle">Dört bölüm, tek menü</h2>
              <p>Uygulamanın üst menüsünde dört bölüm var ve her biri tek bir işe odaklanır. Nerede olduğunuzu hep bilirsiniz.</p>
              <div className="ctas" style={{ marginTop: '26px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a className="btn primary" href="/kayit">Hesap aç</a>
                <a className="btn ghost" href="/giris">Giriş yap</a>
              </div>
            </div>
            <div className="tour-list">
              <article className="wcard">
                <span className="wtile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg></span>
                <div className="wtext"><b>Piyasalar</b><p>BIST 100, BIST 30, döviz, altın, fonlar ve tahviller. Arayın, sektöre göre süzün, liste ya da kart görünümüne geçin.</p></div>
                <span className="wart" aria-hidden="true"><svg viewBox="0 0 120 48" fill="none" width="120" height="48" aria-hidden="true"><path d="M2 40 L18 31 L30 35 L44 20 L58 26 L72 14 L88 18 L106 5" stroke="#2E8B6B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".9"/><circle cx="106" cy="5" r="4.5" fill="#1E4B41"/></svg></span>
              </article>
              <article className="wcard">
                <span className="wtile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M21 12h-9"/></svg></span>
                <div className="wtext"><b>Portföy</b><p>Elinizdeki paylar, ortalama maliyetiniz, kâr ve zararınız. Varlık dağılımını halka grafikte, sattıklarınızı ayrı listede görün.</p></div>
                <span className="wart" aria-hidden="true"><svg viewBox="0 0 120 48" width="120" height="48" aria-hidden="true"><rect x="40" y="30" width="18" height="18" rx="5" fill="#2F6B55"/><rect x="64" y="16" width="18" height="32" rx="5" fill="#8FA85C"/><rect x="88" y="6" width="18" height="42" rx="5" fill="#4E8F72"/></svg></span>
              </article>
              <article className="wcard">
                <span className="wtile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l-4-4 4-4M3 13h12M17 7l4 4-4 4M21 11H9"/></svg></span>
                <div className="wtext"><b>Al · Sat</b><p>Piyasa, limit ya da stop emri. Adedi ya da tutarı yazın veya bakiyenizin %25&apos;i, %50&apos;si, tamamı ile hızlıca doldurun.</p></div>
                <span className="wart" aria-hidden="true"><svg viewBox="0 0 120 48" width="120" height="48" aria-hidden="true"><rect x="18" y="4" width="70" height="24" rx="12" fill="#3E8E6A" opacity=".85"/><text x="53" y="21" fontSize="12" fontWeight="700" fill="#EAF6EF" textAnchor="middle" fontFamily="Manrope, sans-serif">Al</text><rect x="38" y="22" width="70" height="24" rx="12" fill="#1E4B41"/><text x="73" y="39" fontSize="12" fontWeight="700" fill="#CBDC6E" textAnchor="middle" fontFamily="Manrope, sans-serif">Sat</text></svg></span>
              </article>
              <article className="wcard">
                <span className="wtile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8z"/></svg></span>
                <div className="wtext"><b>Takip</b><p>İzlediğiniz paylar ve günün hareketlileri tek listede. Bir paya dokunun, grafiğine, derinliğine ve haberlerine geçin.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="sec" id="maliyet" aria-labelledby="costTitle">
          <div className="wrap cost">
            <div>
              <div className="sec-head" style={{ marginBottom: '0' }}>
                <h2 id="costTitle">Emri onaylamadan önce maliyeti görün</h2>
                <p>Uygulama, onay ekranında işlem tutarını, komisyonu ve BSMV&apos;yi ayrı ayrı gösterir. Aynı hesabı burada deneyebilirsiniz.</p>
              </div>
              <ul>
                <li><span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5L5 19"/></svg></span><span><b>Komisyon %0,1.</b> İşlem tutarı üzerinden, alışta ve satışta aynı oran.</span></li>
                <li><span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/></svg></span><span><b>BSMV komisyonun %5&apos;i.</b> Banka ve sigorta muameleleri vergisi yalnızca komisyona uygulanır.</span></li>
                <li><span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span><span><b>Takas T+2.</b> Paylar ya da satış tutarı, işlem gününden iki iş günü sonra hesabınıza geçer.</span></li>
              </ul>
            </div>
            <CostCalculator />
          </div>
        </section>

        <section className="sec tint" aria-labelledby="stepsTitle">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="stepsTitle">Hesap açmak üç adım</h2>
              <p>Formu doldurduğunuz anda müşteri numaranız oluşur ve uygulamaya geçersiniz.</p>
            </div>
            <ol className="steps">
              <li><b>Bilgilerinizi girin</b><p>Ad soyad, e-posta ve cep telefonu. Hepsi tek sayfada.</p></li>
              <li><b>Şifrenizi belirleyin</b><p>En az 8 karakter, harf ve rakam. Güç göstergesi yazarken yol gösterir.</p></li>
              <li><b>Müşteri numaranızı alın</b><p>Sonraki girişlerde müşteri numaranızı ya da e-postanızı kullanırsınız.</p></li>
            </ol>
          </div>
        </section>

        <section className="sec" id="sss" aria-labelledby="faqTitle">
          <div className="wrap faq">
            <div className="sec-head">
              <h2 id="faqTitle">Sık sorulanlar</h2>
              <p>Bulamadığınız bir soru varsa uygulamadaki Hesap &gt; Yardım ve destek bölümüne bakın.</p>
            </div>
            <div className="qa">
              <details><summary>Borsa hangi saatlerde açık?<span className="pm" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary>
                <p>Pay piyasasında sürekli işlem hafta içi 10:00 ile 18:00 arasındadır. Seans kapalıyken verdiğiniz limit emirler bir sonraki seansta işleme alınır.</p></details>
              <details><summary>Emirlerimde ne kadar komisyon öderim?<span className="pm" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary>
                <p>İşlem tutarının %0,1&apos;i kadar komisyon ve bu komisyonun %5&apos;i kadar BSMV. Örneğin ₺10.000&apos;lik bir alımda toplam ₺10,50 ödersiniz.</p></details>
              <details><summary>Hangi emir tiplerini kullanabilirim?<span className="pm" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary>
                <p>Piyasa, limit ve stop emri. Limit emirler için geçerlilik süresini Günlük ya da İptale Kadar Geçerli (İKG) olarak seçebilirsiniz. Bekleyen emirlerinizi Portföy &gt; Emirler&apos;den iptal edebilirsiniz.</p></details>
              <details><summary>Müşteri numaramı nereden bulurum?<span className="pm" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary>
                <p>Hesap açtığınızda ekranda gösterilir; uygulamada Hesap bölümünün en üstünde de yazar. Girişte müşteri numarası yerine e-posta adresinizi de kullanabilirsiniz.</p></details>
            </div>
          </div>
        </section>

        <section className="cta" aria-labelledby="ctaTitle">
          <div className="wrap">
            <div className="cta-panel">
              <div><h2 id="ctaTitle">İlk emrinizi bugün verin.</h2><p>Hesap açmak ücretsiz ve birkaç dakika sürer.</p></div>
              <div className="ctas">
                <a className="btn lime" href="/kayit">Ücretsiz hesap aç</a>
                <a className="btn onDark" href="/giris">Giriş yap</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a className="brand" href="/"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
              <p className="about">Pay piyasasında izleme, emir ve portföy takibini tek bir sade uygulamada toplar.</p>
            </div>
            <div><h3>Platform</h3><ul><li><a href="#piyasalar">Piyasalar</a></li><li><a href="#uygulama">Uygulama</a></li><li><a href="#maliyet">Maliyet</a></li></ul></div>
            <div><h3>Hesap</h3><ul><li><a href="/giris">Giriş yap</a></li><li><a href="/kayit">Hesap aç</a></li></ul></div>
            <div><h3>Yardım</h3><ul><li><a href="#sss">Sık sorulanlar</a></li><li><a href="/kayit#aydinlatma">Aydınlatma metni</a></li></ul></div>
          </div>
          <div className="risk">
            <p>Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Pay piyasası işlemleri, yatırdığınız tutarın bir kısmını ya da tamamını kaybetme riski taşır; geçmiş performans gelecekteki sonuçların göstergesi değildir.</p>
            <p>© {new Date().getFullYear()} Meridyen Yatırım</p>
          </div>
        </div>
      </footer>
    </>
  );
}
