import type { ReactNode } from 'react';
import CostCalculator from './CostCalculator';
import ContactForm from './ContactForm';
import Faq from './Faq';
import { MarketExplorer } from './MarketTable';
import Calculators from './Calculators';
import Channels from './Channels';
import NewsList from './NewsList';
import { Ico } from './icons';
import { DOCS, FAQ } from '@/lib/site-content';

export interface PageDef {
  title: string; lead: string; desc?: string; crumb?: [string, string][];
  cta?: boolean; body: ReactNode;
}

const GUIDES = (<><details id="hesap"><summary>Hesap nasıl açılır?</summary><div><ol className="guide"><li>Hesap aç sayfasında T.C. kimlik numaranız, iletişim bilgileriniz ve şifrenizle kayıt olun.</li><li>Yatırımcı profili sorularını yanıtlayın ve sözleşmeleri onaylayın.</li><li>E-şubede kimlik belgenizin ön ve arka yüzünün net fotoğrafını yükleyin.</li><li>Belgeleriniz incelendikten sonra hesabınız onaylanır; onaylanana kadar emir veremezsiniz.</li></ol></div></details><details id="yatirma"><summary>Para nasıl yatırılır?</summary><div><ol className="guide"><li>E-şubede para yatırma bölümünü açın ve tutarı girin.</li><li>Ekranda görünen sistem banka hesabına (IBAN) havale veya EFT yapın.</li><li>Açıklama alanına talebin transfer kodunu yazın.</li><li>Talebiniz “Beklemede” görünür; kontrol edilip onaylanınca tutar bakiyenize eklenir.</li></ol></div></details><details id="cekme"><summary>Para nasıl çekilir?</summary><div><ol className="guide"><li>E-şubede para çekme bölümünü açın.</li><li>Hesap sahibi adı, banka ve IBAN bilgisini girin. Hesap sizin adınıza kayıtlı olmalıdır.</li><li>Tutar en az 500 TL olmalıdır; çekilebilir bakiyeniz kadarını isteyebilirsiniz.</li><li>Talebiniz onaylanana kadar bekleyen çekme talebini iptal edebilirsiniz.</li></ol></div></details><details id="emir"><summary>Emir nasıl verilir?</summary><div><ol className="guide"><li>Hisseyi seçin ve Al veya Sat’a dokunun.</li><li>Piyasa ya da limit emri seçin; adedi ve limit emirde fiyatı girin.</li><li>Komisyon ve BSMV dahil toplamı kontrol edin.</li><li>Onaylayın. Piyasa emri anında gerçekleşir; limit emri fiyata ulaşılınca gerçekleşir.</li></ol></div></details><details id="iptal"><summary>Bekleyen emir nasıl iptal edilir?</summary><div><ol className="guide"><li>Portföy bölümünde Emirler sekmesini açın.</li><li>Bekleyen emrin üzerine dokunun.</li><li>İptal et’i seçip onaylayın; bloke edilen tutar serbest kalır.</li></ol></div></details><details id="sifre"><summary>Şifre nasıl değiştirilir veya yenilenir?</summary><div><ol className="guide"><li>Giriş yaptıysanız profil bölümünden mevcut şifrenizi ve yeni şifrenizi girerek değiştirin.</li><li>Şifrenizi unuttuysanız giriş sayfasındaki “Şifremi unuttum” bağlantısını kullanın.</li><li>Güvenliğiniz için şifrenizi kimseyle paylaşmayın.</li></ol></div></details><details id="ekle"><summary>Telefonun ana ekranına nasıl eklenir?</summary><div><ol className="guide"><li>Android / Chrome: tarayıcı menüsünden “Ana ekrana ekle”yi seçin.</li><li>iPhone / Safari: Paylaş simgesine dokunup “Ana Ekrana Ekle”yi seçin.</li><li>İsterseniz Android uygulamasını platform sayfasındaki bağlantıdan indirebilirsiniz.</li></ol></div></details></>);

const Check = ({ n }: { n?: boolean }) => <Ico n={n ? 'x' : 'check'} />;

export const PAGES: Record<string, PageDef> = {
  kurumsal: {
    title: 'Hakkımızda',
    lead: 'Meridyen, bir yerin konumunu belirleyen referans çizgisidir. Biz de yatırımcının piyasada yönünü bulabilmesi için net bir referans sunmayı hedefliyoruz.',
    cta: true,
    body: (<>
      <section className="pg"><div className="wrap split2">
        <div className="sticky"><h2 style={{ fontSize: 'var(--fs-h2)' }}>Neden bu platformu kurduk</h2></div>
        <div className="prose">
          <p>Pay piyasasına girmek isteyen biri çoğu zaman aynı engellerle karşılaşır: dağınık ekranlar, ancak işlemden sonra belli olan maliyetler, ne durumda olduğu anlaşılmayan talepler.</p>
          <p>Meridyen Yatırım bunların karşılığında üç şey vaat eder: fiyat ve maliyet işlemden önce görünür, hesabınızın ve taleplerinizin durumu her an izlenebilir, ürünün yapabildikleri ile yapamadıkları açıkça yazılır.</p>
          <p>Telefon, tablet veya bilgisayar fark etmez; aynı hesaba aynı sade arayüzle ulaşırsınız.</p>
        </div>
      </div></section>
      <section className="pg"><div className="wrap">
        <h2 style={{ fontSize: 'var(--fs-h2)', marginBottom: 28 }}>İlkelerimiz</h2>
        <div className="cols c3">
          <div className="tile"><Ico n="eye" /><h3>Önce şeffaflık</h3><p>Komisyon ve vergi kalemleri emir onaylanmadan görünür. Platformun desteklemediği bir ürünü varmış gibi göstermeyiz.</p></div>
          <div className="tile"><Ico n="shield" /><h3>Doğrulanmış veri</h3><p>Alım satım yalnızca canlı fiyat doğrulandığında açıktır. Veri kaynağı kesildiğinde emirler durur, eski fiyat kullanılmaz.</p></div>
          <div className="tile"><Ico n="user" /><h3>Kimliği bilinen hesap</h3><p>Her hesap kimlik belgesi incelemesinden geçer; para hareketleri bir onay adımından ilerler.</p></div>
        </div>
      </div></section>
      <section className="pg"><div className="wrap prose">
        <h2>Sorumluluğumuz ve sizin sorumluluğunuz</h2>
        <p>Yatırım ürünleri risk içerir; yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Bu sitedeki hiçbir içerik yatırım danışmanlığı değildir. Hesabınıza ilişkin tüm koşullar çerçeve sözleşme ve ekli formlarda yer alır; işlem yapmadan önce okumanızı öneririz.</p>
        <p><a href="/sozlesmeler">Sözleşmeleri okuyun</a> · <a href="/risk-bildirimi">Risk bildirimi</a></p>
      </div></section>
    </>),
  },

  hizmetler: {
    title: 'Ürünler ve hizmetler',
    lead: 'Borsa İstanbul paylarında çevrim içi işlem yapın; fon, vadeli işlem, döviz ve emtia fiyatlarını aynı yerden izleyin.',
    cta: true,
    body: (<div className="wrap">
      {[
        ['pay', 'Pay piyasası', 'Borsa İstanbul’da hisse senedi alım satımı doğrudan e-şubeden yapılır.', [['Piyasa ve limit emri verebilirsiniz.'], ['Bekleyen emirleri izler, istediğinizde iptal edersiniz.'], ['Satış bedeli T+2 takas bilgisiyle ayrı gösterilir.'], ['Seans dışında yalnızca limit emir verilebilir.']], 'Komisyon binde 1, BSMV komisyonun %5’i.'],
        ['fon', 'Yatırım fonları', 'Canlı fon fiyatlarını ve günlük değişimi izleyin.', [['Fon listesi ve fiyatları piyasalar sayfasında.'], ['Alım satım için müşteri temsilcinizle iletişime geçin.']], null],
        ['viop', 'Vadeli işlemler (VİOP)', 'VİOP sözleşmelerinin fiyatlarını takip edin.', [['Sözleşme listesi ve anlık değişim.'], ['İşlem için müşteri temsilcinizle iletişime geçin.'], ['Kaldıraçlı ürünlerde zarar yatırılan tutarı aşabilir.']], null],
        ['doviz', 'Döviz', 'Anlık kurlar ve yerleşik döviz çevirici.', [['USD/TRY, EUR/TRY ve diğer pariteler.'], ['E-şubede kurla anında çeviri yapın.'], ['Döviz alım satımı için müşteri temsilcinizle iletişime geçin.']], null],
        ['emtia', 'Altın ve emtia', 'Gram altın ve Brent petrol fiyatları piyasa panelinde canlı yer alır.', [['Gram altın (TL) ve Brent petrol (USD).'], ['Yalnızca izleme; işlem için temsilciye ulaşın.']], null],
      ].map(([id, t, d, items, fee]: any) => (
        <section key={id} id={id} className="psec">
          <div className="split2">
            <div className="sticky"><h2 style={{ fontSize: 'var(--fs-h2)' }}>{t}</h2><p className="mute" style={{ marginTop: 12, maxWidth: '40ch' }}>{d}</p></div>
            <div>
              <ul className="feat-list">{items.map((i: string[], k: number) => (<li key={k} className={/temsilci|Yalnızca/.test(i[0]) ? 'no' : ''}><Check n={/temsilci|Yalnızca/.test(i[0])} /><span>{i[0]}</span></li>))}</ul>
              {fee ? <div className="callout">{fee} <a href="/ucretler">Ayrıntılar</a></div> : null}
              <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn ghost sm" href="/piyasalar">Fiyatlara bak</a>
                {id !== 'pay' ? <a className="btn ghost sm" href="/iletisim">Temsilciyle görüşün</a> : <a className="btn primary sm" href="/kayit">Hesap aç</a>}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>),
  },

  ucretler: {
    title: 'Komisyon ve ücretler',
    lead: 'İşlem öncesinde maliyetinizi bilin. Pay piyasasında tüm kalemler iki satırdan ibarettir.',
    cta: true,
    body: (<>
      <section className="pg"><div className="wrap">
        <table className="fee">
          <thead><tr><th>Kalem</th><th>Pay piyasası</th></tr></thead>
          <tbody>
            <tr><td>Komisyon</td><td>İşlem tutarının binde 1’i (%0,1)</td></tr>
            <tr><td>BSMV</td><td>Komisyon tutarının %5’i</td></tr>
            <tr><td>Takas</td><td>T+2 (satış bedeli ikinci iş gününde çekilebilir)</td></tr>
            <tr><td>Para çekme alt limiti</td><td>500 TL</td></tr>
            <tr><td>Fon, VİOP ve döviz</td><td>Ürüne ve sözleşmenize göre; müşteri temsilcinizden öğrenin</td></tr>
          </tbody>
        </table>
        <p className="mute" style={{ marginTop: 14, fontSize: 14 }}>Havale ve EFT masrafları bankanızın tarifesine tabidir. Hesabınıza uygulanacak koşullar sözleşmelerinizdeki hükümlere bağlıdır.</p>
      </div></section>
      <section className="pg"><div className="wrap cost">
        <div className="prose"><h2>Örnek hesap</h2><p>10.000 ₺’lik bir alımda komisyon 10,00 ₺, BSMV 0,50 ₺ olur; ödenecek toplam 10.010,50 ₺’dir. Satışta aynı kalemler tutardan düşülür ve hesabınıza 9.989,50 ₺ geçer.</p><p>Kendi tutarınızı sağdaki hesaplayıcıyla deneyin. Uygulamadaki onay ekranı aynı hesabı kullanır.</p></div>
        <CostCalculator />
      </div></section>
    </>),
  },

  sss: {
    title: 'Sık sorulan sorular',
    lead: 'Hesap, para yatırma ve emirler hakkında kısa yanıtlar.',
    cta: true,
    body: (<div className="wrap pg">
      {['Hesap', 'Para', 'Emir', 'Ürünler', 'Güvenlik'].map((g) => (
        <section key={g} className="split2" style={{ marginBottom: 40 }}>
          <div className="sticky"><h2 style={{ fontSize: '1.6rem' }}>{({ Hesap: 'Hesap', Para: 'Para yatırma ve çekme', Emir: 'Emirler', Ürünler: 'Ürünler', Güvenlik: 'Risk' } as any)[g]}</h2></div>
          <Faq items={FAQ.filter((x) => x.g === g)} />
        </section>
      ))}
      <div className="callout">Aradığınızı bulamadınız mı? <a href="/iletisim">Bize yazın</a>; mesajınıza bir referans numarası verilir.</div>
    </div>),
  },

  sozlesmeler: {
    title: 'Sözleşmeler ve yasal metinler',
    lead: 'Hesap açılışında onayladığınız metinlerin özetleri. İşlem yapmadan önce okuyun.',
    body: (<div className="wrap pg"><div className="prose" style={{ maxWidth: 780 }}>
      <div className="faq">{DOCS.map((d) => (<details key={d.s} id={d.s}><summary>{d.t}</summary><div>{d.p}</div></details>))}</div>
      <p style={{ marginTop: 28 }}>Onayladığınız metinlere e-şubede <b>Hesap → Sözleşmeler</b> bölümünden her zaman ulaşabilirsiniz.</p>
      <p style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}><a className="btn primary sm" href="/kvkk">KVKK aydınlatma metni</a> <a className="btn ghost sm" href="/risk-bildirimi">Risk bildirimi</a></p>
    </div></div>),
  },

  iletisim: {
    title: 'İletişim',
    lead: 'Sorunuzu yazın; mesajınıza bir referans numarası verilir ve ekibimiz size dönüş yapar.',
    body: (<div className="wrap pg split2">
      <div className="prose">
        <h2>Size nasıl yardımcı olabiliriz?</h2>
        <ul>
          <li>Hesap açma ve kimlik doğrulama</li>
          <li>Para yatırma ve çekme talepleri</li>
          <li>Emirler ve portföy</li>
          <li>Fon, VİOP ve döviz işlemleri için temsilci görüşmesi</li>
          <li>Teknik destek</li>
        </ul>
        <div className="callout">E-şubeye giriş yaptıysanız <b>Yardım ve Destek</b> bölümünden de talep açabilir, taleplerinizin durumunu orada izleyebilirsiniz.</div>
        <p style={{ marginTop: 18 }}>Güvenliğiniz için şifrenizi veya kart bilgilerinizi hiçbir mesajda paylaşmayın; bizden asla istenmez.</p>
      </div>
      <ContactForm />
    </div>),
  },

  platform: {
    title: 'Platform',
    lead: 'Piyasa, emir, portföy ve para hareketleri; hepsi tek hesapta, her cihazda.',
    cta: true,
    body: (<div className="wrap pg">
      <div className="bento">
        {[
          ['chart', 'Canlı piyasa', 'Hisse, endeks, kur, fon, VİOP ve emtia fiyatları canlı kaynaktan akar. Listeleri arayıp sıralayabilirsiniz.', 'w4 big dk'],
          ['clock', 'Seans bilgisi', 'Borsanın açık olup olmadığı ve açılış/kapanışa kalan süre her zaman görünür.', 'w2 lm'],
          ['layers', 'Portföy', 'Pozisyonlar, maliyet, anlık değer ve kâr/zarar. Nakit ve T+2 bakiye ayrı gösterilir.', ''],
          ['list', 'Emirler', 'Piyasa ve limit emri, bekleyen emir listesi ve tek dokunuşla iptal.', ''],
          ['wallet', 'Para yatırma ve çekme', 'Talep oluşturun, durumunu izleyin; bekleyen çekme talebini iptal edin.', ''],
          ['doc', 'Hesap hareketleri', 'Tarih aralığı ve metinle filtrelenen tam işlem geçmişi.', 'w3'],
          ['bell', 'Bildirimler', 'Emir ve para hareketlerinde uygulama içi ve tarayıcı bildirimi.', 'w3 bildirim'],
          ['swap', 'Döviz çevirici', 'Canlı kurlarla farklı para birimleri arasında hızlı çeviri.', ''],
          ['user', 'Kimlik ve profil', 'Belge yükleme, profil fotoğrafı ve şifre değiştirme tek yerde.', ''],
          ['phone', 'Her cihazda', 'Telefon, tablet ve bilgisayarda aynı hesap; ekran boyutuna göre uyum sağlar.', ''],
        ].map(([i, t, d, c]) => (<div key={t} className={`bn ${c.replace(' bildirim', '')}`} id={c.includes('bildirim') ? 'bildirim' : undefined}><Ico n={i} /><h3>{t}</h3><p>{d}</p></div>))}
      </div>
      <div className="callout" style={{ marginTop: 28 }}>Fon, VİOP ve döviz alım satımı çevrim içi değildir; bu ürünler için müşteri temsilcinizle iletişime geçin.</div>
      <h2 id="kanallar" style={{ fontSize: 'var(--fs-h2)', margin: '64px 0 24px', scrollMarginTop: 100 }}>İşlem kanalları</h2>
      <Channels />
    </div>),
  },

  piyasalar: {
    title: 'Canlı piyasalar',
    lead: 'Borsa İstanbul hisseleri, fonlar, vadeli işlemler ve kurlar. Arayın, sıralayın, karşılaştırın.',
    cta: true,
    body: (<div className="wrap pg"><MarketExplorer /></div>),
  },

  guvenlik: {
    title: 'Güvenlik ve şeffaflık',
    lead: 'Hesabınızı ve paranızı korumak için platformun gerçekte nasıl çalıştığını açıkça yazıyoruz.',
    cta: true,
    body: (<>
      <section className="pg"><div className="wrap cols c2">
        {[
          ['user', 'Kimlik doğrulama', 'Giriş T.C. kimlik numarası ve şifreyle yapılır. Alım satım, kimlik belgenizin ön ve arka yüzü incelenip hesabınız onaylandıktan sonra açılır.'],
          ['wallet', 'Para hareketleri', 'Yatırma ve çekme talepleri kontrol edilir. Para çekme yalnızca adınıza kayıtlı banka hesabına yapılabilir; alt limit 500 TL’dir.'],
          ['globe', 'Fiyat doğrulama', 'Canlı fiyat kaynağı doğrulanamadığında emirler geçici olarak kapatılır. Eski veya tahmini fiyatla işlem yapılmaz.'],
          ['eye', 'Maliyet şeffaflığı', 'Komisyon ve BSMV onaydan önce gösterilir. Gerçekleşen her emir hesap geçmişinde kalemleriyle yer alır.'],
          ['bell', 'Bilgilendirme', 'Emir ve para hareketlerinde bildirim alırsınız; her işlem hesap hareketlerinde görünür.'],
          ['lock', 'Bağlantı ve oturum', 'Site ve e-şube HTTPS ile sunulur. Çıkış yaptığınızda oturum kapanır; şifrenizi e-şubeden istediğiniz an değiştirebilirsiniz.'],
        ].map(([i, t, d]) => (<div key={t} className="tile"><Ico n={i} /><h3>{t}</h3><p>{d}</p></div>))}
      </div></section>
      <section className="pg"><div className="wrap prose">
        <div className="callout" style={{ marginTop: 0, marginBottom: 32 }}><b>Dolandırıcılık uyarısı.</b> Meridyen çalışanları sosyal medya, mesajlaşma uygulaması veya telefonla şifrenizi istemez; “garantili kazanç” vaat etmez; kişisel bir hesaba para göndermenizi istemez. Para yatırma yalnızca e-şubede görünen sistem hesabına yapılır. Şüpheli bir durumda işlemi durdurun ve <a href="/iletisim">bize yazın</a>.</div>
        <h2>Sizden beklediklerimiz</h2>
        <ul>
          <li>Şifrenizi kimseyle paylaşmayın; Meridyen çalışanları şifrenizi asla istemez.</li>
          <li>Güçlü ve başka yerde kullanmadığınız bir şifre seçin.</li>
          <li>Ortak kullanılan cihazlarda işiniz bitince çıkış yapın.</li>
          <li>Adresin <b>meridyen-1.onrender.com</b> veya resmî alan adımız olduğundan emin olun; şüpheli bağlantılara tıklamayın.</li>
          <li>Şüpheli bir işlem görürseniz hemen <a href="/iletisim">bize yazın</a>.</li>
        </ul>
        <div className="callout">Kişisel verilerinizin nasıl işlendiğini <a href="/kvkk">aydınlatma metninde</a> bulabilirsiniz.</div>
      </div></section>
    </>),
  },

  kvkk: {
    title: 'KVKK aydınlatma metni',
    lead: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinizin nasıl işlendiği.',
    crumb: [['/sozlesmeler', 'Sözleşmeler']],
    body: (<div className="wrap pg"><div className="prose">
      <h2>Veri sorumlusu</h2>
      <p>Kişisel verileriniz, Meridyen Yatırım tarafından veri sorumlusu sıfatıyla aşağıda açıklanan kapsamda işlenir.</p>
      <h2>İşlenen veriler</h2>
      <ul>
        <li>Kimlik: ad soyad, T.C. kimlik numarası, doğum bilgileri, kimlik belgesi görüntüleri</li>
        <li>İletişim: e-posta, telefon, adres</li>
        <li>Müşteri işlemi: emirler, bakiye, para yatırma/çekme talepleri, banka hesap bilgisi</li>
        <li>Yatırımcı profili: uygunluk ve yerindelik değerlendirme yanıtları</li>
        <li>İşlem güvenliği: oturum ve cihaz kayıtları, IP adresi</li>
      </ul>
      <h2>İşleme amaçları ve hukuki sebepler</h2>
      <p>Verileriniz; hesabın açılması ve yürütülmesi, kimlik doğrulama, emirlerin iletilmesi, para hareketlerinin işlenmesi, yasal yükümlülüklerin yerine getirilmesi ve işlem güvenliğinin sağlanması amaçlarıyla; sözleşmenin kurulması ve ifası, hukuki yükümlülük ve meşru menfaat hukuki sebeplerine dayanılarak işlenir.</p>
      <h2>Aktarım</h2>
      <p>Verileriniz, mevzuatın gerektirdiği hâllerde yetkili kurum ve kuruluşlara ve hizmetin yürütülmesi için zorunlu iş ortaklarına, amaçla sınırlı olarak aktarılabilir.</p>
      <h2>Saklama süresi</h2>
      <p>Verileriniz, ilgili mevzuatta öngörülen süreler boyunca saklanır ve sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.</p>
      <h2>Haklarınız</h2>
      <p>Kanun’un 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı kişileri öğrenme ve zarara uğramanız hâlinde tazminat talep etme haklarına sahipsiniz. Başvurularınızı <a href="/iletisim">iletişim formu</a> üzerinden iletebilirsiniz.</p>
      <div className="callout">Bu metin genel bilgilendirme amaçlıdır; hesap açılışında onayladığınız aydınlatma metni esas alınır.</div>
    </div></div>),
  },

  'risk-bildirimi': {
    title: 'Risk bildirimi',
    lead: 'Yatırım yapmadan önce bilmeniz gereken başlıca riskler.',
    crumb: [['/sozlesmeler', 'Sözleşmeler']],
    body: (<div className="wrap pg"><div className="prose">
      <div className="callout" style={{ marginTop: 0 }}>Yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Geçmiş performans gelecekteki sonuçların göstergesi değildir ve bu sitedeki içerik yatırım danışmanlığı değildir.</div>
      <h2>Piyasa riski</h2><p>Hisse fiyatları şirkete, sektöre ve genel ekonomik koşullara bağlı olarak hızla değişebilir. Fiyat düşüşlerinde zarar edebilirsiniz.</p>
      <h2>Likidite riski</h2><p>Her pay aynı derinlikte işlem görmez. Düşük işlem hacimli paylarda istediğiniz fiyattan alım veya satım yapmak zor olabilir.</p>
      <h2>Fiyat limitleri ve seans</h2><p>Pay piyasasında günlük fiyat değişim sınırı önceki kapanışın ±%10’udur. Sürekli işlem hafta içi 10:00–18:00 arasındadır; seans dışında verilen limit emirler bir sonraki seansta değerlendirilir ve gerçekleşmeyebilir.</p>
      <h2>Takas riski</h2><p>Takas işlem gününden iki iş günü sonra (T+2) gerçekleşir. Satış bedeli bu süre dolmadan çekilebilir bakiyenize geçmez.</p>
      <h2>Kur riski</h2><p>Döviz cinsinden ürünlerde ve kurla ilişkili varlıklarda kur hareketleri getirinizi olumlu veya olumsuz etkileyebilir.</p>
      <h2>Kaldıraçlı ürünler</h2><p>Vadeli işlemler gibi kaldıraçlı ürünlerde zarar yatırılan tutarı aşabilir.</p>
      <h2>Teknik riskler</h2><p>İnternet bağlantısı, cihaz veya veri kaynağı kaynaklı kesintiler emirlerin gecikmesine ya da iletilememesine yol açabilir. Canlı fiyat doğrulanamadığında emirler geçici olarak kapatılır.</p>
      <p style={{ marginTop: 24 }}><a href="/sozlesmeler">Sözleşmeler ve formlar</a></p>
    </div></div>),
  },

  araclar: {
    title: 'Yatırım araçları',
    lead: 'Emir maliyetini, kâr ve zararı ve kur çevirisini önceden hesaplayın.',
    body: (<div className="wrap pg">
      <div className="split2">
        <div className="sticky prose"><h2 id="maliyet">Hesaplayıcılar</h2><p>Hesaplar, pay piyasası komisyonu (%0,1) ve BSMV (komisyonun %5’i) ile yapılır; e-şubedeki onay ekranı aynı formülü kullanır.</p><p>Kurlar canlı veri kaynağından alınır ve bilgilendirme amaçlıdır.</p><div className="callout"><span id="doviz" /><span id="kar" />Sonuçlar tahmindir ve yatırım tavsiyesi değildir.</div></div>
        <Calculators />
      </div>
    </div>),
  },

  haberler: {
    title: 'Piyasa haberleri',
    lead: 'Güncel ekonomi ve piyasa haberleri. Kaynak sayfaları yeni sekmede açılır.',
    cta: true,
    body: (<div className="wrap pg"><NewsList limit={40} full /><p className="mute" style={{ marginTop: 18, fontSize: 13.5 }}>Haberler üçüncü taraf kaynaklardan derlenir; Meridyen içeriklerin doğruluğundan sorumlu değildir ve haberler yatırım tavsiyesi değildir.</p></div>),
  },

  destek: {
    title: 'Destek merkezi',
    lead: 'En sık yapılan işlemler için adım adım rehberler. Aradığınızı bulamazsanız bize yazın.',
    body: (<div className="wrap pg">
      <div className="cols c3" style={{ marginBottom: 40 }}>
        <a className="tile" href="/hesap-acma"><Ico n="user" /><h3>Hesap açma</h3><p>Gerekenler, süreç ve onay.</p></a>
        <a className="tile" href="#yatirma"><Ico n="wallet" /><h3>Para işlemleri</h3><p>Yatırma, çekme ve talep takibi.</p></a>
        <a className="tile" href="#emir"><Ico n="chart" /><h3>Emirler</h3><p>Emir verme ve iptal etme.</p></a>
      </div>
      <div className="split2">
        <div className="sticky"><h2 style={{ fontSize: 'var(--fs-h2)' }}>Nasıl yapılır?</h2><p className="mute" style={{ marginTop: 12, maxWidth: '36ch' }}>Her başlığı açarak adımları görün.</p></div>
        <div className="faq">{GUIDES}</div>
      </div>
      <div className="callout" style={{ marginTop: 40 }}>Başka bir konuda yardıma mı ihtiyacınız var? <a href="/iletisim">İletişim formunu</a> doldurun; mesajınıza referans numarası verilir. <a href="/sss">Sık sorulan sorulara</a> da göz atın.</div>
    </div>),
  },

  'hesap-acma': {
    title: 'Hesap açma',
    lead: 'Kayıttan ilk emre kadar neye ihtiyacınız olduğunu ve sürecin nasıl ilerlediğini görün.',
    cta: true,
    body: (<>
      <section className="pg"><div className="wrap cols c2">
        <div className="tile"><Ico n="doc" /><h3>Hazırlamanız gerekenler</h3><ul><li>T.C. kimlik numaranız</li><li>Cep telefonu ve e-posta adresiniz</li><li>Kimlik belgenizin ön ve arka yüzünün net fotoğrafı</li><li>Para yatırma için adınıza kayıtlı bir banka hesabı</li></ul></div>
        <div className="tile dk"><Ico n="shield" /><h3>Neden kimlik doğrulama?</h3><p>Her hesap, kimlik belgesi incelendikten sonra onaylanır. Bu, hem sizi hem hesabınızı korur; onaylanmamış hesaplarda alım satım açılmaz.</p></div>
      </div></section>
      <section className="pg"><div className="wrap">
        <h2 style={{ fontSize: 'var(--fs-h2)', marginBottom: 28 }}>Süreç</h2>
        <div className="cols c2">
          <div className="tile"><h3>1. Kayıt</h3><p>Bilgilerinizi girin, yatırımcı profili sorularını yanıtlayın, risk bildirimi ve sözleşmeleri onaylayın. Kayıttan sonra e-şubeye otomatik giriş yaparsınız.</p></div>
          <div className="tile"><h3>2. Belge yükleme</h3><p>Kimlik belgenizin ön ve arka yüzünü yükleyin. Fotoğrafın net, aydınlık ve kenarları görünür olması incelemeyi hızlandırır.</p></div>
          <div className="tile"><h3>3. Onay</h3><p>Belgeleriniz incelenir. Onay durumunuzu e-şubede görürsünüz; sonuç hesabınızda bildirilir.</p></div>
          <div className="tile"><h3>4. Bakiye ve ilk emir</h3><p>Para yatırma talebi oluşturun, onaylanınca bakiyeniz görünür. Ardından hisseyi seçip emrinizi verin.</p></div>
        </div>
        <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}><a className="btn primary" href="/kayit">Hesap aç</a><a className="btn ghost" href="/destek">Destek merkezi</a></div>
      </div></section>
      <section className="pg"><div className="wrap split2"><div className="sticky"><h2 style={{ fontSize: 'var(--fs-h2)' }}>Sık sorulanlar</h2></div><Faq items={FAQ.filter((x) => x.g === 'Hesap')} /></div></section>
    </>),
  },

  gizlilik: {
    title: 'Gizlilik ve çerezler',
    lead: 'Hangi verileri, neden ve ne kadar süreyle kullandığımızı açıkça yazıyoruz.',
    crumb: [['/sozlesmeler', 'Sözleşmeler']],
    body: (<div className="wrap pg"><div className="prose">
      <h2>Çerezler ve cihazda saklanan veriler</h2>
      <ul>
        <li><b>Oturum çerezi (meridyen_sid):</b> Giriş yaptığınızda oturumunuzu sürdürmek için kullanılır. Hizmetin çalışması için zorunludur; çıkış yaptığınızda sona erer.</li>
        <li><b>Cihazda saklanan tercihler:</b> Tema, son görüntülediğiniz sekme gibi tercihler tarayıcınızın yerel depolamasında tutulur ve sunucuya gönderilmez.</li>
        <li>Reklam veya üçüncü taraf takip çerezi kullanmıyoruz.</li>
      </ul>
      <h2>Kişisel veriler</h2>
      <p>Hesap açılışı ve işlemler için topladığımız veriler <a href="/kvkk">KVKK aydınlatma metninde</a> açıklanmıştır.</p>
      <h2>Bildirimler</h2>
      <p>Tarayıcı bildirimlerini yalnızca siz izin verirseniz göndeririz ve e-şubeden istediğiniz zaman kapatabilirsiniz.</p>
      <h2>İletişim formu</h2>
      <p>Formda paylaştığınız bilgiler yalnızca talebinizi yanıtlamak için kullanılır. Şifrenizi veya kart bilgilerinizi mesajlarda paylaşmayın.</p>
    </div></div>),
  },

  'site-haritasi': {
    title: 'Site haritası',
    lead: 'Meridyen Yatırım’daki tüm sayfalar.',
    body: (<div className="wrap pg cols c3">
      {[
        ['Ürünler', [['/hizmetler', 'Ürünler ve hizmetler'], ['/ucretler', 'Komisyon ve ücretler'], ['/piyasalar', 'Canlı piyasalar'], ['/haberler', 'Piyasa haberleri'], ['/araclar', 'Yatırım araçları']]],
        ['Platform ve destek', [['/platform', 'Platform'], ['/hesap-acma', 'Hesap açma'], ['/destek', 'Destek merkezi'], ['/sss', 'Sık sorulan sorular'], ['/blog', 'Yatırımcı rehberi'], ['/iletisim', 'İletişim']]],
        ['Kurumsal ve yasal', [['/kurumsal', 'Hakkımızda'], ['/guvenlik', 'Güvenlik ve şeffaflık'], ['/sozlesmeler', 'Sözleşmeler'], ['/kvkk', 'KVKK aydınlatma metni'], ['/risk-bildirimi', 'Risk bildirimi'], ['/gizlilik', 'Gizlilik ve çerezler']]],
        ['Hesap', [['/giris', 'Giriş yap'], ['/kayit', 'Hesap aç'], ['/app', 'E-şube']]],
      ].map(([t, ls]: any) => (<div key={t} className="tile"><h3>{t}</h3><ul>{ls.map(([h, l]: string[]) => (<li key={h}><a href={h}>{l}</a></li>))}</ul></div>))}
    </div>),
  },
};
