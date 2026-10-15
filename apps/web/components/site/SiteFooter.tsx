const COLS: [string, string[][]][] = [
  ['Ürünler', [['/hizmetler#pay', 'Pay piyasası'], ['/hizmetler#fon', 'Yatırım fonları'], ['/hizmetler#viop', 'VİOP'], ['/hizmetler#doviz', 'Döviz'], ['/hizmetler#emtia', 'Altın ve emtia']]],
  ['Platform', [['/piyasalar', 'Canlı piyasalar'], ['/platform', 'Platform özellikleri'], ['/ucretler', 'Komisyon ve ücretler'], ['/blog', 'Blog']]],
  ['Kurumsal', [['/kurumsal', 'Hakkımızda'], ['/guvenlik', 'Güvenlik ve şeffaflık'], ['/sss', 'Sık sorulan sorular'], ['/iletisim', 'İletişim']]],
  ['Yasal', [['/sozlesmeler', 'Sözleşmeler'], ['/kvkk', 'KVKK aydınlatma metni'], ['/risk-bildirimi', 'Risk bildirimi']]],
];

export default function SiteFooter() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-grid">
          <div className="ft-brand">
            <a className="brand" href="/"><span className="logo">M</span><span><b>Meridyen Yatırım</b><small>Borsa İstanbul işlem platformu</small></span></a>
            <p>Piyasaları izleyin, emrinizi verin, portföyünüzü tek yerden takip edin. Maliyet işlemden önce, fiyat canlı kaynaktan.</p>
            <p style={{ marginTop: 18 }}><a href="/giris">Giriş yap</a> · <a href="/kayit">Hesap aç</a></p>
          </div>
          {COLS.map(([t, ls]) => (
            <nav key={t} aria-label={t}>
              <h4>{t}</h4>
              <ul>{ls.map(([h, l]) => (<li key={h}><a href={h}>{l}</a></li>))}</ul>
            </nav>
          ))}
        </div>
        <div className="ft-risk">
          <p>Burada yer alan bilgiler yatırım danışmanlığı kapsamında değildir. Sermaye piyasası araçlarında işlem yapmak, yatırdığınız tutarın bir kısmını ya da tamamını kaybetme riski taşır; geçmiş performans gelecekteki sonuçların göstergesi değildir. Yatırım kararınızı vermeden önce risk bildirimini okuyun.</p>
          <div className="row"><span>© {new Date().getFullYear()} Meridyen Yatırım. Tüm hakları saklıdır.</span><span>Fiyatlar canlı veri kaynağından alınır; gecikme veya kesinti olabilir.</span></div>
        </div>
      </div>
    </footer>
  );
}
