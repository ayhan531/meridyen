export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="risk">
          <p>Burada yer alan bilgiler yatırım danışmanlığı kapsamında değildir. Pay piyasası işlemleri, yatırdığınız tutarın bir kısmını ya da tamamını kaybetme riski taşır; geçmiş performans gelecekteki sonuçların göstergesi değildir.</p>
          <p>© {new Date().getFullYear()} Meridyen Yatırım · <a href="/kurumsal">Hakkımızda</a> · <a href="/hizmetler">Hizmetler</a> · <a href="/ucretler">Ücretler</a> · <a href="/blog">Blog</a> · <a href="/sss">SSS</a> · <a href="/iletisim">İletişim</a> · <a href="/sozlesmeler">Sözleşmeler</a></p>
        </div>
      </div>
    </footer>
  );
}
