const COLS: [string, string[][]][] = [
  ['Ürünler', [['/hizmetler#pay', 'Pay piyasası'], ['/hizmetler#fon', 'Yatırım fonları'], ['/hizmetler#viop', 'VİOP'], ['/hizmetler#doviz', 'Döviz'], ['/hizmetler#emtia', 'Altın ve emtia'], ['/ucretler', 'Komisyon ve ücretler']]],
  ['Piyasalar', [['/piyasalar', 'Canlı piyasalar'], ['/haberler', 'Piyasa haberleri'], ['/araclar', 'Hesaplayıcılar'], ['/platform', 'Platform'], ['/blog', 'Yatırımcı rehberi']]],
  ['Destek', [['/hesap-acma', 'Hesap açma'], ['/destek', 'Destek merkezi'], ['/sss', 'Sık sorulan sorular'], ['/iletisim', 'İletişim'], ['/guvenlik', 'Güvenlik ve şeffaflık']]],
  ['Kurumsal ve yasal', [['/kurumsal', 'Hakkımızda'], ['/sozlesmeler', 'Sözleşmeler'], ['/kvkk', 'KVKK aydınlatma metni'], ['/risk-bildirimi', 'Risk bildirimi'], ['/gizlilik', 'Gizlilik ve çerezler'], ['/site-haritasi', 'Site haritası']]],
];

export default function SiteFooter() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-grid">
          <div className="ft-brand">
            <a className="brand" href="/"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
            <p>Piyasaları izleyin, emrinizi verin, portföyünüzü tek yerden takip edin. Maliyet işlemden önce, fiyat canlı kaynaktan.</p>
            <div className="ft-cta"><a className="btn lime sm" href="/kayit">Hesap aç</a><a className="btn onDark sm" href="/giris">Giriş yap</a></div>
          </div>
          {COLS.map(([t, ls]) => (
            <nav key={t} aria-label={t}>
              <h4>{t}</h4>
              <ul>{ls.map(([h, l]) => (<li key={h}><a href={h}>{l}</a></li>))}</ul>
            </nav>
          ))}
        </div>
        <div className="ft-warn"><b>Güvenlik uyarısı</b><p>Meridyen çalışanları şifrenizi istemez, garantili kazanç vaat etmez ve kişisel hesaba para göndermenizi istemez. Para yatırma yalnızca e-şubede görünen sistem hesabına yapılır.</p></div>
        <div className="ft-risk">
          <p>Burada yer alan bilgiler yatırım danışmanlığı kapsamında değildir. Sermaye piyasası araçlarında işlem yapmak, yatırdığınız tutarın bir kısmını ya da tamamını kaybetme riski taşır; geçmiş performans gelecekteki sonuçların göstergesi değildir. Yatırım kararınızı vermeden önce risk bildirimini okuyun.</p>
          <div className="row"><span>© {new Date().getFullYear()} Meridyen Yatırım. Tüm hakları saklıdır.</span><span>Fiyatlar canlı veri kaynağından alınır; gecikme veya kesinti olabilir.</span></div>
        </div>
      </div>
    </footer>
  );
}
