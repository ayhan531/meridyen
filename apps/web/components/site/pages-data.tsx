import type { ReactNode } from 'react';

export const PAGES: Record<string, { title: string; lead: string; body: ReactNode | 'contact' }> = {
  kurumsal: {
    title: 'Hakkımızda',
    lead: 'Pay piyasasını izlemek, emir vermek ve portföyü takip etmek için tek bir sade uygulama.',
    body: (<>
      <h2>Yatırımcı odaklı yaklaşım</h2>
      <p>Meridyen Yatırım; piyasaları, emirlerinizi, hesap hareketlerinizi ve haberleri aynı ekranda toplar. Telefon, tablet ve bilgisayarda aynı hesabınıza erişirsiniz.</p>
      <h2>Şeffaf bilgi</h2>
      <p>Komisyon ve vergi, emri onaylamadan önce görünür. Fiyatlar canlı kaynaktan alınır; alım satım için fiyat doğrulanamıyorsa emir geçici olarak kapatılır.</p>
      <h2>Risk</h2>
      <p>Yatırım ürünleri risk içerir; yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Burada yer alan bilgiler yatırım danışmanlığı kapsamında değildir.</p>
    </>),
  },
  hizmetler: {
    title: 'Hizmetlerimiz',
    lead: 'Hedeflerinize ve risk tercihinize uygun yatırım seçeneklerini keşfedin.',
    body: (<>
      <h2>Borsa İstanbul</h2><p>Pay piyasasında hisse senedi alım satımı: limit ve piyasa emri, bekleyen emir takibi, T+2 takas bilgisi.</p>
      <h2>Yatırım fonları</h2><p>Canlı fon fiyatlarını izleyin. Fon alım satımı için müşteri temsilcinizle iletişime geçin.</p>
      <h2>Vadeli işlemler</h2><p>VİOP sözleşmelerini ve emtia fiyatlarını takip edin. İşlem için müşteri temsilcinizle iletişime geçin.</p>
      <h2>Döviz</h2><p>Anlık kurlar ve döviz çevirici. Döviz alım satımı için müşteri temsilcinizle iletişime geçin.</p>
      <p><a className="btn primary sm" href="/kayit">Hesap aç</a></p>
    </>),
  },
  ucretler: {
    title: 'Komisyon & Ücretler',
    lead: 'İşlem öncesinde maliyetlerinizi öğrenin.',
    body: (<>
      <h2>Pay piyasası</h2>
      <p>İşlem tutarı üzerinden binde 1 (%0,1) komisyon ve komisyon üzerinden %5 BSMV uygulanır. Tutar, emri onaylamadan önce kuruşu kuruşuna gösterilir.</p>
      <h2>Fon, vadeli işlem ve döviz</h2>
      <p>Koşullar ürüne ve sözleşmenize göre değişir; güncel oranlar için e-şubeye giriş yapın ya da müşteri temsilcinize danışın.</p>
      <p>Hesabınıza uygulanacak güncel koşullar sözleşmelerinizdeki hükümlere tabidir.</p>
    </>),
  },
  sss: {
    title: 'Sık Sorulan Sorular',
    lead: 'Hesap, para yatırma ve emirler hakkında kısa yanıtlar.',
    body: (<>
      <h2>Nasıl hesap açabilirim?</h2><p>Hesap aç sayfasında T.C. kimlik numaranız ve bilgilerinizle kayıt olun, uygulamadan kimlik belgenizin ön ve arka yüzünü yükleyin. Belgeler incelenince hesabınız onaylanır.</p>
      <h2>Para yatırma talebimi nasıl takip ederim?</h2><p>Hesap → İşlem geçmişi bölümünde talebiniz “Beklemede” görünür; onaylandığında bakiyenize eklenir. Havale açıklamasına talebin transfer kodunu yazın.</p>
      <h2>Emirlerimi nereden görebilirim?</h2><p>Portföy → Emirler bölümünde bekleyen, gerçekleşen ve iptal edilen emirleriniz listelenir.</p>
      <h2>T+2 bakiye ne anlama gelir?</h2><p>Satış tutarı işlem gününü izleyen ikinci iş gününde çekilebilir bakiyenize geçer.</p>
      <h2>Piyasa kapalıyken emir verebilir miyim?</h2><p>Seans dışında (hafta içi 10:00–18:00 dışı) yalnızca limit emir verilebilir.</p>
      <h2>Yatırımda kazanç garanti edilir mi?</h2><p>Hayır. Yatırım ürünleri risk içerir ve kayıp yaşanabilir.</p>
    </>),
  },
  sozlesmeler: {
    title: 'Sözleşmeler',
    lead: 'Sözleşmeler ve risk bildirimleri.',
    body: (<>
      <p>Hesabınıza ait sözleşmeleri, uygulamada Hesap → Sözleşmeler bölümünden görüntüleyebilirsiniz. İşlem yapmadan önce metinleri okuyun.</p>
      <p><a className="btn primary sm" href="/app#profile">Sözleşmelerime git</a> <a className="btn ghost sm" href="/kayit#aydinlatma">Aydınlatma metni</a></p>
    </>),
  },
  iletisim: { title: 'İletişim', lead: 'Sorularınız için bize yazın.', body: 'contact' },
};

