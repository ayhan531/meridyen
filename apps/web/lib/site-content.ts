/** Genel sayfaların ortak içeriği (ana sayfa, SSS, sözleşmeler). */
export const FAQ: { g: string; q: string; a: string }[] = [
  { g: 'Hesap', q: 'Nasıl hesap açabilirim?', a: 'Hesap aç sayfasında T.C. kimlik numaranız ve bilgilerinizle kayıt olursunuz. Ardından uygulamadan kimlik belgenizin ön ve arka yüzünü yüklersiniz. Belgeler incelenip hesabınız onaylanınca alım satım açılır.' },
  { g: 'Hesap', q: 'Hesabıma nasıl giriş yaparım?', a: 'T.C. kimlik numaranız ve şifrenizle giriş yaparsınız. Şifrenizi unuttuysanız giriş sayfasındaki “Şifremi unuttum” bağlantısıyla yenileyebilirsiniz.' },
  { g: 'Hesap', q: 'Hesabım ne zaman onaylanır?', a: 'Kimlik belgelerinizin ön ve arka yüzü incelendikten sonra hesabınız onaylanır. Onay durumunuzu uygulamada görürsünüz; onaylanana kadar emir veremezsiniz.' },
  { g: 'Para', q: 'Para yatırma talebimi nasıl takip ederim?', a: 'Talebiniz Hesap → İşlem geçmişi bölümünde “Beklemede” görünür; onaylandığında bakiyenize eklenir. Havale açıklamasına talebin transfer kodunu yazın.' },
  { g: 'Para', q: 'Para çekme için koşullar nelerdir?', a: 'Para çekme yalnızca adınıza kayıtlı bir banka hesabına yapılır ve alt limit 500 TL’dir. Talebiniz kontrol edildikten sonra işleme alınır; bekleyen çekme talebini iptal edebilirsiniz.' },
  { g: 'Para', q: 'T+2 bakiye ne anlama gelir?', a: 'Satış tutarı, işlem gününü izleyen ikinci iş gününde çekilebilir bakiyenize geçer. Bu süre boyunca tutar “T+2” olarak ayrı gösterilir.' },
  { g: 'Emir', q: 'Hangi emir türlerini kullanabilirim?', a: 'Piyasa ve limit emri verebilirsiniz. Piyasa emri anında gerçekleşir, limit emri belirlediğiniz fiyata ulaşılınca gerçekleşir. Bekleyen emirleri Portföy → Emirler bölümünden iptal edebilirsiniz.' },
  { g: 'Emir', q: 'Piyasa kapalıyken emir verebilir miyim?', a: 'Seans dışında (hafta içi 10:00–18:00 dışında) yalnızca limit emir verilebilir; emir bir sonraki seansta değerlendirilir.' },
  { g: 'Emir', q: 'Komisyon ve vergiler ne kadar?', a: 'Pay piyasasında işlem tutarının binde biri (%0,1) komisyon ve komisyonun %5’i kadar BSMV uygulanır. Toplam tutar, emri onaylamadan önce kuruşu kuruşuna gösterilir.' },
  { g: 'Emir', q: 'Neden bazen emir veremiyorum?', a: 'Canlı fiyat doğrulanamadığında emirler güvenlik için geçici olarak kapatılır. Hesabınız henüz onaylanmadıysa da emir verilemez.' },
  { g: 'Ürünler', q: 'Fon, VİOP ve döviz alım satımı yapabilir miyim?', a: 'Bu ürünlerin fiyatlarını uygulamadan izleyebilirsiniz. Alım satım için müşteri temsilcinizle iletişime geçmeniz gerekir; şu anda çevrim içi emir yalnızca Borsa İstanbul payları içindir.' },
  { g: 'Güvenlik', q: 'Yatırımda kazanç garanti edilir mi?', a: 'Hayır. Yatırım ürünleri risk içerir; yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Sitedeki bilgiler yatırım danışmanlığı değildir.' },
];

export const DOCS: { t: string; s: string; p: string }[] = [
  { t: 'Çerçeve sözleşme', s: 'cerceve', p: 'Aracı kurum ile müşteri arasındaki hak ve yükümlülükleri, emir iletim kanallarını, ücret ve komisyonları ve hesabın işleyişini düzenler. Emirler müşterinin talimatı doğrultusunda iletilir; aracı kurum en iyi gerçekleştirme ilkesine göre hareket eder.' },
  { t: 'Genel risk bildirim formu', s: 'risk', p: 'Sermaye piyasası araçlarında yapılan işlemler kâr imkânının yanında zarar riski de taşır. Yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Kaldıraçlı ürünlerde zarar, yatırılan tutarı aşabilir.' },
  { t: 'Pay piyasası bilgilendirme formu', s: 'pay', p: "Pay piyasasında sürekli işlem hafta içi 10:00–18:00 arasındadır. Fiyat adımları pay fiyatına göre değişir; günlük fiyat değişim sınırı önceki kapanışın ±%10'udur. Takas işlem gününden iki iş günü sonra (T+2) gerçekleşir." },
  { t: 'Kişisel verilerin işlenmesi aydınlatma metni', s: 'kvkk', p: "Kimlik ve iletişim bilgileriniz hesabınızın açılması, işlemlerinizin yürütülmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir. 6698 sayılı Kanun'un 11. maddesindeki haklarınızı kullanabilirsiniz." },
];
