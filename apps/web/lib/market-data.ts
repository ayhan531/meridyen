/** Piyasa açılış verisi, haberler ve logolar (uygulama ve tanıtım sayfası ortak kullanır). */
export interface Stock {
  s: string; n: string; sec: string; p: number; c: number; vol: string; mc: string; pe: string; pb: string; div: string;
  low52: number; high52: number; o: number; pc: number;
  /** canlı fiyatla güncellenen alanlar */
  hi?: number; lo?: number; prev?: number;
}
export interface Index { n: string; v: string; c: number; _pre?: string; _n?: number; _d?: number; _pc?: number }

export const IMG_BASE = '/img/';
export const COLORS: string[] = ['#1E4B41','#28604F','#5B7F3A','#8A6B2B','#3E5C8A','#6B4E8A','#2B6F7A','#A0522D','#556B2F','#7A3E5C'];
export const STOCKS: Stock[] = [
 {s:'THYAO',n:'Türk Hava Yolları',sec:'Ulaştırma',p:312.50,c:2.38,vol:'4,21 Mr',mc:'431,3 Mr',pe:'4,9',pb:'1,4',div:'—',low52:212.4,high52:338.9,o:305.25,pc:305.25},
 {s:'ASELS',n:'Aselsan Elektronik',sec:'Savunma',p:121.80,c:-1.14,vol:'2,87 Mr',mc:'555,4 Mr',pe:'34,2',pb:'6,1',div:'%0,3',low52:58.1,high52:131.6,o:123.2,pc:123.2},
 {s:'KCHOL',n:'Koç Holding',sec:'Holding',p:236.40,c:0.94,vol:'1,66 Mr',mc:'599,5 Mr',pe:'8,7',pb:'1,2',div:'%1,8',low52:141.5,high52:246.0,o:234.6,pc:234.2},
 {s:'BIMAS',n:'BİM Birleşik Mağazalar',sec:'Perakende',p:548.00,c:1.67,vol:'1,12 Mr',mc:'332,7 Mr',pe:'17,4',pb:'5,9',div:'%1,1',low52:412.0,high52:571.5,o:540.5,pc:539.0},
 {s:'SISE',n:'Şişecam',sec:'Sanayi',p:52.15,c:-0.48,vol:'0,98 Mr',mc:'159,7 Mr',pe:'21,3',pb:'0,9',div:'%1,4',low52:34.8,high52:56.2,o:52.6,pc:52.4},
 {s:'EREGL',n:'Ereğli Demir Çelik',sec:'Metal',p:55.70,c:3.15,vol:'2,04 Mr',mc:'194,9 Mr',pe:'—',pb:'1,0',div:'—',low52:38.6,high52:58.1,o:54.1,pc:54.0},
 {s:'GARAN',n:'Garanti BBVA',sec:'Banka',p:152.30,c:1.26,vol:'3,44 Mr',mc:'639,7 Mr',pe:'6,8',pb:'1,9',div:'%2,2',low52:98.2,high52:159.8,o:150.6,pc:150.4},
 {s:'AKBNK',n:'Akbank',sec:'Banka',p:74.85,c:-0.66,vol:'2,31 Mr',mc:'389,2 Mr',pe:'7,4',pb:'1,5',div:'%1,9',low52:44.9,high52:79.4,o:75.4,pc:75.35},
 {s:'TUPRS',n:'Tüpraş',sec:'Enerji',p:188.90,c:0.32,vol:'1,49 Mr',mc:'363,9 Mr',pe:'9,1',pb:'2,3',div:'%5,6',low52:128.0,high52:201.7,o:188.2,pc:188.3},
 {s:'FROTO',n:'Ford Otosan',sec:'Otomotiv',p:1142.00,c:-2.05,vol:'0,73 Mr',mc:'400,8 Mr',pe:'11,8',pb:'4,7',div:'%3,4',low52:812.5,high52:1210.0,o:1160.0,pc:1165.9},
 {s:'ISCTR',n:'Türkiye İş Bankası (C)',sec:'Banka',p:14.62,c:1.05,vol:'3,08 Mr',mc:'365,5 Mr',pe:'5,9',pb:'1,1',div:'%2,6',low52:9.84,high52:15.40,o:14.50,pc:14.47},
 {s:'YKBNK',n:'Yapı ve Kredi Bankası',sec:'Banka',p:34.90,c:-0.43,vol:'1,94 Mr',mc:'294,8 Mr',pe:'6,2',pb:'1,3',div:'%1,7',low52:22.10,high52:37.60,o:35.00,pc:35.05},
 {s:'SAHOL',n:'Sabancı Holding',sec:'Holding',p:104.70,c:0.86,vol:'1,37 Mr',mc:'213,6 Mr',pe:'7,3',pb:'0,9',div:'%2,1',low52:68.40,high52:110.80,o:104.00,pc:103.81},
 {s:'TCELL',n:'Turkcell',sec:'İletişim',p:98.35,c:1.42,vol:'1,21 Mr',mc:'216,4 Mr',pe:'12,6',pb:'1,8',div:'%2,9',low52:62.15,high52:103.40,o:97.20,pc:96.97},
 {s:'TTKOM',n:'Türk Telekom',sec:'İletişim',p:54.80,c:-0.35,vol:'0,86 Mr',mc:'191,8 Mr',pe:'10,4',pb:'2,0',div:'%3,1',low52:33.70,high52:58.90,o:54.95,pc:54.99},
 {s:'PETKM',n:'Petkim',sec:'Kimya',p:22.18,c:-1.24,vol:'1,05 Mr',mc:'56,2 Mr',pe:'—',pb:'1,6',div:'—',low52:16.44,high52:25.90,o:22.40,pc:22.46},
 {s:'HEKTS',n:'Hektaş',sec:'Kimya',p:8.96,c:-2.40,vol:'0,64 Mr',mc:'13,6 Mr',pe:'—',pb:'2,4',div:'—',low52:6.72,high52:12.35,o:9.15,pc:9.18},
 {s:'KRDMD',n:'Kardemir (D)',sec:'Metal',p:29.44,c:2.11,vol:'1,58 Mr',mc:'37,9 Mr',pe:'14,8',pb:'1,1',div:'—',low52:19.86,high52:31.70,o:28.95,pc:28.83},
 {s:'PGSUS',n:'Pegasus Hava Yolları',sec:'Ulaştırma',p:254.60,c:1.78,vol:'0,92 Mr',mc:'260,4 Mr',pe:'6,4',pb:'2,2',div:'—',low52:168.20,high52:272.50,o:251.00,pc:250.15},
 {s:'TOASO',n:'Tofaş Oto Fabrika',sec:'Otomotiv',p:219.30,c:-0.92,vol:'0,58 Mr',mc:'109,7 Mr',pe:'9,6',pb:'3,8',div:'%4,2',low52:158.40,high52:238.00,o:221.00,pc:221.34},
 {s:'ARCLK',n:'Arçelik',sec:'Dayanıklı Tüketim',p:157.40,c:0.54,vol:'0,49 Mr',mc:'106,4 Mr',pe:'—',pb:'1,7',div:'%1,2',low52:112.60,high52:171.90,o:156.80,pc:156.55},
 {s:'VESTL',n:'Vestel Elektronik',sec:'Elektronik',p:71.05,c:3.02,vol:'0,77 Mr',mc:'23,8 Mr',pe:'—',pb:'2,9',div:'—',low52:42.30,high52:76.80,o:69.20,pc:68.97},
 {s:'MGROS',n:'Migros Ticaret',sec:'Perakende',p:612.00,c:1.19,vol:'0,45 Mr',mc:'110,8 Mr',pe:'13,9',pb:'4,4',div:'%1,6',low52:428.00,high52:648.00,o:606.00,pc:604.80},
 {s:'ENKAI',n:'Enka İnşaat',sec:'İnşaat',p:63.25,c:0.71,vol:'0,52 Mr',mc:'354,2 Mr',pe:'8,2',pb:'1,3',div:'%2,8',low52:44.90,high52:67.40,o:62.90,pc:62.80},
];
export const INDICES: Index[] = [
 {n:'BIST 100',v:'12.418,63',c:1.12},{n:'BIST 30',v:'13.502,10',c:1.34},{n:'USD/TRY',v:'42,81',c:0.06},{n:'EUR/TRY',v:'49,12',c:-0.11},{n:'Gram Altın',v:'5.284,40',c:0.58},{n:'Brent',v:'$71,40',c:-0.72}
];
/* Açılış ekranındaki kayan haber şeridi (değer şeridinin hemen altında). */
export const NEWSFEED: { t: string; s: string }[] = [
 {t:'BIST 100 rekor kapanışa yakın seyrediyor',s:'Foreks'},
 {t:'TCMB faiz kararı öncesi piyasalarda temkinli iyimserlik',s:'Bloomberg HT'},
 {t:'Yabancı yatırımcı hisse pozisyonunu artırdı',s:'Dünya'},
 {t:'THY, 2026 filo hedefini 520 uçağa yükseltti',s:'AA Finans'},
 {t:'Gram altın yeni zirvesini test ediyor',s:'Matriks'},
 {t:'Bankacılık endeksi üçüncü haftayı da primli kapattı',s:'Reuters'},
];
export const NEWS: Record<string, { t: string; s: string }[]> = {
 THYAO:[{t:'THY, 2026 filo hedefini 520 uçağa yükseltti',s:'Bloomberg HT · 2 sa'},{t:'Yolcu sayısı ağustosta yıllık %7,4 arttı',s:'AA Finans · 6 sa'},{t:'Analistler THYAO için hedef fiyatı güncelledi',s:'Matriks · 1 gün'}],
 default:[{t:'BIST 100 rekor kapanışa yakın seyrediyor',s:'Foreks · 1 sa'},{t:'TCMB faiz kararı öncesi piyasalarda temkinli iyimserlik',s:'Bloomberg HT · 3 sa'},{t:'Yabancı yatırımcı hisse pozisyonunu artırdı',s:'Dünya · 1 gün'}]
};


/* Hisse logoları: public/img/logos/<KOD>.svg */
export const LOGO_SYMBOLS: string[] = ["AKBNK", "ARCLK", "ASELS", "BIMAS", "ENKAI", "EREGL", "FROTO", "GARAN", "HEKTS", "ISCTR", "KCHOL", "KRDMD", "MGROS", "PETKM", "PGSUS", "SAHOL", "SISE", "TCELL", "THYAO", "TOASO", "TTKOM", "TUPRS", "VESTL", "YKBNK"];
export const LOGO: Record<string, string> = Object.fromEntries(LOGO_SYMBOLS.map((s) => [s, IMG_BASE + 'logos/' + s + '.svg']));
