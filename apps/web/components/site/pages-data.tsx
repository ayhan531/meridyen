import type { ReactNode } from 'react';
import CostCalculator from './CostCalculator';
import ContactForm from './ContactForm';
import Faq from './Faq';
import { MarketExplorer } from './MarketTable';
import { Ico } from './icons';
import { DOCS, FAQ } from '@/lib/site-content';

export interface PageDef {
  title: string; lead: string; desc?: string; crumb?: [string, string][];
  cta?: boolean; body: ReactNode;
}

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
          ['bell', 'Bildirimler', 'Emir ve para hareketlerinde uygulama içi ve tarayıcı bildirimi.', 'w3'],
          ['swap', 'Döviz çevirici', 'Canlı kurlarla farklı para birimleri arasında hızlı çeviri.', ''],
          ['user', 'Kimlik ve profil', 'Belge yükleme, profil fotoğrafı ve şifre değiştirme tek yerde.', ''],
          ['phone', 'Her cihazda', 'Telefon, tablet ve bilgisayarda aynı hesap; ekran boyutuna göre uyum sağlar.', ''],
        ].map(([i, t, d, c]) => (<div key={t} className={`bn ${c}`}><Ico n={i} /><h3>{t}</h3><p>{d}</p></div>))}
      </div>
      <div className="callout" style={{ marginTop: 28 }}>Fon, VİOP ve döviz alım satımı çevrim içi değildir; bu ürünler için müşteri temsilcinizle iletişime geçin.</div>
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
};
