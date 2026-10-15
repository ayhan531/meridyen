/** Blog içerikleri: genel bilgilendirme amaçlıdır, yatırım tavsiyesi değildir. */
export interface Block { h?: string; p?: string[]; ul?: string[]; note?: string }
export interface Post { slug: string; title: string; excerpt: string; category: string; date: string; read: number; blocks: Block[] }

export const POSTS: Post[] = [
  {
    slug: 'borsa-istanbul-nedir-nasil-calisir', category: 'Temel Bilgiler', date: '2026-10-12', read: 6,
    title: 'Borsa İstanbul (BIST) Nedir, Nasıl Çalışır?',
    excerpt: 'Pay piyasasında emirlerin nasıl eşleştiğini, seans saatlerini ve fiyatın nasıl oluştuğunu sade bir dille anlatıyoruz.',
    blocks: [
      { p: ['Borsa İstanbul, halka açık şirketlerin paylarının ve diğer sermaye piyasası araçlarının düzenli, şeffaf ve denetimli bir ortamda alınıp satıldığı piyasadır. Şirketler halka arz yoluyla sermaye toplar; yatırımcılar da bu şirketlerin ortağı olma imkânı bulur.'] },
      { h: 'Fiyat nasıl oluşur?', p: ['Pay piyasasında alım ve satım emirleri elektronik bir sistemde toplanır ve fiyat-zaman önceliğine göre eşleştirilir. En yüksek fiyattan alış isteyen ile en düşük fiyattan satış isteyen karşılaştığında işlem gerçekleşir.', 'Seans boyunca ekranda gördüğünüz fiyat, o an için arz ile talebin buluştuğu son noktadır. Bu nedenle bir payın fiyatı gün içinde sürekli değişebilir.'] },
      { h: 'Seans saatleri', p: ['Pay piyasasında sürekli işlem hafta içi 10:00–18:00 arasında yapılır. Resmî tatillerde piyasa kapalıdır. Seans dışında verilen emirlerin türü ve geçerliliği aracı kurumun sistemine göre değişir; Meridyen’de seans kapalıyken yalnızca limit emir verilebilir.'] },
      { h: 'Kimler işlem yapabilir?', p: ['Borsada işlemler yetkili aracı kurumlar üzerinden yapılır. Yatırımcı, aracı kurumda hesap açar, kimlik doğrulamasını tamamlar, yatırım uygunluk anketini yanıtlar ve hesabına bakiye aktardıktan sonra emir iletir.'] },
      { h: 'Dikkat edilmesi gerekenler', ul: ['Fiyatlar yükselebileceği gibi düşebilir; sermayenizin bir kısmını ya da tamamını kaybedebilirsiniz.', 'Yalnızca kaybetmeyi göze alabileceğiniz tutarlarla işlem yapın.', 'Tek bir paya yoğunlaşmak yerine portföyünüzü çeşitlendirmeyi düşünün.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'limit-emir-piyasa-emri-farki', category: 'Emirler', date: '2026-10-10', read: 5,
    title: 'Limit Emir ve Piyasa Emri Arasındaki Fark',
    excerpt: 'Hangi emir türü ne zaman kullanılır? Fiyat kontrolü ile işlem hızı arasındaki dengeyi örneklerle açıklıyoruz.',
    blocks: [
      { p: ['Bir pay almak ya da satmak için iki temel emir türü kullanılır: limit emir ve piyasa emri. İkisi arasındaki fark, fiyatı kimin belirlediğidir.'] },
      { h: 'Limit emir', p: ['Limit emirde en fazla ödemeyi (alışta) ya da en az almayı (satışta) kabul ettiğiniz fiyatı siz belirlersiniz. Emir yalnızca bu fiyatta veya daha iyi bir fiyatta gerçekleşir.', 'Fiyat belirlediğiniz seviyeye gelmezse emir bekler. Bu nedenle limit emirde fiyat kontrolü sizdedir, ancak işlemin gerçekleşeceğinin garantisi yoktur.'] },
      { h: 'Piyasa emri', p: ['Piyasa emrinde fiyat belirtmezsiniz; emir, o anda piyasada bulunan en iyi fiyattan hemen işlenir. İşlem hızı yüksektir, ancak gerçekleşen fiyat ekranda gördüğünüz fiyattan farklı olabilir.'] },
      { h: 'Hangisini seçmeli?', ul: ['Belirli bir fiyattan işlem yapmak istiyorsanız limit emir kullanın.', 'Anında işlem önceliğinizse ve küçük fiyat farklarını kabul ediyorsanız piyasa emrini düşünün.', 'Seans kapalıyken Meridyen’de yalnızca limit emir verilebilir.'] },
      { h: 'Bekleyen emirler', p: ['Gerçekleşmemiş limit emirleriniz bekleyen durumda görünür. Dilediğiniz zaman Portföy → Emirler bölümünden iptal edebilirsiniz. Alış emirlerinde, emir tutarı bekleme süresince bakiyenizde ayrılır.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 't2-takas-nedir', category: 'Temel Bilgiler', date: '2026-10-08', read: 4,
    title: 'T+2 Takas Nedir? Satış Bedeli Ne Zaman Hesabınıza Geçer?',
    excerpt: 'Pay satışından sonra tutarın çekilebilir bakiyeye geçmesi için işlem gününü izleyen iki iş günü beklenir.',
    blocks: [
      { p: ['Takas, bir işlemin ödeme ve teslim yükümlülüklerinin yerine getirilmesidir. Pay piyasasında takas süresi T+2’dir: “T” işlem günü, “+2” ise işlem gününü izleyen iki iş günü anlamına gelir.'] },
      { h: 'Örnek', p: ['Pazartesi günü bir payı sattığınızı düşünün. Satış bedeli Çarşamba günü kullanılabilir bakiyenize geçer. Hafta sonu ve resmî tatiller iş günü sayılmaz.'] },
      { h: 'T+2 bakiye ne demektir?', p: ['Satış yaptıktan sonra henüz takası tamamlanmamış tutar “T+2 bakiye” olarak izlenir. Takas tamamlanınca bu tutar çekilebilir bakiyeye aktarılır.'] },
      { h: 'Alışlarda takas', p: ['Alınan paylar da aynı takas takvimine göre hesabınıza geçer. Portföyünüzde pozisyon olarak görünmesi, takasın tamamlanmasını beklemeden işlemin gerçekleştiğini gösterir.'], note: 'Takas kuralları mevzuata ve Takasbank/MKK uygulamalarına göre değişebilir; güncel bilgi için sözleşmelerinize bakın.' },
    ],
  },
  {
    slug: 'komisyon-ve-bsmv-nasil-hesaplanir', category: 'Maliyetler', date: '2026-10-06', read: 4,
    title: 'Komisyon ve BSMV Nasıl Hesaplanır?',
    excerpt: 'Pay alım satımında maliyetin iki parçası olan komisyon ve BSMV’yi örnek hesapla gösteriyoruz.',
    blocks: [
      { p: ['Her pay alım satım işleminde işlem tutarı üzerinden komisyon alınır; komisyon üzerinden de Banka ve Sigorta Muamele Vergisi (BSMV) hesaplanır. Meridyen’de pay piyasası komisyonu binde 1 (%0,1), BSMV ise komisyonun %5’idir.'] },
      { h: 'Formül', ul: ['Komisyon = İşlem tutarı × 0,001', 'BSMV = Komisyon × 0,05', 'Toplam maliyet = Komisyon + BSMV'] },
      { h: 'Örnek hesap', p: ['10.000 TL tutarında bir alım için komisyon 10,00 TL, BSMV 0,50 TL, toplam maliyet 10,50 TL olur. Alışta ödemeniz gereken tutar 10.010,50 TL’dir. Satışta ise hesabınıza geçen tutar işlem tutarından bu maliyetin düşülmesiyle bulunur.'] },
      { h: 'Emri onaylamadan önce görün', p: ['Meridyen’de emir onay ekranı; işlem tutarını, komisyonu, vergiyi ve ödenecek ya da hesaba geçecek toplamı gösterir. Böylece maliyeti işlem öncesinde bilirsiniz.'], note: 'Oranlar sözleşmenize göre değişebilir; geçerli koşullar için sözleşmelerinize bakın.' },
    ],
  },
  {
    slug: 'bist-100-endeksi-nasil-okunur', category: 'Piyasa Okuryazarlığı', date: '2026-10-04', read: 5,
    title: 'BIST 100 ve Diğer Endeksler Nasıl Okunur?',
    excerpt: 'Endeks nedir, neyi gösterir, BIST 30 ve BIST 100 arasındaki fark nedir? Yatırımcının bilmesi gereken temeller.',
    blocks: [
      { p: ['Endeks, belirli bir paylar grubunun genel performansını tek bir sayıyla özetleyen göstergedir. Piyasanın yönü hakkında hızlı bir fikir verir; ancak tek tek payların performansını göstermez.'] },
      { h: 'BIST 30 ve BIST 100', p: ['BIST 30, piyasa değeri ve işlem hacmi en yüksek 30 payı; BIST 100 ise 100 payı kapsar. Endekslerin bileşimi belirli aralıklarla gözden geçirilir.'] },
      { h: 'Sektör ve tematik endeksler', p: ['Bankacılık, sanayi, teknoloji gibi sektörleri ya da katılım ilkelerine uygun payları izleyen endeksler de vardır. Sektörel gelişmeleri değerlendirirken bu endekslere bakmak faydalıdır.'] },
      { h: 'Nasıl yorumlanır?', ul: ['Günlük yüzde değişim, endeksin bir önceki kapanışa göre ne kadar hareket ettiğini gösterir.', 'Endeks yükselirken tüm paylar yükselmek zorunda değildir.', 'Tek bir günün hareketinden çok, uzun dönemli eğilimlere bakmak daha sağlıklıdır.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'yatirim-fonlari-nedir', category: 'Ürünler', date: '2026-10-02', read: 5,
    title: 'Yatırım Fonları Nedir? Kimler İçin Uygundur?',
    excerpt: 'Profesyonel yönetilen fonların yapısı, çeşitleri ve fon seçerken bakılması gereken noktalar.',
    blocks: [
      { p: ['Yatırım fonu, birçok yatırımcının küçük tutarlarını bir havuzda toplayıp profesyonel portföy yöneticileri aracılığıyla çeşitli varlıklara yatıran kolektif bir yatırım aracıdır. Yatırımcı, fonun portföyündeki varlıklardan pay alır.'] },
      { h: 'Fon çeşitleri', ul: ['Para piyasası ve kısa vadeli borçlanma araçları fonları', 'Borçlanma araçları fonları', 'Hisse senedi fonları', 'Değişken ve karma fonlar', 'Altın ve diğer kıymetli maden fonları'] },
      { h: 'Fon seçerken', ul: ['Fonun yatırım stratejisini ve risk düzeyini okuyun.', 'Yönetim ücretini ve diğer masrafları karşılaştırın.', 'Geçmiş getirinin gelecekteki getiriyi garanti etmediğini unutmayın.', 'Fon izahnamesini ve kurucu belgelerini inceleyin.'] },
      { h: 'Meridyen’de fonlar', p: ['Uygulamadaki Piyasalar bölümünden fon fiyatlarını canlı izleyebilirsiniz. Fon alım satımı için müşteri temsilcinizle iletişime geçin.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'viop-nedir-vadeli-islemler', category: 'Ürünler', date: '2026-09-30', read: 5,
    title: 'VİOP Nedir? Vadeli İşlem ve Opsiyon Sözleşmelerine Giriş',
    excerpt: 'Vadeli işlem ve opsiyon piyasasının temel kavramları ve taşıdığı riskler.',
    blocks: [
      { p: ['Vadeli İşlem ve Opsiyon Piyasası (VİOP), belirli bir varlığın gelecekteki bir tarihte önceden belirlenen koşullarla alınıp satılmasına dayanan sözleşmelerin işlem gördüğü piyasadır. Dayanak varlık; endeks, döviz, altın, emtia ya da pay olabilir.'] },
      { h: 'Vadeli işlem sözleşmesi', p: ['Taraflar, dayanak varlığı ileri bir tarihte belirli bir fiyattan alıp satmayı taahhüt eder. Sözleşmeler genellikle teminat yatırılarak işlem görür.'] },
      { h: 'Opsiyon', p: ['Opsiyon, alıcısına belirli bir fiyattan alma (call) ya da satma (put) hakkı veren, ancak yükümlülük getirmeyen sözleşmedir. Bu hak için opsiyon primi ödenir.'] },
      { h: 'Riskler', ul: ['Kaldıraç etkisi kazancı olduğu kadar zararı da büyütür.', 'Zarar, yatırılan teminatı aşabilir.', 'Ürünü tam olarak anlamadan işlem yapılmamalıdır.'], note: 'Vadeli işlemler yüksek risk içerir. Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'portfoy-cesitlendirme-ve-risk-yonetimi', category: 'Strateji', date: '2026-09-28', read: 6,
    title: 'Portföy Çeşitlendirme ve Risk Yönetimi',
    excerpt: 'Tüm yumurtaları aynı sepete koymamak ne demek? Çeşitlendirmenin ve risk sınırlamanın temel ilkeleri.',
    blocks: [
      { p: ['Çeşitlendirme, yatırımı farklı varlıklara, sektörlere ve vadelere yayarak tek bir varlığın kötü performansının toplam portföye etkisini azaltma yaklaşımıdır. Riski ortadan kaldırmaz, ancak dağıtır.'] },
      { h: 'Çeşitlendirmenin boyutları', ul: ['Varlık sınıfı: pay, fon, tahvil, altın, döviz', 'Sektör: bankacılık, sanayi, enerji, perakende', 'Şirket: tek bir paya aşırı yoğunlaşmamak', 'Zaman: yatırımı tek seferde değil, parçalara bölerek yapmak'] },
      { h: 'Risk yönetimi ilkeleri', ul: ['İşlem öncesinde kaybetmeyi göze alabileceğiniz tutarı belirleyin.', 'Borçlanarak yatırım yapmaktan kaçının.', 'Duygusal kararlar yerine önceden belirlenmiş bir plan izleyin.', 'Portföyünüzü düzenli aralıklarla gözden geçirin.'] },
      { h: 'Yatırım uygunluk anketi', p: ['Hesap açılışında yanıtladığınız yatırım uygunluk anketi; deneyiminizi, vadenizi ve kayıp toleransınızı değerlendirerek risk profilinizi belirler. Ürün seçerken bu profili dikkate alın.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'temettu-kar-payi-nedir', category: 'Temel Bilgiler', date: '2026-09-26', read: 4,
    title: 'Temettü (Kâr Payı) Nedir?',
    excerpt: 'Şirketlerin ortaklarına dağıttığı kâr payının nasıl çalıştığını ve nelere dikkat edilmesi gerektiğini anlatıyoruz.',
    blocks: [
      { p: ['Temettü, bir şirketin elde ettiği kârın bir bölümünün ortaklarına dağıtılmasıdır. Dağıtım kararı şirketin genel kurulunda alınır; her yıl temettü dağıtılacağının garantisi yoktur.'] },
      { h: 'Temettü verimi', p: ['Temettü verimi, pay başına dağıtılan temettünün pay fiyatına oranıdır. Fiyat değiştikçe verim de değişir.'] },
      { h: 'Nelere dikkat edilmeli?', ul: ['Temettü dağıtımı, şirketin kârlılığına ve nakit durumuna bağlıdır.', 'Yüksek temettü verimi her zaman iyi bir yatırım anlamına gelmez.', 'Temettü tarihinden sonra pay fiyatında düzeltme görülebilir.', 'Vergi uygulaması mevzuata göre değişebilir.'], note: 'Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'halka-arz-nedir', category: 'Ürünler', date: '2026-09-24', read: 5,
    title: 'Halka Arz Nedir? Süreç Nasıl İşler?',
    excerpt: 'Şirketlerin paylarını ilk kez yatırımcıya sunma süreci ve halka arza katılmadan önce bilinmesi gerekenler.',
    blocks: [
      { p: ['Halka arz, bir şirketin paylarını ilk kez geniş yatırımcı kitlesine satışa sunmasıdır. Şirket bu yolla sermaye toplar; yatırımcı da şirkete ortak olma fırsatı bulur.'] },
      { h: 'Süreç', ul: ['Şirket, Sermaye Piyasası Kurulu’na (SPK) başvurur.', 'İzahname onaylanır ve kamuya açıklanır.', 'Talep toplama günlerinde yatırımcılar talepte bulunur.', 'Dağıtım yapılır ve paylar borsada işlem görmeye başlar.'] },
      { h: 'Dağıtım yöntemleri', p: ['Dağıtım, eşit dağıtım gibi izahnamede açıklanan yöntemlerle yapılır. Talep edilen tutar dağıtım sonucuna göre azalabilir ve artan tutar iade edilir.'] },
      { h: 'Katılmadan önce', ul: ['İzahnameyi ve fiyat tespit raporunu okuyun.', 'Halka arz fiyatının ilk işlem gününden sonra altında kalabileceğini unutmayın.', 'Talep süresini ve aracı kurumun işleyişini öğrenin.'], note: 'Halka arz talepleri için müşteri temsilcinizle iletişime geçin. Bu yazı yatırım tavsiyesi değildir.' },
    ],
  },
  {
    slug: 'fiyat-adimi-tavan-taban-nedir', category: 'Emirler', date: '2026-09-22', read: 4,
    title: 'Fiyat Adımı, Tavan ve Taban Fiyat Nedir?',
    excerpt: 'Emir fiyatını girerken karşılaşacağınız fiyat adımı ve günlük fiyat sınırlarını açıklıyoruz.',
    blocks: [
      { p: ['Pay piyasasında fiyatlar belirli adımlarla hareket eder ve gün içinde bir önceki kapanışa göre belirli bir bandın dışına çıkamaz.'] },
      { h: 'Fiyat adımı', p: ['Fiyat adımı, bir payın fiyatının değişebileceği en küçük tutardır. Pay fiyatı yükseldikçe fiyat adımı da büyür. Limit emirde girdiğiniz fiyatın geçerli bir fiyat adımına uyması gerekir.'] },
      { h: 'Tavan ve taban', p: ['Günlük fiyat değişim sınırı genellikle bir önceki kapanışın ±%10’udur. Üst sınıra “tavan”, alt sınıra “taban” denir. Meridyen’in Al · Sat ekranı, seçili payın tavan ve taban fiyatını gösterir.'], note: 'Fiyat sınırları ve fiyat adımları borsa düzenlemelerine göre değişebilir.' },
    ],
  },
];

export const bySlug = (s: string) => POSTS.find((p) => p.slug === s);
export const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
