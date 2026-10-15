/* Meridyen Yatırım — işlem platformu motoru.
 * Ekranları DOM üzerinde çizer (Android uygulamasıyla birebir aynı görünüm ve davranış).
 * Next.js'te /app sayfasındaki TradingApp bileşeni kabuğu çizer ve boot() ile bu motoru başlatır.
 * Hesap ve durum: lib/account.ts (NestJS API) · Fiyatlar: lib/market.ts (sunucudaki fiyat motoru).
 */
import { COLORS, INDICES, LIVE_LISTS, LOGO, NEWS, NEWSFEED, STOCKS, IMG_BASE } from '../market-data';
import { MeridyenMarket, history as priceHistory } from '../market';
import { Account, maskPhone, normPhone, strength } from '../account';

const MeridyenAuth = { ...Account, maskPhone, normPhone, strength };
let preloadedState: any = null;
const $id = (id: string): any => document.getElementById(id);
const $q = (root: any, sel: string): any => root.querySelector(sel);

/* ---------- durum ---------- */
const state: any={
 cash:128450.00,
 holdings:[
  {s:'THYAO',q:150,cost:284.10},{s:'ASELS',q:200,cost:92.40},{s:'KCHOL',q:300,cost:210.50},
  {s:'BIMAS',q:60,cost:512.00},{s:'SISE',q:500,cost:47.80},{s:'EREGL',q:400,cost:51.20}
 ],
 orders:[
  {id:'MRD-2609-0421',s:'ASELS',side:'buy',type:'limit',price:118.00,qty:200,filled:0,tif:'İKG',status:'pending',t:'20 Eyl 2026 · 09:58'},
  {id:'MRD-2609-0418',s:'GARAN',side:'sell',type:'limit',price:158.00,qty:100,filled:0,tif:'Günlük',status:'pending',t:'20 Eyl 2026 · 09:41'},
  {id:'MRD-2609-0402',s:'THYAO',side:'buy',type:'market',price:311.75,qty:50,filled:50,tif:'Günlük',status:'filled',t:'19 Eyl 2026 · 15:22'},
  {id:'MRD-2609-0377',s:'EREGL',side:'buy',type:'limit',price:53.40,qty:400,filled:400,tif:'Günlük',status:'filled',t:'18 Eyl 2026 · 11:05'},
  {id:'MRD-2609-0351',s:'FROTO',side:'sell',type:'limit',price:1180.00,qty:10,filled:0,tif:'Günlük',status:'cancelled',t:'17 Eyl 2026 · 17:59'},
 ],
 screen:'welcome', nav:[], period:'1G', hidden:false, detail:'THYAO',
 ticket:{s:'THYAO',side:'buy',type:'market',price:null,qty:0,tif:'Günlük',pct:null}, ticketQuery:'', keepScroll:false,   // emir tipi Piyasa; fiyat ve adet boş, kullanıcı girer
 // Kapanmış (satılmış) pozisyonlar: Portföy > Satılanlar bölümü.
 sold:[
  {s:'SISE',q:250,cost:46.60,px:52.30,d:'12 Oca 2026',sa:'17:42',plp:12.14},
  {s:'FROTO',q:20,cost:1042.00,px:1178.50,d:'28 Ara 2025',sa:'14:05',plp:13.10},
  {s:'GARAN',q:300,cost:148.20,px:139.40,d:'05 Ara 2025',sa:'11:23',plp:-5.94},
  {s:'TUPRS',q:120,cost:151.30,px:168.90,d:'14 Kas 2025',sa:'16:58',plp:11.63}
 ],
 ordersTab:'pending', pfTab:'holdings', theme:'light', mkt:'stocks', lastOrder:null,
 mktQuery:'', mktView:'list', mktSort:'az', mktSec:'', tradeSheet:null, allocOpen:false, fontSize:'normal', saleIx:0, saleSheet:false, histF:'all',   // Piyasalar: arama, görünüm, sıralama, sektör filtresi
 /* Oturum: işlem yapılan bölümler (Portföy, Al · Sat, Takip, Hesap) giriş ister.
    ask=true ise her açılışta şifre sorulur; "Beni Hatırla" işaretlenirse oturum açık kalır. */
 auth:{in:false, ask:true, remember:false, user:'Demo Kullanıcı', no:'48273621', pending:null, err:'', mode:'login'},
 /* Cihazdaki hesaplar — açılıştaki yuvarlak profil rozetinin yanındaki çentikten seçilir (Instagram gibi). */
 accounts:[{no:'48273621',user:'Demo Kullanıcı'},{no:'50918342',user:'Ayşe Yılmaz'}]
};
const stock=(s: any): any=>STOCKS.find((x: any)=>x.s===s);
const holding=(s: any): any=>state.holdings.find((h: any)=>h.s===s);
const fmt=(n?: any, d: any = 2)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
const tl=(n?: any, d: any = 2)=>'₺'+fmt(n,d);
const pct=(n: any)=>(n>0?'+':'')+fmt(n)+'%';
const cls=(n: any)=>n>=0?'up':'down';
const arrow=(n: any)=>n>=0?'▲':'▼';
const color=(s: any)=>COLORS[STOCKS.findIndex((x: any)=>x.s===s)%COLORS.length];

/* Hisse rozeti: logo varsa logo, yoksa renkli baş harf. */
function av(sym?: any, cls?: any){ const L=LOGO[sym]; const c=cls||'avatar'; return L?'<img class="'+c+' lgimg" src="'+L+'" alt="'+sym+'">':'<div class="'+c+'" style="background:'+color(sym)+'">'+sym.slice(0,4)+'</div>'; }
const typeName=(t: any)=>t==='market'?'Piyasa':t==='limit'?'Limit':'Stop';
const commRate=0.001, bsmv=0.05;

/* seeded series */
function rng(seed?: any){let a=0;for(const ch of seed)a=(a*31+ch.charCodeAt(0))>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* Gerçek fiyat geçmişi: sunucunun topladığı örnekler (/api/prices/history). Veri yoksa boş dizi. */
const PER: any={'1G':{days:1},'1H':{days:7},'1A':{days:30},'3A':{days:90},'1Y':{days:365}};
function series(s?: any, per?: any): number[] { return priceHistory(s, (PER[per]||PER['1G']).days, ()=>{ try{ drawChart(); }catch{} }).pts; }
function sparkSVG(s?: any, cl?: any){
 const d=series(s,'1G'); if(d.length<2) return ''; const min=Math.min(...d),max=Math.max(...d),W=64,H=28;
 const pts=d.map((v?: any, i?: any)=>`${(i/(d.length-1)*W).toFixed(1)},${(H-2-((v-min)/((max-min)||1))*(H-4)).toFixed(1)}`).join(' ');
 return `<svg class="spark ${cl}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
const ic: any={
 back:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 5l-7 7 7 7"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex:none;color:var(--muted)"><path d="M9 5l7 7-7 7"/></svg>',
 plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14"/></svg>',
 down:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v12M6 11l6 6 6-6"/></svg>',
 up:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 19V7M6 13l6-6 6 6"/></svg>',
 swap:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17l-4-4 4-4M3 13h12M17 7l4 4-4 4M21 11H9"/></svg>',
 eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
 star:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z"/></svg>',
 check:'<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 12l5 5L20 7"/></svg>',
 close:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 caretS:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex:none"><path d="M6 9l6 6 6-6"/></svg>',
 vList:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
 vGrid:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
 vTable:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="4" width="17" height="16" rx="2.4"/><path d="M14 4v16M3.5 9.5h17"/></svg>',
 updown:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M7 20V5l-3.5 3.5M17 4v15l3.5-3.5"/></svg>',
 caret:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" style="flex:none"><path d="M6 9l6 6 6-6"/></svg>',
 checkS:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 12l5 5L20 7"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 bars:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 19V11M12 19V5M19 19v-6"/></svg>',
 chevW:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="flex:none;opacity:.85"><path d="M9 5l7 7-7 7"/></svg>',
 chevD:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" style="flex:none"><path d="M9 5l7 7-7 7"/></svg>',
 swap2:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
 pie:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M21 12h-9"/></svg>',
 gold:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18h8l-1.5-5h-5zM13 18h8l-1.5-5h-5zM8 12h8l-1.5-5h-5z"/></svg>',
 trend:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
 bulb:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.6.6-1 1.3-1 2.1H9c0-.8-.4-1.5-1-2.1A6 6 0 0 1 12 3z"/></svg>',
 bolt:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 coin:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4.5a2 2 0 1 1 0 4H9"/></svg>',
 grid:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
 shield:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
 bell:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/></svg>',
 doc:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
 bank:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/></svg>',
 user:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
 lock:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex:none"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
 help:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/></svg>',
 moon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
 sun:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 globe:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>',
 sliders:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
 clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
 text:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18l5.5-13L14 18M4.8 14h7.4M16 18l3-7 3 7M17 15.6h4"/></svg>',
 gift:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18M12 9v11M12 9S9.5 4 7 5.5 9 9 12 9zM12 9s2.5-5 5-3.5S15 9 12 9z"/></svg>',
 dl:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9.2 11.4L12 14.2l2.8-2.8"/></svg>',
 out:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex:none"><path d="M15 17l5-5-5-5M20 12H9M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/></svg>',
 starF:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z"/></svg>',
 trash:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
 copy:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/></svg>'
};

/* ---------- portfolio math ---------- */
function portfolio(){
 let value=0,cost=0;
 const rows=state.holdings.map((h: any)=>{const st=stock(h.s);const v=h.q*st.p,c=h.q*h.cost;value+=v;cost+=c;return{...h,st,v,c,pl:v-c,plp:(v-c)/c*100}});
 const dayPl=rows.reduce((a?: any, r?: any)=>a+r.q*(r.st.p-r.st.pc),0);
 return{rows,value,cost,pl:value-cost,plp:cost?(value-cost)/cost*100:0,dayPl,total:value+state.cash};
}

/* ---------- render ---------- */
let main: any;   // boot() içinde atanır
function go(screen?: any, opts: any = {}){
 if(needsAuth(screen) && !state.auth.in){ openLogin(screen,opts); return; }   // işlem bölümlerine girişsiz geçilmez
 if(opts.push!==false && screen!==state.screen) state.nav.push(state.screen);
 // Al · Sat ekranına her girişte emir tipi Piyasa'ya döner; limit seçimi o oturumda kalır.
 if(screen==='ticket' && state.screen!=='ticket'){ state.ticket.type='market'; state.ticket.pct=null; state.ticket.qty=0; state.ticket.price=null; }   // örnek rakam kalmasın
 state.screen=screen; Object.assign(state,opts.set||{});
 render(); window.scrollTo({top:0});
}
function back(){ state.screen=state.nav.pop()||'home'; render(); }
function menuFor(sc?: any){ if(sc==="welcome") return ""; if(sc==="detail") return state.nav.indexOf("portfolio")>=0?"portfolio":"home"; if(sc==="success"||sc==="orders"||sc==="sale") return "portfolio"; return sc; }
/* Ekran değişince sayfayı tepeye al. Android WebView eski kaydırma konumunu geri yüklediği için
   bir de çizim sonrası yineleniyor; yoksa ilk satır üst şeridin altında yarım kalıyor. */
let topTimer: any, lastView='';
function toTop(){
 try{ window.scrollTo(0,0); if(document.scrollingElement) document.scrollingElement.scrollTop=0; if(main) main.scrollTop=0; }catch(e){}
}
/* Karşılama ekranı ipucu: uygulama açılır açılmaz üst menü düğmeleri sırayla, sürekli yanıp söner. */
function scheduleHint(){
 const m=$id('menu'); if(!m) return;
 m.classList.toggle('hint', state.screen==='welcome');   // yalnızca açılış ekranında; dokununca durmaz, ekran değişince biter
}
function render(){
 document.querySelectorAll('#menu button').forEach((b: any)=>b.classList.toggle('active', b.dataset.screen===menuFor(state.screen)));
 const map: any={welcome:renderWelcome,home:renderHome,mkt:renderMkt,portfolio:renderPortfolio,ticket:renderTicket,orders:renderOrders,news:renderNews,watch:renderWatch,profile:renderProfile,detail:renderDetail,success:renderSuccess};
 document.body.classList.toggle("welcome-mode", state.screen==="welcome");   // açılış ekranı: ayrı zemin yok, yalnızca menü ipucu için işaret
 document.body.classList.toggle('ticket-mode', state.screen==='ticket');   // Al · Sat tek ekrana sığar, kaydırma olmaz
 /* Aynı sayfada kalan her çizimde (tema, ayar, sekme…) kaydırma korunur; yalnız sayfa değişince tepeye alınır. */
 const vkey=state.screen+"/"+(state.screen==="mkt"?state.mkt:state.screen==="detail"?state.detail:"");
 const keep=state.keepScroll||vkey===lastView, y=main.scrollTop;
 state.keepScroll=false;
 main.innerHTML=map[state.screen]();
 clearTimeout(topTimer);   // önceki ekranın "tepeye al" isteği bu ekranı zıplatmasın
 if(keep) main.scrollTop=y;   // sekme değişiminde sayfa yerinde kalsın
 else { toTop(); requestAnimationFrame(toTop); topTimer=setTimeout(toTop,80); }
 if(state.screen==='detail'||state.screen==='ticket') drawChart();
 bind();
 scheduleHint();   // açılış ekranında menü ipucu (sıralı yanıp sönme)
 if(state.tradeSheet) drawTrade();   // hızlı al · sat sayfası açıksa o da tazelensin
 if(state.saleSheet) drawSale();   // satış detayı kartı açıksa tazelensin
 paintSky();   // açılış ekranında saate göre manzara
 paintStatus();   // üst şeritte seans durumu ve saat
 lastView=vkey;
 persistApp();   // portföy ve emirler hesaba özel saklanır
 paintShell();   // masaüstü kenar panelleri
 syncHash();   // ekran adres çubuğunda
}

/* Piyasa kutucukları: BIST 100, BIST 30, Fonlar… Görseli olan logosunu, olmayan kendi kısaltmasını gösterir
   (boş görünmesin diye renkli rozet + değer satırı). */
/* Açılış kartlarındaki küçük süslemeler. */
const art: any={
 spark:'<svg viewBox="0 0 120 48" fill="none" width="120" height="48"><path d="M2 40 L18 31 L30 35 L44 20 L58 26 L72 14 L88 18 L106 5" stroke="#2E8B6B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><circle cx="106" cy="5" r="4.5" fill="#1E4B41"/></svg>',
 pills:'<svg viewBox="0 0 120 48" width="120" height="48"><rect x="18" y="4" width="70" height="24" rx="12" fill="#3E8E6A" opacity=".85"/><text x="53" y="21" font-size="12" font-weight="700" fill="#EAF6EF" text-anchor="middle" font-family="Manrope, sans-serif">Al</text><rect x="38" y="22" width="70" height="24" rx="12" fill="#1E4B41"/><text x="73" y="39" font-size="12" font-weight="700" fill="#CBDC6E" text-anchor="middle" font-family="Manrope, sans-serif">Sat</text></svg>',
 bars:'<svg viewBox="0 0 120 48" width="120" height="48"><rect x="40" y="30" width="18" height="18" rx="5" fill="#2F6B55"/><rect x="64" y="16" width="18" height="32" rx="5" fill="#8FA85C"/><rect x="88" y="6" width="18" height="42" rx="5" fill="#4E8F72"/></svg>',
};

const MARKETS: any=[
 {k:'news',    n:'Haberler',   s:'Gündem',      b:'HBR',  c1:'#1E4B41', c2:'#4F7F64'},
 {k:'bist100', n:'BIST 100',   s:'Endeks',      b:'100',  c1:'#1E4B41', c2:'#3E7A63', idx:'BIST 100'},
 {k:'bist30',  n:'BIST 30',    s:'Endeks',      b:'30',   c1:'#28604F', c2:'#5B9B7A', idx:'BIST 30'},
 {k:'funds',   n:'Fonlar',     s:'TEFAS',       b:'FON',  c1:'#5B7F3A', c2:'#8CB45C'},
 {k:'viop',    n:'VİOP',       s:'Vadeli',      b:'VİOP', c1:'#3E5C8A', c2:'#6E8FC4'},
 {k:'fx',      n:'Döviz',      s:'USD/TRY',     b:'$',    c1:'#2B6F7A', c2:'#4FA3AE', idx:'USD/TRY'},
 {k:'gold',    n:'Altın',      s:'Gram',        b:'AU',   c1:'#8A6B2B', c2:'#C9A34E', idx:'Gram Altın'},
 {k:'euro',    n:'Euro',       s:'EUR/TRY',     b:'€',    c1:'#1F4E79', c2:'#4C84B8', idx:'EUR/TRY'},
 {k:'brent',   n:'Brent',      s:'Petrol',      b:'BRN',  c1:'#7A3E5C', c2:'#B06E8C', idx:'Brent'},
 {k:'stocks',  n:'Hisseler',    s:'BIST pay',    b:'HSS',  c1:'#1E4B41', c2:'#3E7A63'},
 {k:'screener',n:'Tarayıcı',    s:'Filtreler',   b:'TRY',  c1:'#2B6F7A', c2:'#4FA3AE'},
];
const index=(n: any)=>INDICES.find((i: any)=>i.n===n);
function marketTiles(){
 return `<div class="mkt">${MARKETS.map((m: any)=>{const i=m.idx?index(m.idx):null;return `<button data-act="market" data-k="${m.k}" data-n="${m.n}">
  <span class="logo" style="background:linear-gradient(135deg,${m.c1},${m.c2})">${m.b}</span>
  <b>${m.n}</b><span class="sub">${i?i.v:m.s}</span>
  ${i?`<span class="chg ${cls(i.c)}">${arrow(i.c)} ${pct(i.c)}</span>`:`<span class="chg neutral">${m.s==='Endeks'?'Endeks':'Keşfet'}</span>`}
 </button>`}).join('')}</div>`;
}

/* Haberler: Piyasalar ekranındaki ilk kutucuktan açılır. Gündem + takip listesindeki hisselerin haberleri. */
function renderNews(){
 const feed=newsFeed();
 return `<section class="screen">
  <div class="sec" style="margin-top:0"><h3>Haberler</h3><button data-act="newsSrc">Kaynaklar</button></div>
  <div class="card news"><div class="list">${feed.length?'':'<div class="empty">Seçili kaynaklardan haber yok. Kaynaklar\'dan açabilirsiniz.</div>'}${feed.map((n: any)=>`<button class="rowitem" data-act="article" data-i="${n.i}">
   <div class="t"><b>${n.t}</b><span class="src">${n.s}${n.tag==='Gündem'?'':' · '+n.tag}</span></div>${ic.chev}
  </button>`).join('')}</div></div>
  <div class="note" style="text-align:center">Haber akışı örnektir; yatırım tavsiyesi değildir.</div>
 </section>`;
}

/* Takip listem: kullanıcının seçtiği paylar (Düzenle ile çıkarılır, Hisse ekle ile eklenir) ve günün hareketlileri. */
function renderWatch(){
 const movers=[...STOCKS].sort((a?: any, b?: any)=>Math.abs(b.c)-Math.abs(a.c)).slice(0,4);
 const list=(state.watch||[]).map(stock).filter(Boolean), ed=state.watchEdit;
 return `<section class="screen">
  <div class="sec" style="margin-top:0"><h3>Takip Listem</h3><span class="secacts"><button data-act="watchAdd">${ic.plus} Ekle</button>${list.length?`<button data-act="watchEdit">${ed?'Bitti':'Düzenle'}</button>`:''}</span></div>
  <div class="card"><div class="list">${list.length?list.map((st: any)=>ed?`<div class="rowitem wedit">${av(st.s)}<div class="t"><b>${st.s}</b><span>${st.n}</span></div><span class="wmv"><button data-act="watchUp" data-s="${st.s}" aria-label="${st.s} yukarı taşı">${ic.up}</button><button class="rm" data-act="watchRm" data-s="${st.s}" aria-label="${st.s} listeden çıkar">${ic.close}</button></span></div>`:rowStock(st)).join('')
   :`<div class="empty">Takip listeniz boş.<br><button class="btn primary sm" style="margin-top:12px" data-act="watchAdd">${ic.plus} Hisse ekle</button></div>`}</div></div>
  <div class="sec"><h3>Günün Hareketlileri</h3><button data-act="goto" data-v="home">Tümü</button></div>
  <div class="card"><div class="list">${movers.map(rowStock).join('')}</div></div>
 </section>`;
}

/* Açılış ekranı: koyu yeşil zemin, karşılama, üç tanıtım kartı (dokununca ilgili bölüme gider),
   canlı değer şeridi ve başlangıç düğmeleri. Uygulama her açıldığında gelir; menüde hiçbir sekme seçili değildir. */
/* Açılış ekranının üst kısmındaki manzara: saate göre sabah / gündüz / akşam / gece.
   Selamlama ile aynı saat aralıklarını kullanır (greeting). */
function skyKind(){ const h=new Date().getHours(); if(h<6) return 'night'; if(h<12) return 'dawn'; if(h<18) return 'day'; if(h<22) return 'dusk'; return 'night'; }
/* Açılış ekranı manzaraları: saate göre sabah / gündüz / akşam / gece (gömülü fotoğraflar). */
const SKY={dawn:IMG_BASE+'sky/dawn.jpg',day:IMG_BASE+'sky/day.jpg',dusk:IMG_BASE+'sky/dusk.jpg',night:IMG_BASE+'sky/night.jpg'};
function paintSky(){
 const el=$id('sky'); if(!el) return;
 if(state.screen!=='welcome'){ el.classList.remove('on'); document.body.removeAttribute('data-sky'); return; }
 const k=skyKind();
 if(el.dataset.k!==k){ el.innerHTML="<img alt=\"\" src=\""+SKY[k]+"\">"; el.dataset.k=k; }
 document.body.dataset.sky=k;
 el.classList.add('on');
}
function greeting(){
 const h=new Date().getHours();
 if(h<6) return 'İyi geceler';      // 00:00 – 05:59
 if(h<12) return 'Günaydın';        // 06:00 – 11:59
 if(h<18) return 'İyi günler';      // 12:00 – 17:59
 if(h<22) return 'İyi akşamlar';    // 18:00 – 21:59
 return 'İyi geceler';              // 22:00 – 23:59
}
/* Alt şerit: tarih, saat ve BIST seans durumu; diğer şeritler gibi kayar (hafta içi 10:00 – 18:00 arası açık). */
function marketOpen(d?: any){ const g=d.getDay(), m=d.getHours()*60+d.getMinutes(); return g>=1 && g<=5 && m>=600 && m<1080; }
function clockItems(){
 const d=new Date(), open=marketOpen(d);
 const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
 const tarih=d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
 const gun=d.toLocaleDateString('tr-TR',{weekday:'long'});
 const dk=d.getHours()*60+d.getMinutes();
 const kalan=open?1080-dk:(d.getDay()>=1&&d.getDay()<=5&&dk<600?600-dk:0);
 const sure=kalan?`${Math.floor(kalan/60)} sa ${kalan%60} dk`:'';
 return [
  `${ic.clock}<b class="num">${hh}:${mm}</b>`,
  `<i class="dot ${open?'on':''}"></i><b>${open?'Borsa Açık':'Borsa Kapalı'}</b>`,
  `<span>${gun}</span><b>${tarih}</b>`,
  `<span>Seans</span><b class="num">10:00 – 18:00</b>`,
  kalan?`<span>${open?'Kapanışa':'Açılışa'}</span><b>${sure}</b>`:`<span>Sıradaki seans</span><b>hafta içi 10:00</b>`,
 ];
}
const clockTrack=()=>{ const it=clockItems().map((h: any)=>`<span class="wstat">${h}</span>`).join(''); return it+it; };
function clockRow(){ return `<div class="wticker wclock" id="wclock"><div class="wtrack">${clockTrack()}</div></div>`; }
/* Üst şeritteki seans durumu ve saat. */
function tmItems(){
 const d=new Date(), open=marketOpen(d);
 const hh=String(d.getHours()).padStart(2,"0"), mm=String(d.getMinutes()).padStart(2,"0");
 return "<span><i></i>Hızlı ve Kolay işlemin gücü için Meridyen Yatırım</span>"
  +"<span><i></i>Hisse koçu ile haftaya kazançlı başlama fırsatını kaçırmayın</span>"
  +"<span class=\"st "+(open?"on":"off")+"\"><i></i>Borsa "+(open?"Açık":"Kapalı")+" · <b class=\"num\">"+hh+":"+mm+"</b></span>";
}
function paintStatus(){ const t=$id("tmtrack"); if(!t) return; const s=tmItems(); t.innerHTML=s+s; }
function tickClock(){ const el=$id('wclock'); if(!el) return; const tr=el.querySelector('.wtrack'); if(tr) tr.innerHTML=clockTrack(); }
setInterval(()=>{ paintStatus(); if(state.screen==='welcome') tickClock(); },20000);
function renderWelcome(){
 const idx=(n: any)=>INDICES.find((i: any)=>i.n===n)||{v:'—',c:0};
 const gold=idx('Gram Altın'), bist=idx('BIST 100'), eur=idx('EUR/TRY');
/* Kayıtlı (etkin) hesap varsa selamlama ona hitaben olur ve baloncukta baş harfleri görünür. */
 const acc=state.accounts.find((x: any)=>x.no===state.auth.no)||null, who=acc?acc.user:(state.auth.in?state.auth.user:"");
 const stat=(icon?: any, n?: any, d?: any)=>`<div class="wstat"><span class="wicon">${icon}</span><div><span>${n}</span><b class="num">${d.v}</b><em class="num ${cls(d.c)}">${arrow(d.c)} ${pct(d.c)}</em></div></div>`;
 return `<section class="screen welcome">
  <div class="wtop">
   <div class="wgreet">${greeting()}${who?", <b>"+esc(who.split(" ")[0])+"</b>":","}</div>
   <button class="wavatar" data-act="accounts" aria-label="Hesap seç ya da ekle"><span class="wlogo">${acc?esc(initials(acc.user)):"M"}</span><span class="wcaret">${ic.caretS}</span></button>
   <h2>Meridyen Yatırım'a<br>hoş geldiniz</h2>
   ${state.auth.in
    ? `<div class="wauth on"><span class="who">${ic.checkS}<span>Giriş yapıldı · <b>${esc(state.auth.user)}</b></span></span><button class="out" data-act="logout">Çıkış Yap</button></div>`
    : `<div class="wauth"><button class="wlogin" data-act="login">${ic.lock} Giriş Yap ${ic.chevD}</button></div>`}
  </div>

  <div class="wcards">
   <button class="wcard" data-act="goto" data-v="home">
    <span class="wtile">${ic.bars}</span>
    <span class="wtext"><b>Anlık Piyasalar</b><em>Borsa, döviz, altın ve daha fazlasını anlık takip edin.</em></span>
    <span class="wart">${art.spark}</span>${ic.chevW}
   </button>
   <button class="wcard" data-act="goto" data-v="ticket">
    <span class="wtile">${ic.swap2}</span>
    <span class="wtext"><b>Kolay Al-Sat</b><em>Hızlı ve güvenli işlemle fırsatları değerlendirin.</em></span>
    <span class="wart">${art.pills}</span>${ic.chevW}
   </button>
   <button class="wcard" data-act="goto" data-v="portfolio">
    <span class="wtile">${ic.pie}</span>
    <span class="wtext"><b>Portföy Takibi</b><em>Yatırımlarınızı tek ekranda kolayca yönetin.</em></span>
    <span class="wart">${art.bars}</span>${ic.chevW}
   </button>
  </div>

  <div class="wticker"><div class="wtrack">${[...Array(2)].map(()=>INDICES.map((i: any)=>`<span class="wstat"><span class="wicon">${i.n.includes('Altın')?ic.gold:i.n.includes('TRY')||i.n.includes('USD')?ic.coin:i.n==='Brent'?ic.bolt:ic.trend}</span><span class="wv"><span>${i.n}</span><b class="num">${i.v}</b></span><em class="num ${cls(i.c)}">${arrow(i.c)} ${pct(i.c)}</em></span>`).join('')).join('')}</div></div>
  <div class="wticker wnews"><div class="wtrack">${[...Array(2)].map(()=>NEWSFEED.map((x: any)=>`<span class="wstat"><span class="wicon">${ic.doc}</span><span class="wv"><b>${x.t}</b></span></span>`).join('')).join('')}</div></div>
  ${clockRow()}
  <div class="wfoot">Meridyen Yatırım Menkul Değerler A.Ş.</div>
 </section>`;
}

/* Piyasa kutucuklarının içeriği: her kategori kendi listesini açar (sıralı). Hisse satırları gerçek mock verisinden,
   diğerleri (fon, VİOP, döviz, halka arz…) örnek listelerden gelir. */
const MKT: any={
 news:()=>({t:'Haberler',s:'Gündem',rows:[]}),
 bist100:()=>({t:'BIST 100',s:'En yüksek işlem hacmi · ilk 100 pay',rows:[...STOCKS].sort((a?: any, b?: any)=>(b.volN||0)-(a.volN||0)).slice(0,100).map((x: any)=>({k:x.s,n:x.n,v:tl(x.p),c:x.c,sym:x.s}))}),
 bist30:()=>({t:'BIST 30',s:'En yüksek işlem hacmi · ilk 30 pay',rows:[...STOCKS].sort((a?: any, b?: any)=>(b.volN||0)-(a.volN||0)).slice(0,30).map((x: any)=>({k:x.s,n:x.n,v:tl(x.p),c:x.c,sym:x.s}))}),
 stocks:()=>({t:'Hisseler',s:'Bütün paylar · alfabetik',rows:[...STOCKS].sort((a?: any, b?: any)=>a.s.localeCompare(b.s,'tr')).map((x: any)=>({k:x.s,n:x.n,v:tl(x.p),c:x.c,sym:x.s}))}),
 screener:()=>({t:'Tarayıcı',s:'Günün en çok yükselenleri',rows:[...STOCKS].sort((a?: any, b?: any)=>b.c-a.c).slice(0,10).map((x: any)=>({k:x.s,n:x.n,v:tl(x.p),c:x.c,sym:x.s}))}),
 funds:()=>({t:'Fonlar',s:'Canlı fon fiyatları',rows:LIVE_LISTS.fund.map((q: any)=>({k:q[0],n:q[1],v:'₺'+fmt(q[2],4),c:q[3]}))}),
 viop:()=>({t:'VİOP',s:'Vadeli işlem sözleşmeleri',rows:LIVE_LISTS.viop.map((q: any)=>({k:q[0],n:q[1],v:fmt(q[2]),c:q[3]}))}),
 fx:()=>({t:'Döviz',s:'Canlı kurlar',rows:LIVE_LISTS.fx.map((q: any)=>({k:q[0],n:q[1],v:fmt(q[2],4),c:q[3]}))}),
 euro:()=>MKT.fx(),
 gold:()=>({t:'Altın',s:'Canlı gram altın',rows:INDICES.filter((i: any)=>i.n==='Gram Altın'&&i._n!=null).map((i: any)=>({k:i.n,n:'24 ayar · TL',v:i.v,c:i.c}))}),
 brent:()=>({t:'Brent',s:'Canlı ham petrol',rows:INDICES.filter((i: any)=>i.n==='Brent'&&i._n!=null).map((i: any)=>({k:i.n,n:'Ham petrol · varil',v:i.v,c:i.c}))}),
};

/* Kategori listesi ekranı (Piyasalar > kutucuk). */
function renderMkt(){
 const m=MARKETS.find((x: any)=>x.k===state.mkt)||MARKETS[0];
 const d=(MKT[state.mkt]||MKT.stocks)();
 return `<section class="screen">
  <div class="mhead">
   <button class="iconbtn" data-act="back" aria-label="Geri">${ic.back}</button>
   <div class="t"><b>${d.t}</b><span>${d.s}</span></div>
   <span class="logo2" style="background:linear-gradient(135deg,${m.c1},${m.c2})">${m.b}</span>
  </div>
  <div class="card"><div class="list">${d.rows.map((r: any)=>`<button class="rowitem" data-act="${r.sym?'detail':'inst'}" data-s="${r.sym||''}" data-k="${esc(r.k)}">
   <div class="avatar" style="background:${r.sym?color(r.sym):'var(--g700)'}">${r.k.slice(0,4)}</div>
   <div class="t"><b>${r.k}</b><span>${r.n}</span></div>
   <div class="p num"><b>${r.v}</b>${r.c!=null?`<span class="${cls(r.c)}">${pct(r.c)}</span>`:r.note?`<span>${r.note}</span>`:''}</div>
  </button>`).join('')||'<div class="empty">Bu kategoride kayıt yok.</div>'}</div></div>
  <div class="note">Liste örnektir; gerçek veri bağlanmadı. Hisse satırlarına dokununca hisse sayfası açılır.</div>
 </section>`;
}

/* Piyasalar: arama + görünüm (liste / kart / tablo) + sıralama + filtre, altında bütün hisseler. */
const SORTS: any={
 az:{n:'Hisse (A → Z)', f:(a?: any, b?: any)=>a.s.localeCompare(b.s,'tr')},
 za:{n:'Hisse (Z → A)', f:(a?: any, b?: any)=>b.s.localeCompare(a.s,'tr')},
 phigh:{n:'Fiyat (yüksek → düşük)', f:(a?: any, b?: any)=>b.p-a.p},
 plow:{n:'Fiyat (düşük → yüksek)', f:(a?: any, b?: any)=>a.p-b.p},
 cup:{n:'Değişim (en çok artan)', f:(a?: any, b?: any)=>b.c-a.c},
 cdown:{n:'Değişim (en çok azalan)', f:(a?: any, b?: any)=>a.c-b.c},
};
function mktRows(){
 const q=(state.mktQuery||'').toLocaleLowerCase('tr');
 let r=STOCKS.filter((x: any)=>!q||(x.s+' '+x.n).toLocaleLowerCase('tr').includes(q));
 if(state.mktSec) r=r.filter((x: any)=>x.sec===state.mktSec);
 return [...r].sort((SORTS[state.mktSort]||SORTS.az).f);
}
function renderHome(){
 const rows=mktRows(), v=state.mktView||'list';
 const body = !rows.length
  ? '<div class="card"><div class="empty">Eşleşen hisse yok.</div></div>'
  : v==='grid'
   ? `<div class="mgrid">${rows.map((st: any)=>`<button data-act="detail" data-s="${st.s}">
      <b>${st.s}</b><span>${st.n}</span>
      <i class="num">${tl(st.p)}</i><em class="num ${cls(st.c)}">${pct(st.c)}</em>
     </button>`).join('')}</div>`
   : v==='table'
    ? `<div class="mtable"><div class="th"><span>Hisse</span><span>Fiyat</span><span>Değişim</span></div>
       ${rows.map((st: any)=>`<button class="tr2" data-act="detail" data-s="${st.s}"><span class="sym"><b>${st.s}</b><em>${st.n}</em></span><span class="num">${tl(st.p)}</span><span class="num ${cls(st.c)}">${pct(st.c)}</span></button>`).join('')}</div>`
    : `<div class="card"><div class="list">${rows.map(rowStock).join('')}</div></div>`;
 return `<section class="screen mkts">
  <div class="msearch">${ic.search}<input id="mktSearch" placeholder="Ara" aria-label="Ara" value="${state.mktQuery||''}"></div>
  <div class="mviews">
   <button data-act="mview" data-v="list" class="${v==='list'?'active':''}" aria-label="Liste görünümü">${ic.vList}</button>
   <button data-act="mview" data-v="grid" class="${v==='grid'?'active':''}" aria-label="Kart görünümü">${ic.vGrid}</button>
   <button data-act="mview" data-v="table" class="${v==='table'?'active':''}" aria-label="Tablo görünümü">${ic.vTable}</button>
  </div>
  <button class="mbar" data-act="msort">${ic.updown}<span class="t">${(SORTS[state.mktSort]||SORTS.az).n}</span>${ic.caret}</button>
  <button class="mbar filter" data-act="mfilter" aria-label="Filtre">${ic.sliders}${state.mktSec?`<span class="t">${state.mktSec}</span>`:''}</button>
  ${body}
 </section>`;
}
/* Sıralama ve filtre alt sayfaları. */
function openSort(){
 $id('layer').innerHTML=`<div class="overlay" id="ov"><div class="sheet lgn" role="dialog" aria-label="Sıralama">
  <div class="grab"></div><h3>Sıralama</h3><div class="sub2">Listeyi neye göre sıralayalım?</div>
  <div class="setlist">${Object.keys(SORTS).map((k: any)=>`<button data-act="msortPick" data-v="${k}"><span class="ic">${ic.updown}</span><div class="t"><b>${SORTS[k].n}</b></div>${(state.mktSort||'az')===k?`<span class="chip lime">${ic.checkS}</span>`:ic.chev}</button>`).join('')}</div>
 </div></div>`;
 bind($id('layer'));
}
function openFilter(){
 const secs=[...new Set(STOCKS.map((x: any)=>x.sec))].sort((a?: any, b?: any)=>a.localeCompare(b,'tr'));
 $id('layer').innerHTML=`<div class="overlay" id="ov"><div class="sheet lgn" role="dialog" aria-label="Filtre">
  <div class="grab"></div><h3>Filtre</h3><div class="sub2">Sektöre göre süzün.</div>
  <div class="setlist">
   <button data-act="mfilterPick" data-v=""><span class="ic">${ic.grid}</span><div class="t"><b>Tümü</b><span>${STOCKS.length} hisse</span></div>${!state.mktSec?`<span class="chip lime">${ic.checkS}</span>`:ic.chev}</button>
   ${secs.map((s: any)=>`<button data-act="mfilterPick" data-v="${s}"><span class="ic">${SEC_ICON[s]||ic.trend}</span><div class="t"><b>${s}</b><span>${STOCKS.filter((x: any)=>x.sec===s).length} hisse</span></div>${state.mktSec===s?`<span class="chip lime">${ic.checkS}</span>`:ic.chev}</button>`).join('')}
  </div>
 </div></div>`;
 bind($id('layer'));
}
/* Hisse "profil resmi": sektörüne göre simge, kuruma özel renkli daire içinde. */
const SEC_ICON: any={
 'Ulaştırma':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7.5 4.2v2.1L13.5 13v4.3l2.5 1.8v1.6L12 19.6l-4 1.1v-1.6l2.5-1.8V13L3 15.3v-2.1L10.5 9z"/></svg>',
 'Savunma':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 'Holding':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M4 21h16"/></svg>',
 'Perakende':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
 'Sanayi':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 20V10l5 3V10l5 3V10l5 3v7z"/><path d="M6 6h3v4H6z"/></svg>',
 'Metal':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
 'Banka':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/></svg>',
 'Enerji':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s5.5 5.2 5.5 9.3A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.7C6.5 8.2 12 3 12 3z"/></svg>',
 'Otomotiv':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-3l2-5h12l2 5v3"/><path d="M4 16h16"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></svg>',
 'İletişim':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 18V9M9.5 18V5M14.5 18v-8M19 18v-5"/></svg>',
 'Kimya':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v6L4.8 17.6A2 2 0 0 0 6.5 20.7h11a2 2 0 0 0 1.7-3.1L14 9V3"/><path d="M9 3h6"/></svg>',
 'Dayanıklı Tüketim':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13.5" r="4"/><path d="M8 6.5h3"/></svg>',
 'Elektronik':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/></svg>',
 'İnşaat':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V6l10-3v18"/><path d="M15 10h4v11"/><path d="M3 21h18"/><path d="M8.5 8v0M8.5 12v0M8.5 16v0"/></svg>',
};
function pfp(st?: any){
 const g=SEC_ICON[st.sec]||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 17l5-5 3 3 7-7"/><path d="M14 8h6v6"/></svg>';
 return `<span class="pfp" style="background:${color(st.s)}" aria-hidden="true">${g}</span>`;
}
function rowStock(st?: any){
 return `<button class="rowitem" data-act="detail" data-s="${st.s}">

  <div class="t"><b>${st.s}</b><span>${st.n}</span></div>
  <div class="p num"><b>${tl(st.p)}</b><span class="${cls(st.c)}">${pct(st.c)}</span></div>
 </button>`;
}

function renderDetail(){
 const st=stock(state.detail), h=holding(st.s);
 const lo=st.lo??st.p, hi=st.hi??st.p, tk=tick(st);
 const upl=h?h.q*(st.p-h.cost):0;
 return `<section class="screen">
  <div class="sub"><button class="back" data-act="back" aria-label="Geri">${ic.back}</button><h2>Hisse Detayı</h2><button class="iconbtn" data-act="alarm" data-s="${st.s}" aria-label="Fiyat alarmı kur">${ic.bell}${(state.alarms||[]).some((x: any)=>x.s===st.s&&!x.done)?'<span class="dot"></span>':''}</button><button class="iconbtn ${inWatch(st.s)?'starred':''}" data-act="watchToggle" data-s="${st.s}" aria-pressed="${inWatch(st.s)}" aria-label="${inWatch(st.s)?'Takip listesinden çıkar':'Takip listesine ekle'}">${inWatch(st.s)?ic.starF:ic.star}</button></div>
  <div class="card">
   <div class="dhead">${av(st.s,"avatar big")}<div class="t"><b>${st.s}</b><span>${st.n} · ${st.sec}</span></div></div>
   <div class="price num"><span class="big">${tl(st.p)}</span><span class="chip ${cls(st.c)}">${arrow(st.c)} ${tl(Math.abs(st.p-st.pc))} (${pct(st.c)})</span><span class="sm">${liveLabel()}</span></div>
   <div class="periods">${Object.keys(PER).map((p: any)=>`<button data-act="period" data-p="${p}" class="${p===state.period?'active':''}">${p}</button>`).join('')}</div>
   <canvas class="chart" id="chart" aria-label="${st.s} fiyat grafiği"></canvas>
   <div class="range num"><div class="lbl"><span>Gün Düşük <b>${tl(lo)}</b></span><span>Gün Yüksek <b>${tl(hi)}</b></span></div></div>
  </div>
  ${h?`<div class="card flat"><div class="sec" style="margin:0 0 8px"><h3>Pozisyonum</h3><span class="chip ${cls(upl)}">${pct((st.p-h.cost)/h.cost*100)}</span></div>
   <div class="stats num"><div><span>Adet</span><b>${fmt(h.q,0)}</b></div><div><span>Ort. Maliyet</span><b>${tl(h.cost)}</b></div><div><span>Piyasa Değeri</span><b>${tl(h.q*st.p)}</b></div><div><span>Kâr / Zarar</span><b class="${cls(upl)}">${(upl>=0?'+':'')+tl(upl)}</b></div></div></div>`:''}
  <div class="card">
   <div class="sec" style="margin:0 0 6px"><h3>İstatistikler</h3></div>
   <div class="stats num">
    <div><span>Açılış</span><b>${tl(st.o)}</b></div><div><span>Önceki Kapanış</span><b>${tl(st.pc)}</b></div>
    <div><span>Hacim</span><b>${st.vol}</b></div><div><span>Fiyat Adımı</span><b>${tl(tk)}</b></div>
   </div>
  </div>
  <div class="tradebar">
   <button class="btn buy" data-act="trade" data-side="buy" data-s="${st.s}">${ic.down} Al</button>
   <button class="btn sell" data-act="trade" data-side="sell" data-s="${st.s}" ${h?'':'disabled'}>${ic.up} Sat</button>
  </div>
 </section>`;
}

function drawChart(){
 const cv=$id('chart'); if(!cv) return;
 const onTicket=state.screen==='ticket';
 const st=stock(onTicket?state.ticket.s:state.detail), d=series(st.s,state.period);
 if(d.length<2){ const c0=cv.getContext('2d'); const W0=cv.clientWidth||360, H0=cv.clientHeight||190; cv.width=W0; cv.height=H0; c0.clearRect(0,0,W0,H0); c0.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#888'; c0.font='600 12px Manrope, system-ui'; c0.textAlign='center'; c0.fillText('Bu dönem için gerçek fiyat verisi toplanıyor…',W0/2,H0/2); return; }
 const dpr=window.devicePixelRatio||1, W=cv.clientWidth||360, H=cv.clientHeight||190; cv.width=W*dpr; cv.height=H*dpr;
 const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
 const css=getComputedStyle(document.documentElement);
 let upC=css.getPropertyValue('--up').trim(), dnC=css.getPropertyValue('--down').trim(), lineC=css.getPropertyValue('--line').trim(), mutC=css.getPropertyValue('--muted').trim(), cardC=css.getPropertyValue('--card').trim();
 const first=d[0], last=d[d.length-1], col=last>=first?upC:dnC;
 const padL=6,padR=60,padT=14,padB=22, min=Math.min(...d), max=Math.max(...d), span=(max-min)||1;
 const x=(i: any)=>padL+i/(d.length-1)*(W-padL-padR), y=(v: any)=>padT+(1-(v-min)/span)*(H-padT-padB);
 ctx.clearRect(0,0,W,H);
 ctx.strokeStyle=lineC; ctx.lineWidth=1; ctx.setLineDash([3,4]);
 ctx.font='600 11px Manrope, system-ui'; ctx.fillStyle=mutC; ctx.textAlign='left';
 [max, min+span/2, min].forEach((v: any)=>{ctx.beginPath();ctx.moveTo(padL,y(v));ctx.lineTo(W-padR,y(v));ctx.stroke();ctx.fillText(fmt(v),W-padR+8,y(v)+4)});
 ctx.setLineDash([]);
 
 const grad=ctx.createLinearGradient(0,padT,0,H-padB); grad.addColorStop(0,col+'55'); grad.addColorStop(1,col+'00');
 ctx.beginPath(); ctx.moveTo(x(0),H-padB); d.forEach((v?: any, i?: any)=>ctx.lineTo(x(i),y(v))); ctx.lineTo(x(d.length-1),H-padB); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
 ctx.beginPath(); d.forEach((v?: any, i?: any)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v))); ctx.strokeStyle=col; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.stroke();
 ctx.beginPath(); ctx.arc(x(d.length-1),y(last),4.5,0,7); ctx.fillStyle=col; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=cardC; ctx.stroke();
 const tsx=priceHistory(st.s,(PER[state.period]||PER['1G']).days).ts; const fm=(t: number)=>{const dt=new Date(t*1000);return state.period==='1G'?dt.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):dt.toLocaleDateString('tr-TR',{day:'numeric',month:'short'});}; const labels: any=tsx.length>1?[0,.5,1].map((q: number)=>fm(tsx[Math.min(tsx.length-1,Math.round(q*(tsx.length-1)))])):[];
 ctx.fillStyle=mutC;
 labels.forEach((l?: any, i?: any)=>{const xx=padL+i/(labels.length-1)*(W-padL-padR); ctx.textAlign=i===0?'left':i===labels.length-1?'right':'center'; ctx.fillText(l,xx,H-6)});
}

function ticketCalc(){
 const t=state.ticket, st=stock(t.s), h=holding(t.s), isBuy=t.side==='buy';
 const typed=t.price>0;                       // kullanıcı fiyat girdi mi
 const px=t.type==='market'?st.p:(typed?t.price:st.p);
 const gross=px*t.qty, comm=gross*commRate, tax=comm*bsmv, total=isBuy?gross+comm+tax:gross-comm-tax;
 const lockedQty=state.orders.filter((o: any)=>o.status==='pending'&&o.side==='sell'&&o.s===t.s).reduce((a?: any, o?: any)=>a+o.qty-o.filled,0);   // bekleyen satış emrindeki paylar
 const maxQty=isBuy?Math.floor(state.cash/(px*(1+commRate*(1+bsmv)))):Math.max(0,(h?h.q:0)-lockedQty);
 return{t,st,h,isBuy,px,typed,gross,comm,tax,total,maxQty};
}
/* Al · Sat: üstte koyu hisse paneli (fiyat, grafik, dönem çipleri, tavan-taban), altında beyaz emir formu.
   Uygulamanın üst şeridi ve menüsü yerinde kalır; bu yalnızca içerik alanıdır. */
/* Al · Sat: koyu panelde arama + Al/Sat + hisse başlığı + grafik; altta emir formu. Tek ekrana sığar, kaydırma yok. */
function renderTicket(){
 const {t,st,h,isBuy,px,typed,gross,maxQty}=ticketCalc();
 const needPrice=t.type!=='market' && !typed;   // limit / stop emrinde fiyat girilmeden emir verilmez
 const invalid=t.qty<=0||t.qty>maxQty||px<=0||needPrice;
 const ceil=st.pc*1.1, floor=st.pc*0.9;
 return `<section class="screen ticket">
  <div class="tpanel">
   <div class="tsearch">${ic.search}<input id="symSearch" placeholder="Bul" aria-label="Hisse bul" value="${state.ticketQuery||''}"></div>
   ${state.ticketQuery?`<div class="tresults">${STOCKS.filter((s: any)=>(s.s+' '+s.n).toLocaleLowerCase('tr').includes(state.ticketQuery.toLocaleLowerCase('tr'))).slice(0,5).map((s: any)=>`<button data-act="tsym" data-s="${s.s}">${av(s.s)}<b>${s.s}<em>${s.n}</em></b><span class="num ${cls(s.c)}">${pct(s.c)}</span></button>`).join('')||'<div class="empty">Eşleşen hisse yok.</div>'}</div>`:''}
   <div class="seg side big onpanel">
    <button data-act="tside" data-v="buy" class="${isBuy?'active buy':''}">Al</button>
    <button data-act="tside" data-v="sell" class="${!isBuy?'active sell':''}">Sat</button>
   </div>
   <div class="thead">
    ${av(st.s)}
    <div class="t"><b>${st.s}</b><span>${st.n}</span></div>
    <div class="p num"><b>${tl(st.p)}</b><span class="${cls(st.c)}">${pct(st.c)}</span></div>
   </div>
   <canvas class="tchart" id="chart" aria-label="${st.s} fiyat grafiği"></canvas>
   <div class="tperiods">${Object.keys(PER).map((p: any)=>`<button data-act="period" data-p="${p}" class="${p===state.period?'active':''}">${p==='5Y'?'Tümü':p}</button>`).join('')}</div>
   <div class="tlimits num">
    <div><span>Tavan</span><b>${tl(ceil)}</b></div>
    <div class="mid"><b>${fmt(st.p)}</b><em class="${cls(st.c)}">${pct(st.c)}</em></div>
    <div class="r"><span>Taban</span><b>${tl(floor)}</b></div>
   </div>
  </div>

  <div class="tsheet">
   <div class="field">
    <div class="seg small">${[['limit','Limit'],['market','Piyasa'],['stop','Stop']].map(([k,l]: any)=>`<button data-act="ttype" data-v="${k}" class="${t.type===k?'active':''}">${l}</button>`).join('')}</div>
   </div>

   ${t.type==='market'?`
   <div class="field"><label><span>Tutar (TL)</span><b class="num">Piyasa fiyatı ${tl(st.p)}</b></label>
    <div class="stepper amount"><input class="num" id="amountInput" inputmode="decimal" value="" placeholder="0,00" aria-label="Tutar"><span class="unit">₺</span></div>
   </div>`:`
   <div class="field"><label><span>${t.type==='stop'?'Tetik Fiyatı (TL)':'Fiyat (TL)'}</span></label>
    <div class="stepper"><button data-act="tprice" data-d="-1" aria-label="Fiyatı azalt">−</button><input class="num" id="priceInput" inputmode="decimal" value="${typed?fmt(t.price):''}" placeholder="0,00" aria-label="Fiyat"><button data-act="tprice" data-d="1" aria-label="Fiyatı artır">+</button></div>
   </div>`}

   <div class="field"><label><span>Adet</span><b class="num">Maks. ${fmt(maxQty,0)} adet</b></label>
    <div class="stepper"><button data-act="tqty" data-d="-1" aria-label="Adedi azalt">−</button><input class="num" id="qtyInput" inputmode="numeric" value="${t.qty>0?fmt(t.qty,0):''}" placeholder="0" aria-label="Adet"><button data-act="tqty" data-d="1" aria-label="Adedi artır">+</button></div>
    <div class="pcts">${[25,50,75,100].map((p: any)=>`<button data-act="tpct" data-v="${p}" class="${t.pct===p?'active':''}">%${p}</button>`).join('')}</div>
   </div>

   <div class="tsum num">
    <div><span>Tahmini Tutar</span><b>${tl(gross)}</b></div>
    <div><span>${isBuy?'Kullanılabilir Nakit':'Satılabilir Adet'}</span><b>${isBuy?tl(state.cash):fmt(h?h.q:0,0)+' adet'}</b></div>
   </div>
   ${invalid&&t.qty>maxQty?`<div class="err">${isBuy?'Bakiye yetersiz — en fazla '+fmt(maxQty,0)+' adet alabilirsiniz.':'Bu hissede satılabilir '+fmt(maxQty,0)+' adediniz var.'}</div>`:''}
   <button class="btn tbig ${isBuy?'buy':'sell'}" data-act="review" ${invalid?'disabled':''}>${isBuy?'Al':'Sat'}</button>
  </div>
 </section>`;
}

function renderPortfolio(){
 const pf=portfolio(), hide=state.hidden, tab=state.pfTab;
 const alloc=[...pf.rows.map((r: any)=>({n:r.s,v:r.v,c:color(r.s)})),{n:'Nakit',v:state.cash,c:'#CBDC6E'}];
 const amax=Math.max.apply(null,alloc.map(function(a?: any){return a.v}))||1;
 /* Gizleme açıkken rakamlar yerinde nokta olur; biçim ve genişlik korunur. */
 const m=(v: any)=>hide?String(v).replace(/[0-9]/g,"•"):v;
 const realized=state.sold.reduce((a?: any, x?: any)=>a+x.q*(x.px-x.cost),0);
 // Üstteki sekme yalnızca aşağıdaki bölümü değiştirir; sayfa yerinde kalır (kaydırma oynamaz).
 const seg='<div class="seg pf" id="pfseg">'
  +'<button data-act="ptab" data-v="holdings" class="'+(tab==='holdings'?'active':'')+'">Pozisyonlar</button>'
  +'<button data-act="ptab" data-v="sold" class="'+(tab==='sold'?'active':'')+'">Geçmiş</button>'
  +'<button data-act="ptab" data-v="orders" class="'+(tab==='orders'?'active':'')+'">Emirler</button>'
  +'</div>';

 /* Pozisyonlar: her hisse için kart — üstte logo, kod, ad ve yüzde hapı; altta adet / maliyet / fiyat / tutar / kâr. */
 const holdings=`
  <div class="poslist">${pf.rows.length?pf.rows.map((r: any)=>`<button class="poscard" data-act="trade" data-side="sell" data-s="${r.s}">
   <span class="ptop">${av(r.s,'plogo')}<span class="t"><b>${r.s}</b><span>${r.st.n}</span></span><span class="ppill ${cls(r.pl)}">${pct(r.plp)}</span></span>
   <span class="pgrid num">
    <span><em>Adet</em><b>${fmt(r.q,0)}</b></span>
    <span><em>Ort. Maliyet</em><b>${tl(r.cost)}</b></span>
    <span><em>Güncel Fiyat</em><b>${tl(r.st.p)}</b></span>
    <span><em>Alım Tutarı</em><b>${tl(r.c)}</b></span>
    <span><em>Kar/Zarar</em><b class="${cls(r.pl)}">${(r.pl>=0?'+':'−')+tl(Math.abs(r.pl))}</b></span>
   </span>
  </button>`).join(''):'<div class="card"><div class="empty">Henüz pozisyonunuz yok.</div></div>'}</div>`;
 /* Geçmiş: gerçekleşen alış ve satış işlemleri; sağda yüzde getiri (üstte) ve kâr/zarar tutarı. */
 const hist=[
  ...state.sold.map((x?: any, i?: any)=>({k:'sell',s:x.s,q:x.q,px:x.px,d:x.d,pl:x.q*(x.px-x.cost),plp:x.plp,ix:i})),
  ...state.orders.filter((o: any)=>o.status==='filled'&&o.side==='buy').map((o: any)=>({k:'buy',s:o.s,q:o.qty,px:o.price,d:o.t.split(' · ')[0]}))
 ];
 const hf=state.histF||'all', hlist=hist.filter((h: any)=>hf==='all'||h.k===hf);
 const sold=`
  <div class="hfilter">
   <div class="hf">
    <button data-act="hf" data-v="all" class="${hf==='all'?'active':''}">Tümü</button>
    <button data-act="hf" data-v="buy" class="${hf==='buy'?'active':''}">${ic.down} Alış</button>
    <button data-act="hf" data-v="sell" class="${hf==='sell'?'active':''}">${ic.up} Satış</button>
   </div>
   <span class="hcount">${hlist.length} işlem</span>
  </div>
  <div class="card hcard">${hlist.length?hlist.map((h: any)=>`<button class="hrow" data-act="${h.k==='sell'?'sale':'detail'}" data-i="${h.ix}" data-s="${h.s}">
    ${av(h.s,"hic")}
    <span class="t"><b>${h.s} <i class="htag ${h.k}">${h.k==='sell'?'SATIŞ':'ALIŞ'}</i></b><span class="num">${fmt(h.q,0)} adet · ${tl(h.px)}</span></span>
    <span class="r num">${h.k==='sell'
      ? `<b class="${cls(h.plp)}">${pct(h.plp)}</b><em class="${cls(h.pl)}">${(h.pl>=0?'+':'−')+tl(Math.abs(h.pl))}</em>`
      : `<b>${tl(h.q*h.px)}</b><em class="gray">${h.d}</em>`}</span>
   </button>`).join(''):'<div class="empty">İşlem kaydı yok.</div>'}
  </div>
  <div class="card flat"><div class="summary num">
   <div><span>Toplam satış tutarı</span><b>${tl(state.sold.reduce((a?: any, x?: any)=>a+x.q*x.px,0))}</b></div>
   <div><span>Toplam maliyet</span><b>${tl(state.sold.reduce((a?: any, x?: any)=>a+x.q*x.cost,0))}</b></div>
   <div class="tot"><span>Gerçekleşen kâr/zarar</span><b class="${cls(realized)}">${(realized>=0?'+':'−')+tl(Math.abs(realized))}</b></div>
  </div></div>`;
 const orders=`
  <div class="tabs otabs"><button data-act="otab" data-v="pending" class="${state.ordersTab==='pending'?'active':''}">Bekleyen (${state.orders.filter((o: any)=>o.status==='pending').length})</button><button data-act="otab" data-v="history" class="${state.ordersTab==='history'?'active':''}">Geçmiş</button><button class="newo" data-act="ticket" data-side="buy" data-s="${state.ticket.s}">+ Yeni Emir</button></div>
  <div class="card">${orderList()}</div>`;

 return `<section class="screen">
  <div class="hero sky"><img class="heroimg" alt="" src="${SKY[skyKind()]}">
   <button class="eye" data-act="hide" aria-label="Bakiyeyi gizle">${ic.eye}</button>
   <div class="val num"><span>${m(tl(pf.total))}</span></div>
   <div class="plline num"><b class="${cls(pf.pl)}">${m((pf.pl>=0?"+":"−")+tl(Math.abs(pf.pl)))} (${m(pct(pf.plp))})</b><em>toplam kâr</em></div>
   <div class="hsplit num">
    <div><span>Kullanılabilir</span><b>${m(tl(state.cash))}</b></div>
    <div><span>T+2 Bakiye</span><b>${m(tl(state.cash))}</b></div>
   </div>
  </div>
  <div class="card">
   <button class="sec alloc-head" data-act="alloc" style="margin:0" aria-expanded="${state.allocOpen?"true":"false"}"><div><h3>Varlık Dağılımı</h3><p>Portföyünüzdeki varlıkların dağılımı</p></div><span class="chip neutral">${ic.pie} ${alloc.length} Varlık</span><span class="acaret ${state.allocOpen?"on":""}">${ic.caretS}</span></button>${state.allocOpen?`
   <div class="allocwrap">
    <div class="donut">
     <svg viewBox="0 0 120 120" aria-hidden="true">${(()=>{let acc=0;const R=46,C=2*Math.PI*R;return alloc.map((a: any)=>{const f=a.v/pf.total,s=`<circle cx="60" cy="60" r="${R}" fill="none" stroke="${a.c}" stroke-width="17" stroke-dasharray="${(f*C).toFixed(2)} ${(C-f*C).toFixed(2)}" stroke-dashoffset="${(-acc*C).toFixed(2)}" transform="rotate(-90 60 60)"/>`;acc+=f;return s}).join('')})()}</svg>
     <div class="dcenter"><span>Toplam</span><b class="num">${m(tl(pf.total))}</b></div>
    </div>
    <div class="alist">${alloc.map((a: any)=>`<div class="arow"><i style="background:${a.c}"></i><b>${a.n}</b><em class="num">%${fmt(a.v/pf.total*100,1)}</em><span class="bar"><u style="width:${(a.v/amax*100).toFixed(0)}%;background:${a.c}"></u></span><span class="v num">${m(tl(a.v))}</span></div>`).join('')}</div>
   </div>`:''}
  </div>
  ${seg}
  ${tab==='sold'?sold:tab==='orders'?orders:holdings}
 </section>`;
}

/* Emir listesi: hem Emirler sekmesinde hem portföyün "Emirler" bölümünde kullanılır. */
function orderList(){
 const tab=state.ordersTab, list=state.orders.filter((o: any)=>tab==='pending'?o.status==='pending':o.status!=='pending');
 const statusChip=(o: any)=>o.status==='pending'?'<span class="chip warn">Bekliyor</span>':o.status==='filled'?'<span class="chip up">Gerçekleşti</span>':'<span class="chip neutral">İptal</span>';
 if(!list.length) return `<div class="empty">${tab==='pending'?'Bekleyen emir bulunmuyor':'Geçmiş emir bulunmuyor'}</div>`;
 return list.map((o: any)=>{const st=stock(o.s);return `<div class="order">
   <div class="r1"><div class="side-tag ${o.side}">${o.side==='buy'?'AL':'SAT'}</div><div class="t"><b>${o.s} · ${typeName(o.type)}</b><span>${st.n}</span></div>${statusChip(o)}</div>
   <div class="r2 num"><div><span>Fiyat</span><b>${tl(o.price)}</b></div><div><span>Gerçekleşen / Adet</span><b>${fmt(o.filled,0)} / ${fmt(o.qty,0)}</b></div><div><span>Tutar</span><b>${tl(o.price*o.qty)}</b></div></div>
   <div class="r3"><span class="num">${o.id} · ${o.t} · ${o.tif}</span>${o.status==='pending'?`<button data-act="cancel" data-id="${o.id}">İptal Et</button>`:''}</div>
  </div>`}).join('');
}

function renderOrders(){
 const tab=state.ordersTab, list=state.orders.filter((o: any)=>tab==='pending'?o.status==='pending':o.status!=='pending');
 const statusChip=(o: any)=>o.status==='pending'?'<span class="chip warn">Bekliyor</span>':o.status==='filled'?'<span class="chip up">Gerçekleşti</span>':'<span class="chip neutral">İptal</span>';
 return `<section class="screen">
  <div class="sec" style="margin-top:0"><h3>Emirlerim</h3><button data-act="ticket" data-side="buy" data-s="${state.ticket.s}">+ Yeni Emir</button></div>
  <div class="tabs otabs"><button data-act="otab" data-v="pending" class="${tab==='pending'?'active':''}">Bekleyen (${state.orders.filter((o: any)=>o.status==='pending').length})</button><button data-act="otab" data-v="history" class="${tab==='history'?'active':''}">Geçmiş</button></div>
  <div class="card">${list.length?list.map((o: any)=>{const st=stock(o.s);return `<div class="order">
   <div class="r1"><div class="side-tag ${o.side}">${o.side==='buy'?'AL':'SAT'}</div><div class="t"><b>${o.s} · ${typeName(o.type)}</b><span>${st.n}</span></div>${statusChip(o)}</div>
   <div class="r2 num"><div><span>Fiyat</span><b>${tl(o.price)}</b></div><div><span>Gerçekleşen / Adet</span><b>${fmt(o.filled,0)} / ${fmt(o.qty,0)}</b></div><div><span>Tutar</span><b>${tl(o.price*o.qty)}</b></div></div>
   <div class="r3"><span class="num">${o.id} · ${o.t} · ${o.tif}</span>${o.status==='pending'?`<button data-act="cancel" data-id="${o.id}">İptal Et</button>`:''}</div>
  </div>`}).join(''):`<div class="empty">${tab==='pending'?'Bekleyen emir bulunmuyor':'Geçmiş emir bulunmuyor'}</div>`}</div>
 </section>`;
}

/* Hesap (profil): başlık, kullanıcı kartı, bakiye kartı, hesap işlemleri, bilgiler-ayarlar ve uygulama tercihleri. */
/* Hesap: profil kartı, finansal özet, hızlı işlemler, bakiye geçmişi, hesap işlemleri ve diğer ayarlar. */
function renderProfile(){
 const pf=portfolio(), hide=state.hidden, dark=state.theme==='dark';
 const m=(v: any)=>hide?String(v).replace(/[0-9]/g,"•"):v;
 const acc=state.accounts.find((x: any)=>x.no===state.auth.no)||{user:state.auth.user,no:state.auth.no};
 const reserved=state.orders.filter((o: any)=>o.status==='pending'&&o.side==='buy').reduce((a?: any, o?: any)=>a+o.price*o.qty*(1+commRate*(1+bsmv)),0);
 const row=(icon?: any, t?: any, s?: any, act?: any, extra?: any)=>`<button data-act="${act}"><span class="ic">${icon}</span><div class="t"><b>${t}</b><span>${s}</span></div>${extra||''}${ic.chev}</button>`;
 const quick=(icon?: any, t?: any, act?: any)=>`<button class="qtile" data-act="${act}"><span class="qi">${icon}</span><span>${t}</span></button>`;
 const me: any=MeridyenAuth.getUser(state.auth.no)||{};
 return `<section class="screen">
  <button class="card profcard" data-act="personal" aria-label="Kişisel bilgileri düzenle">
   <span class="big">${esc(initials(acc.user))}</span>
   <b>${esc(acc.user)}</b>
   <span class="mno">Müşteri No: ${esc(acc.no)}</span>
   ${ic.chev}
  </button>

  <div class="slabel">Finansal özet<button class="eye2" data-act="hide" aria-label="Bakiyeyi gizle">${ic.eye}</button></div>
  <div class="card finsum">
   <div><span>Kullanılabilir bakiye</span><b class="num accent">${m(tl(state.cash))}</b></div>
   <div><span>${ic.lock} Emirlerdeki bakiye</span><b class="num warn">${m(tl(reserved))}</b></div>
   <div><span>Portföy değeri</span><b class="num">${m(tl(pf.value))}</b></div>
   <div class="tot"><span>Toplam değer</span><b class="num">${m(tl(pf.total))}</b></div>
  </div>

  <div class="quick4">
   ${quick(ic.down,'Para yatır','deposit')}
   ${quick(ic.up,'Para çek','withdraw')}
   ${quick(ic.bank,'Banka hesaplarım','banks')}
   ${quick(ic.doc,'İşlem geçmişi','ledger')}
  </div>

  <div class="slabel">İşlem Geçmişi<button class="lnk" data-act="ledger">Tümü</button></div>
  <div class="card"><div class="setlist">${ledgerRows(3)}</div></div>

  <div class="slabel">Hesap İşlemleri</div>
  <div class="card"><div class="setlist">
   ${row(ic.user,'Kişisel bilgiler','Kimlik ve iletişim bilgilerinizi yönetin','personal')}
   ${row(ic.shield,'Güvenlik','Şifre, iki adımlı doğrulama ve güvenlik ayarları','security')}
   ${row(ic.checkS,'Kimlik Doğrulama','Onaylandı','kyc')}
   ${row(ic.bank,'Banka hesaplarım','Para yatırma ve çekme işlemleri için hesaplarınız','banks')}
   ${row(ic.doc,'Sözleşmeler','Çerçeve sözleşme, risk bildirimi ve bilgilendirme metinleri','contracts')}
  </div></div>

  <div class="slabel">Diğer</div>
  <div class="card"><div class="setlist">
   <div class="setrow"><span class="ic">${ic.moon}</span><div class="t"><b>Karanlık Mod</b><span>Uygulama görünümünü özelleştirin</span></div>
    <button class="sw ${dark?'on':''}" data-act="theme" role="switch" aria-checked="${dark}"><i></i></button></div>
   <div class="setrow"><span class="ic">${ic.text}</span><div class="t"><b>Yazı Boyutu</b><span>Uygulama genelinde yazı ölçüsü</span></div>
    <div class="fsseg">${[['small','A'],['normal','A'],['large','A']].map(function(o?: any){return '<button data-act="fs" data-v="'+o[0]+'" class="'+(state.fontSize===o[0]?'active':'')+'">'+o[1]+'</button>'}).join('')}</div></div>
   <div class="setrow"><span class="ic">${ic.lock}</span><div class="t"><b>Her Girişte Şifre Sor</b><span>Uygulama her açıldığında giriş ekranı gelsin</span></div>
    <button class="sw ${!state.auth.remember?'on':''}" data-act="askpw" role="switch" aria-checked="${!state.auth.remember}"><i></i></button></div>
   ${row(ic.bell,'Bildirim ayarları','Fiyat, haber ve işlem bildirimleri','notifSet')}
   ${row(ic.help,'Yardım ve destek','Sıkça sorulan sorular ve iletişim','help')}
   ${row(ic.gift,'Referans Fırsatları','Arkadaşını davet et, ikiniz de kazanın','referral')}
   ${row(ic.dl,'Uygulamayı Yükle','Mobil uygulamayı cihazınıza indirin','install')}
   ${row(ic.grid,'Uygulama hakkında','Sürüm 1.0.0 · Sürümünüz güncel.','about')}
  </div></div>

  <button class="card logout" data-act="logout">${ic.out} Çıkış Yap</button>
  <div class="note" style="text-align:center">Meridyen Yatırım Menkul Değerler A.Ş. · SPK lisanslı · Yatırımcı Tazmin Merkezi üyesi<br>Prototip — tüm veriler örnektir.</div>
 </section>`;
}

/* Satış detayı: Geçmiş sekmesinde bir satıra dokununca açılır. Ortadaki grafik, pay elimizdeyken
   maliyetten satış fiyatına kadar izlediği yolu gösterir; dönem seçici, eksen yazıları ve rozet yok. */
function holdPath(x?: any, w?: any, h?: any, pad?: any){
 const r=rng(x.s+'hold'+x.d), n=46, v=[];
 for(let i=0;i<n;i++){
  const t=i/(n-1), base=x.cost+(x.px-x.cost)*t;
  v.push(i===0?x.cost:i===n-1?x.px:base+(r()-0.5)*Math.max(x.cost,x.px)*0.035);
 }
 const lo=Math.min.apply(null,v), hi=Math.max.apply(null,v), sp=(hi-lo)||1;
 const px=(i: any)=>pad+(w-pad*2)*(i/(n-1)), py=(k: any)=>pad+(h-pad*2)*(1-(k-lo)/sp);
 const line=v.map((k?: any, i?: any)=>`${i?'L':'M'}${px(i).toFixed(1)} ${py(k).toFixed(1)}`).join(' ');
 return {line, area:`${line} L${px(n-1).toFixed(1)} ${h} L${px(0).toFixed(1)} ${h} Z`, last:[px(n-1),py(v[n-1])]};
}
/* Satış detayı: sayfa değişmeden, ortada açılan kart; arka plan puslanır. */
function openSale(ix?: any){ state.saleIx=ix; state.saleSheet=true; drawSale(); }
function drawSale(){
 const x=state.sold[state.saleIx]; if(!x){ closeSheet(); return; }
 $id("layer").innerHTML=`<div class="overlay blur mid" id="ov"><div class="sheet2 sale" role="dialog" aria-label="Satış detayı"><button class="xbtn" data-act="closeSheet" aria-label="Kapat">${ic.close}</button>${saleBody(x)}</div></div>`;
 bind($id("layer"));
}
function saleBody(x?: any){
 const st=stock(x.s)||{n:x.s,sec:""};
 const gain=x.q*(x.px-x.cost), up=gain>=0, c=up?"var(--up)":"var(--down)";
 const g=holdPath(x,320,132,10);
 return `
  <div class="card">
   <div class="shead">${av(x.s)}<div class="t"><b>${x.s} <i class="stag2">Satış</i></b><span>${st.n}${st.sec?' · '+st.sec:''}</span></div></div>
   <div class="sprice num"><b>${tl(x.px)}</b></div>
   <div class="ssub">${x.d}${x.sa?" · "+x.sa:""} · pozisyon kapatıldı</div>
   <div class="snet"><div class="snhead"><span>Net Kazanç</span><span class="chip ${up?"up":"down"}">${pct(x.plp)}</span></div><b class="num" style="color:${c}">${(up?"+":"−")+tl(Math.abs(gain))}</b></div>
   <div class="schart">
    <svg viewBox="0 0 320 132" preserveAspectRatio="none" aria-label="${x.s} elde tutulan dönem grafiği">
     <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
     <path d="${g.area}" fill="url(#sg)"/>
     <path d="${g.line}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
     <circle cx="${g.last[0].toFixed(1)}" cy="${g.last[1].toFixed(1)}" r="4" fill="${c}"/>
    </svg>
   </div>
   <div class="sgrid num">
    <div><span>Adet</span><b>${fmt(x.q,0)}</b></div>
    <div><span>Satış Fiyatı</span><b>${tl(x.px)}</b></div>
    <div><span>Toplam</span><b>${tl(x.q*x.px)}</b></div>
    <div><span>Ort. Alış</span><b>${tl(x.cost)}</b></div>
    <div><span>Maliyet</span><b>${tl(x.q*x.cost)}</b></div>
    <div><span>Getiri</span><b>${tl(x.q*x.px)}</b></div>   <!-- getiri = satıştan eline geçen tutar; Net K/Z = getiri − maliyet -->
   </div>
  </div>
  `;
}

function renderSuccess(){
 const o=state.lastOrder;
 return `<section class="screen">
  <div class="card success">
   <div class="ck">${ic.check}</div>
   <h3>${o.status==='filled'?'Emriniz Gerçekleşti':'Emriniz İletildi'}</h3>
   <p>${o.status==='filled'?'İşlem tamamlandı, portföyünüz güncellendi.':(o.side==='buy'?'Alış':'Satış')+' emriniz borsaya gönderildi. Eşleşme durumunu Emirlerim\'den takip edebilirsiniz.'}</p>
   <div class="sym num" style="margin-top:18px">${av(o.s)}<div class="t"><b>${o.s} · ${typeName(o.type)} ${o.side==='buy'?'Alış':'Satış'}</b><span>${o.id} · ${o.t}</span></div><div class="r"><b>${fmt(o.qty,0)} adet</b><span>${tl(o.price)}</span></div></div>
  </div>
  <button class="btn primary" data-act="orders">Emirlerime Git</button>
  <button class="btn ghost" data-act="goto" data-v="portfolio">Portföyüm</button>
 </section>`;
}

/* Portföydeki bir hisseye dokununca açılan hızlı Al · Sat sayfası; arkada kalan ekran puslanır. */
function openTrade(sym?: any, side?: any){
 Object.assign(state.ticket,{s:sym,side:side==='sell'?'sell':'buy',type:'market',price:null,qty:0,pct:null});
 state.tradeSheet=sym;
 drawTrade();
}
/* Sayfa açıkken yalnızca içeriği tazelenir; kutu yeniden açılmaz, arka plan yeniden solmaz — böylece ekran zıplamaz. */
function drawTrade(){
 const layer=$id("layer"), cur=layer.querySelector(".sheet.trade");
 const html=tradeHTML();
 if(cur) cur.innerHTML=html;
 else layer.innerHTML=`<div class="overlay blur" id="ov"><div class="sheet trade" role="dialog" aria-label="Al sat">${html}</div></div>`;
 bind(layer);
}
function tradeHTML(){
 const {t,st,h,isBuy,px,typed,gross,maxQty}=ticketCalc();
 const invalid=t.qty<=0||t.qty>maxQty||px<=0;
 return `
  <div class="grab"></div>
  <div class="sym">${av(st.s)}<div class="t"><b>${st.s}</b><span>${st.n}</span></div><div class="r num"><b>${tl(st.p)}</b><span class="${cls(st.c)}">${pct(st.c)}</span></div></div>
  <div class="seg side big" style="margin-top:12px">
   <button data-act="tside" data-v="buy" class="${isBuy?'active buy':''}">Al</button>
   <button data-act="tside" data-v="sell" class="${!isBuy?'active sell':''}">Sat</button>
  </div>
  <div class="field"><label>Emir Tipi</label>
   <div class="seg small">${[['limit','Limit'],['market','Piyasa'],['stop','Stop']].map(([k,l]: any)=>`<button data-act="ttype" data-v="${k}" class="${t.type===k?'active':''}">${l}</button>`).join('')}</div>
  </div>
  ${t.type==='market'
   ?`<div class="field"><label><span>Tutar (TL)</span><b class="num">Piyasa fiyatı ${tl(st.p)}</b></label>
     <div class="stepper amount"><input class="num" id="amountInput" inputmode="decimal" value="" placeholder="0,00" aria-label="Tutar"><span class="unit">₺</span></div></div>`
   :`<div class="field"><label><span>${t.type==='stop'?'Tetik Fiyatı (TL)':'Fiyat (TL)'}</span></label>
     <div class="stepper"><button data-act="tprice" data-d="-1" aria-label="Fiyatı azalt">−</button><input class="num" id="priceInput" inputmode="decimal" value="${typed?fmt(t.price):''}" placeholder="0,00" aria-label="Fiyat"><button data-act="tprice" data-d="1" aria-label="Fiyatı artır">+</button></div></div>`}
  <div class="field"><label><span>Adet</span><b class="num">Maks. ${fmt(maxQty,0)} adet</b></label>
   <div class="stepper"><button data-act="tqty" data-d="-1" aria-label="Adedi azalt">−</button><input class="num" id="qtyInput" inputmode="numeric" value="${t.qty>0?fmt(t.qty,0):''}" placeholder="0" aria-label="Adet"><button data-act="tqty" data-d="1" aria-label="Adedi artır">+</button></div>
   <div class="pcts">${[25,50,75,100].map((p: any)=>`<button data-act="tpct" data-v="${p}" class="${t.pct===p?'active':''}">%${p}</button>`).join('')}</div>
  </div>
  <div class="tsum num">
   <div><span>Tahmini Tutar</span><b>${tl(gross)}</b></div>
   <div><span>${isBuy?'Kullanılabilir Nakit':'Satılabilir Adet'}</span><b>${isBuy?tl(state.cash):fmt(h?h.q:0,0)+' adet'}</b></div>
  </div>
  ${invalid&&t.qty>maxQty?`<div class="err">${isBuy?'Bakiye yetersiz — en fazla '+fmt(maxQty,0)+' adet alabilirsiniz.':'Bu hissede satılabilir '+fmt(maxQty,0)+' adediniz var.'}</div>`:''}
  <div class="acts"><button class="btn ghost" data-act="detailSheet" data-s="${st.s}">Hisse Detayı</button><button class="btn ${isBuy?'buy':'sell'}" data-act="review" ${invalid?'disabled':''}>${isBuy?'Al':'Sat'}</button></div>
 `;
}

/* ---------- confirm sheet ---------- */
function openConfirm(){
 state.tradeSheet=null;   // onay sayfası hızlı al · sat sayfasının yerini alır
 const {t,st,isBuy,px,gross,comm,tax,total}=ticketCalc();
 $id('layer').innerHTML=`<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-label="Emir onayı">
  <div class="grab"></div>
  <h3>${isBuy?'Alış':'Satış'} Emrini Onayla</h3>
  <div class="sub2">Lütfen emir detaylarını kontrol edin.</div>
  <div class="sym">${av(st.s)}<div class="t"><b>${st.s}</b><span>${st.n}</span></div><span class="chip ${isBuy?'up':'down'}">${isBuy?'ALIŞ':'SATIŞ'}</span></div>
  <div class="summary num" style="margin-top:14px">
   <div><span>Emir Tipi</span><b>${typeName(t.type)} · ${t.tif}</b></div>
   <div><span>${t.type==='market'?'Tahmini Fiyat':'Fiyat'}</span><b>${tl(px)}</b></div>
   <div><span>Adet</span><b>${fmt(t.qty,0)}</b></div>
   <div><span>İşlem Tutarı</span><b>${tl(gross)}</b></div>
   <div class="tot"><span>${isBuy?'Ödenecek Toplam':'Hesaba Geçecek'}</span><b>${tl(total)}</b></div>
  </div>
  <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn ${isBuy?'buy':'sell'}" data-act="submit">${ic.checkS} Onayla</button></div>
 </div></div>`;
 bind($id('layer'));
}
function closeSheet(){ state.tradeSheet=null; state.saleSheet=false; $id("layer").innerHTML=""; }

/* ---------- giriş / oturum ---------- */
/* İşlem yapılan bölümler giriş ister; piyasa verileri ve haberler serbesttir. */
const AUTH_SCREENS=['portfolio','ticket','orders','watch','profile','success'];
function needsAuth(sc?: any){ return AUTH_SCREENS.indexOf(sc)>=0; }
function initials(n?: any){ return (n||'').trim().split(/\s+/).slice(0,2).map((w: any)=>w[0]||'').join('').toLocaleUpperCase('tr')||'M'; }
/* Web sürümü: giriş, kayıt ve hesap değişimi ayrı sayfalarda yapılır (giris.html / kayit.html).
   Oturum MeridyenAuth modülündedir; uygulama yalnızca onu okur. */
const DEMO_MODE=/[?&]demo=1\b/.test(location.search);
const START_CASH=100000;   // yeni hesaplara tanımlanan başlangıç bakiyesi
const SITE_ROOT='/';
function topNav(url?: any){ try{ (window.top||window).location.href=url; }catch(e){ location.href=url; } }
function openLogin(next?: any, opts?: any){ topNav('/giris?next=/app'); }
/* Hesap listesi: bu tarayıcıda kayıtlı hesaplar ve "Yeni Hesap Aç". */
function openAccounts(){
 const a=state.auth;
 $id('layer').innerHTML=`<div class="overlay" id="ov"><div class="sheet lgn" role="dialog" aria-label="Hesaplar">
  <div class="grab"></div>
  <h3>Hesaplar</h3>
  <div class="sub2">Hesap değiştirin ya da yeni bir hesap ekleyin.</div>
  <div class="setlist">
   ${state.accounts.map((x: any)=>{const act=x.no===a.no&&a.in; return `<button data-act="pickAcct" data-no="${esc(x.no)}"><span class="ic${act?' lime':''}">${esc(initials(x.user))}</span><div class="t"><b>${esc(x.user)}</b><span>Müşteri No: ${esc(x.no)}</span></div>${act?`<span class="chip lime">${ic.checkS} Etkin</span>`:ic.chev}</button>`;}).join('')}
   <button data-act="addAcct"><span class="ic">${ic.plus}</span><div class="t"><b>Başka Hesap Ekle</b><span>Farklı bir müşteri numarasıyla giriş yapın</span></div>${ic.chev}</button>
  </div>
  ${a.in?`<div class="acts"><button class="btn ghost" data-act="logout">Çıkış Yap</button></div>`:''}
 </div></div>`;
 bind($id('layer'));
}
function pickAccount(no?: any){
 if(state.auth.in && state.auth.no===no){ closeSheet(); return; }   // zaten bu hesaptasınız
 if(DEMO_MODE){ topNav('/giris?no='+encodeURIComponent(no)+'&next=/app'); return; }
 MeridyenAuth.flushState(); void MeridyenAuth.signOut();   // hesap değişince şifre yeniden sorulur
 topNav('/giris?no='+encodeURIComponent(no)+'&next=/app');
}
async function addAccount(){ if(!DEMO_MODE){ MeridyenAuth.flushState(); await MeridyenAuth.signOut(); } topNav('/giris?next=/app'); }
async function logout(){
 if(DEMO_MODE){ topNav('/giris'); return; }
 persistApp(); MeridyenAuth.flushState(); await MeridyenAuth.signOut();
 topNav('/giris?cikis=1');
}
function saveAuth(){ if(!DEMO_MODE) MeridyenAuth.setRemember(state.auth.remember); }
function loadAuth(){
 if(DEMO_MODE){ state.auth.in=true; state.auth.user='Demo Kullanıcı'; state.auth.no=MeridyenAuth.DEMO.no; state.accounts=[{no:state.auth.no,user:state.auth.user}]; return; }
 const u=MeridyenAuth.current();
 if(!u){ state.auth.in=false; return; }
 state.auth.in=true; state.auth.user=u.name; state.auth.no=u.no; state.auth.remember=u.remember;
 state.accounts=MeridyenAuth.accounts();
 const saved: any=preloadedState;
 if(saved && saved.v===1){ PERSIST_KEYS.forEach((k: any)=>{ if(saved[k]!==undefined) state[k]=saved[k]; }); }
 else if(!u.demo){   // yeni hesap: boş portföy ve başlangıç bakiyesi
  state.cash=START_CASH; state.holdings=[]; state.orders=[]; state.sold=[]; state.sampleData=false; state.firstRun=true;
 }
}
/* Portföy, emirler ve tercihler hesaba özel saklanır; tanıtım önizlemesi kalıcı değildir. */
const PERSIST_KEYS=['cash','holdings','orders','sold','theme','fontSize','hidden','sampleData','watch','alarms','notes','ledger','banks','tickets','ipoReq','notif','newsOff','mktView','mktSort'];
function persistApp(){
 if(DEMO_MODE || !state.auth.in) return;
 const o: any={v:1}; PERSIST_KEYS.forEach((k: any)=>o[k]=state[k]); MeridyenAuth.saveState(o);
}
function esc(v?: any){ return String(v==null?'':v).replace(/[&<>"']/g,(c: any)=>(({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}) as any)[c]); }
function submitOrder(){
 const {t,st,isBuy,px,gross}=ticketCalc();
 const fee=gross*commRate*(1+bsmv);
 const now=new Date(); const id=orderId();
 const tstr=now.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})+' · '+now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
 const fills=t.type==='market'||(t.type==='limit'&&(isBuy?px>=st.p:px<=st.p));
 const o={id,s:t.s,side:t.side,type:t.type,price:px,qty:t.qty,filled:fills?t.qty:0,tif:t.tif,status:fills?'filled':'pending',t:tstr};
 if(fills){
  const h=holding(t.s);
  if(isBuy){ state.cash-=gross+fee; if(h){h.cost=(h.cost*h.q+px*t.qty)/(h.q+t.qty);h.q+=t.qty}else state.holdings.push({s:t.s,q:t.qty,cost:px}); }
  else { state.cash+=gross-fee; recordSale(t.s,t.qty,h.cost,px); h.q-=t.qty; if(h.q<=0) state.holdings=state.holdings.filter((x: any)=>x!==h); }
 } else if(isBuy){ state.cash-=gross+fee; }
 state.orders.unshift(o); state.lastOrder=o; afterOrder(o,gross,fee); state.ticket.qty=0; state.ticket.price=null; state.ticket.pct=null;
 closeSheet();
 render();                 // sayfa değişmez; portföy ve nakit yerinde güncellenir
 orderToast(o);            // üstte 2 saniyelik "alındı / satıldı · Takas T+2" bildirimi
}
/* Emir sonucu bildirimi: BIST'te hisse takası T+2'dir (işlem günü + 2 iş günü). */
let orderT: any;
function orderToast(o?: any){
 const buy=o.side==='buy';
 const head=o.status==='filled'
  ? `${fmt(o.qty,0)} adet ${o.s} ${buy?'alındı':'satıldı'}`
  : `${o.s} ${buy?'alış':'satış'} emri iletildi`;
 const sub=o.status==='filled'
  ? (buy?'Paylar T+2 takasında hesabınıza geçer':'Tutar T+2 takasında hesabınıza geçer')
  : 'Emir eşleşince takas T+2 işler';
 let el=$id('otoast');
 if(!el){ el=document.createElement('div'); el.id='otoast'; el.className='otoast'; document.body.appendChild(el); }
 el.innerHTML=`<span class="ck">${ic.checkS}</span><span class="t"><b>${head}</b><em>${sub}</em></span>`;
 requestAnimationFrame(()=>el.classList.add('show'));
 clearTimeout(orderT);
 orderT=setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>{ if(el.parentNode) el.remove(); },260); },2000);
}
let toastT: any; function toast(msg?: any){ let el=$id('toast'); if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)} el.innerHTML=ic.checkS+'<span>'+esc(msg)+'</span>'; clearTimeout(toastT); toastT=setTimeout(()=>el.remove(),2200); }

/* ---------- ticket helpers ---------- */
/* Emir alanları değişince: hızlı al · sat sayfası açıksa yalnız o tazelenir, değilse ekran yerinde kalarak çizilir. */
function refresh(){ if(state.tradeSheet){ drawTrade(); return; } state.keepScroll=true; render(); }
function tick(st?: any){ return st.p<20?0.01:st.p<50?0.02:st.p<100?0.05:st.p<250?0.10:st.p<500?0.25:st.p<1000?0.50:1; }
function setPct(p?: any){ const {t,maxQty}=ticketCalc(); t.qty=Math.max(1,Math.floor(maxQty*p/100)); t.pct=p; }
function parseNum(v?: any){ return parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0 }

/* ---------- events ---------- */
function bind(root: any = main){
 root.querySelectorAll('[data-act]').forEach((el: any)=>{ el.onclick=()=>{ const a=el.dataset;
  switch(a.act){
   case 'detail': go('detail',{set:{detail:a.s,period:'1G'}}); break;
   case 'back': back(); break;
   case 'period': state.period=a.p; refresh(); break;
   case 'ticket': Object.assign(state.ticket,{s:a.s,side:a.side,price:null,qty:0,pct:null}); go('ticket'); break;
   case 'tsym': Object.assign(state.ticket,{s:a.s,price:null,pct:null}); state.ticketQuery=''; render(); break;
   case 'tside': state.ticket.side=a.v; state.ticket.pct=null; if(a.v==='sell'&&!holding(state.ticket.s)) toast('Bu hissede pozisyonunuz yok'); refresh(); break;
   case 'ttype': state.ticket.type=a.v; refresh(); break;   // fiyat kutusu boş kalır, kullanıcı girer
   case 'ttif': state.ticket.tif=a.v; refresh(); break;
   case 'tprice': {const st=stock(state.ticket.s), tk=tick(st), base=state.ticket.price>0?state.ticket.price:st.p; state.ticket.price=Math.max(tk,+(base+tk*(+a.d)).toFixed(2)); refresh(); break;}
   case 'tqty': state.ticket.qty=Math.max(1,state.ticket.qty+(+a.d)); state.ticket.pct=null; refresh(); break;
   case 'tpct': setPct(+a.v); refresh(); break;
   case 'review': openConfirm(); break;
   case 'closeSheet': closeSheet(); break;
   case 'submit': submitOrder(); break;
   case 'otab': state.ordersTab=a.v; refresh(); break;
   case 'ptab': {
    state.pfTab=a.v;
    if(state.screen!=='portfolio'){ state.nav=[]; go('portfolio',{push:false}); break; }
    state.keepScroll=true;   // sayfa aşağı yukarı oynamasın, yalnızca bölüm değişsin
    render();
    break;
   }
   case 'cancel': {const o=state.orders.find((x: any)=>x.id===a.id); if(o&&o.status==='pending'){o.status='cancelled'; const back=o.side==='buy'?o.price*o.qty*(1+commRate*(1+bsmv)):0; state.cash+=back; afterCancel(o,back);} toast('Emir iptal edildi'); state.keepScroll=true; render(); break;}
   case 'goto': state.nav=[]; go(a.v,{push:false}); break;
   case 'hide': state.hidden=!state.hidden; render(); break;
   case 'theme': toggleTheme(); break;
   case 'login': openLogin(null); break;
   case 'accounts': openAccounts(); break;
   case 'trade': openTrade(a.s,a.side); break;
   case 'sale': openSale(+a.i); break;
   case 'hf': state.histF=a.v; state.keepScroll=true; render(); break;
   case 'alloc': state.allocOpen=!state.allocOpen; state.keepScroll=true; render(); break;
   case 'fs': state.fontSize=a.v; applyFont(); state.keepScroll=true; render(); toast(a.v==='small'?'Küçük yazı':a.v==='large'?'Büyük yazı':'Normal yazı'); break;
   case 'mview': state.mktView=a.v; state.keepScroll=true; render(); break;
   case 'msort': openSort(); break;
   case 'msortPick': state.mktSort=a.v; closeSheet(); render(); break;
   case 'mfilter': openFilter(); break;
   case 'mfilterPick': state.mktSec=a.v||''; closeSheet(); render(); break;
   case 'detailSheet': closeSheet(); go('detail',{set:{detail:a.s,period:'1G'}}); break;
   case 'pickAcct': pickAccount(a.no); break;
   case 'addAcct': addAccount(); break;
   case 'remember': state.auth.remember=!state.auth.remember; saveAuth(); el.classList.toggle('on',state.auth.remember); el.setAttribute('aria-checked',state.auth.remember); break;   // yazılan şifre kaybolmasın diye sayfa yeniden çizilmez
   case 'logout': logout(); break;
   case 'askpw': state.auth.remember=!state.auth.remember; saveAuth(); render(); toast(state.auth.remember?'Girişte şifre sorulmayacak':'Her girişte şifre sorulacak'); break;
   case 'market': if(a.k==='news'){ go('news'); } else { state.mkt=a.k; go('mkt'); } break;
   case 'orders': state.pfTab='orders'; state.nav=[]; go('portfolio',{push:false}); break;
   case 'toast': toast(a.msg); break;
   default: extraAct(a.act,a,el);
  }}; });
 const ms=root.querySelector('#mktSearch');
 if(ms){ ms.oninput=()=>{ state.mktQuery=ms.value; state.keepScroll=true; render(); const el=$id('mktSearch'); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } }; }
 const ss=root.querySelector('#symSearch');
 if(ss){ ss.oninput=()=>{ state.ticketQuery=ss.value; state.keepScroll=true; render(); const el=$id('symSearch'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }; }
 /* Sayı kutuları: dokununca içi seçilir, yalnızca rakam / ayraç kabul eder, çıkışta Türkçe biçime döner. */
 function numField(el?: any, apply?: any){
  if(!el) return;
  el.onfocus=()=>{ el.select(); };
  el.oninput=()=>{   /* yazarken binlik ayracı otomatik konur: 6559649 -> 6.559.649 */
   const parts=el.value.replace(/[^0-9,]/g,"").split(",");
   let int=parts[0].replace(/^0+(?=\d)/,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
   el.value = parts.length>1 ? int+","+parts.slice(1).join("").slice(0,2) : int;
   try{ el.setSelectionRange(el.value.length,el.value.length); }catch(e){}
  };
  el.onblur=el.onchange=()=>{ apply(parseNum(el.value)); };
  el.onkeydown=(e: any)=>{ if(e.key==='Enter'){ el.blur(); } };
 }
 numField(root.querySelector('#priceInput'), (v: any)=>{ if(v>0) state.ticket.price=+v.toFixed(2); refresh(); });
 numField(root.querySelector('#amountInput'), (v: any)=>{ const st=stock(state.ticket.s); if(v>0){ state.ticket.qty=Math.max(1,Math.floor(v/st.p)); state.ticket.pct=null; } refresh(); });
 numField(root.querySelector('#qtyInput'), (v: any)=>{ if(v>0){ state.ticket.qty=Math.max(1,Math.round(v)); state.ticket.pct=null; } refresh(); });
 const ov=root.querySelector('#ov'); if(ov){ ov.onclick=(e: any)=>{ if(e.target===ov) closeSheet(); }; }
}

/* Gece / gündüz yalnızca Hesap > Uygulama Tercihleri anahtarından değişir. */
function applyFont(){ document.documentElement.dataset.fs=state.fontSize; }   /* yazı boyutu: içerik alanı ölçeklenir */
function applyTheme(){
 document.documentElement.dataset.theme=state.theme;
}
function toggleTheme(){ state.theme=state.theme==='dark'?'light':'dark'; applyTheme(); render(); toast(state.theme==='dark'?'Karanlık mod açık':'Aydınlık mod açık'); }

window.addEventListener('resize',()=>{if(state.screen==='detail'||state.screen==='ticket')drawChart()});
try{ window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(state.screen==='detail'||state.screen==='ticket')drawChart()}); }catch(e){}
/* Açılış: features.js en sonda boot() ile başlatır. */


/* ========== web sürümü özellikleri ========== */
/* Meridyen Yatırım — web sürümünün tamamlayıcı özellikleri.
 * app.js'teki ekranların bağlandığı işlevler: takip listesi, fiyat alarmı, canlı fiyat ve emir eşleşmesi,
 * hesap hareketleri, para yatırma / çekme, banka hesapları, kişisel bilgiler, güvenlik, sözleşmeler,
 * bildirimler, yardım, referans, halka arz talebi, ürün ayrıntısı, haber okuma ve masaüstü kenar panelleri.
 * Bütün veriler hesaba özel olarak tarayıcıda saklanır (persistApp / PERSIST_KEYS).
 */

/* ---------- yardımcılar ---------- */
const layerEl = () => $id('layer');
const nowTs = () => Date.now();
const dstr = (ts: any) => new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
const tstr = (ts: any) => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dtstr = (ts: any) => dstr(ts) + ' · ' + tstr(ts);
const uid = (p: any) => p + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
function orderId() { const d = new Date(); return 'MRD-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(1000 + state.orders.length + Math.floor(Math.random() * 90)).padStart(4, '0'); }
const inWatch = (s: any) => (state.watch || []).includes(s);
function liveLabel() {
  const d = new Date(), t = d.toLocaleTimeString('tr-TR');
  return MeridyenMarket.enabled() ? `Canlı · ${t}` : `Son güncelleme ${t} · Canlı fiyatlar kapalı`;
}
function moneyField(el?: any, onVal?: any) {
  if (!el) return;
  el.addEventListener('focus', () => el.select());
  el.addEventListener('input', () => {
    const parts = el.value.replace(/[^0-9,]/g, '').split(',');
    const int = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    el.value = parts.length > 1 ? int + ',' + parts.slice(1).join('').slice(0, 2) : int;
    if (onVal) onVal(parseNum(el.value));
  });
}
function ferr(id?: any, msg?: any) {
  const el = $id(id); if (!el) return;
  el.textContent = msg || ''; el.classList.toggle('on', !!msg);
  const inp = $id(id.replace(/Err$/, ''));
  if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
/* Alt sayfa: uygulamanın kendi .sheet / .lgn görünümü. */
function sheet(html?: any, label?: any, cls?: any) {
  layerEl().innerHTML = `<div class="overlay" id="ov"><div class="sheet lgn ${cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grab"></div><button class="sx" data-act="closeSheet" aria-label="Kapat">${ic.close}</button>${html}</div></div>`;
  bind(layerEl());
  const f = layerEl().querySelector('[autofocus]'); if (f && matchMedia('(min-width: 600px)').matches) f.focus();
}
document.addEventListener('keydown', (e: any) => { if (e.key === 'Escape' && layerEl() && layerEl().innerHTML) closeSheet(); });

/* ---------- başlangıç verisi ---------- */
const BANKS: any = { '00010': 'Ziraat Bankası', '00012': 'Halkbank', '00015': 'VakıfBank', '00032': 'TEB', '00046': 'Akbank', '00059': 'Şekerbank', '00062': 'Garanti BBVA', '00064': 'İş Bankası', '00067': 'Yapı Kredi', '00099': 'ING', '00111': 'QNB', '00123': 'HSBC', '00134': 'DenizBank', '00203': 'Albaraka Türk', '00205': 'Kuveyt Türk', '00206': 'Türkiye Finans', '00209': 'Ziraat Katılım', '00210': 'Vakıf Katılım' };
function ibanMod97(str?: any) { let r = 0; for (const ch of str) { const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch; for (const d of v) r = (r * 10 + +d) % 97; } return r; }
function ibanValid(iban?: any) { const s = iban.replace(/\s/g, '').toUpperCase(); if (!/^TR\d{24}$/.test(s)) return false; return ibanMod97(s.slice(4) + s.slice(0, 4)) === 1; }
function ibanMake(bank?: any, acc?: any) { const bban = bank + '0' + acc; const chk = 98 - ibanMod97(bban + 'TR00'); return 'TR' + String(chk).padStart(2, '0') + bban; }
const ibanFmt = (s: any) => s.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
const ibanMask = (s: any) => { const x = s.replace(/\s/g, ''); return x.slice(0, 4) + ' **** **** **** ' + x.slice(-6, -2) + ' ' + x.slice(-2); };

function seedState() {
  const sample = state.sampleData !== false;
  if (!Array.isArray(state.watch)) state.watch = sample ? ['THYAO', 'ASELS', 'KCHOL', 'BIMAS', 'SISE', 'EREGL'] : [];
  if (!Array.isArray(state.alarms)) state.alarms = [];
  if (!Array.isArray(state.notes)) state.notes = sample ? [
    { id: 'n1', ts: nowTs() - 36e5 * 5, k: 'order', title: 'THYAO alış emriniz gerçekleşti', body: '50 adet · ₺311,75', read: true },
    { id: 'n2', ts: nowTs() - 36e5 * 30, k: 'info', title: 'Hoş geldiniz', body: 'Emirleriniz fiyat koşulu oluşunca gerçekleşir.', read: false },
  ] : [{ id: 'n0', ts: nowTs(), k: 'info', title: 'Hesabınız açıldı', body: 'Hesabınıza ₺100.000 bakiye tanımlandı.', read: false }];
  if (!Array.isArray(state.banks)) state.banks = sample ? [{ id: 'b1', bank: 'Ziraat Bankası', iban: ibanMake('00010', '1234567890123456'), holder: state.auth.user }] : [];
  if (!Array.isArray(state.tickets)) state.tickets = [];
  if (!Array.isArray(state.ipoReq)) state.ipoReq = [];
  if (!Array.isArray(state.newsOff)) state.newsOff = [];
  if (!state.notif) state.notif = { orders: true, alarms: true, news: true, campaigns: false, email: true, sms: false };
  if (!Array.isArray(state.ledger)) {
    const L = [];
    if (sample) {
      const t0 = new Date(2026, 8, 15, 10, 12).getTime();
      L.push({ id: 'l1', ts: t0, type: 'deposit', title: 'Para yatırma', sub: 'Ziraat Bankası', amount: 150000, status: 'Onaylandı' });
      L.push({ id: 'l2', ts: new Date(2026, 8, 18, 11, 5).getTime(), type: 'buy', title: 'EREGL alış', sub: '400 adet · ₺53,40', amount: -(400 * 53.40 * (1 + commRate * (1 + bsmv))), status: 'Gerçekleşti' });
      L.push({ id: 'l3', ts: new Date(2026, 8, 19, 15, 22).getTime(), type: 'buy', title: 'THYAO alış', sub: '50 adet · ₺311,75', amount: -(50 * 311.75 * (1 + commRate * (1 + bsmv))), status: 'Gerçekleşti' });
      L.push({ id: 'l4', ts: new Date(2026, 8, 20, 9, 58).getTime(), type: 'block', title: 'ASELS alış emri teminatı', sub: '200 adet · ₺118,00', amount: -(200 * 118 * (1 + commRate * (1 + bsmv))), status: 'Bekliyor', oid: 'MRD-2609-0421' });
      L.push({ id: 'l5', ts: new Date(2026, 8, 23, 21, 43).getTime(), type: 'deposit', title: 'Para yatırma', sub: 'Ziraat Bankası', amount: 500, status: 'Onaylandı' });
    } else {
      L.push({ id: 'l0', ts: nowTs(), type: 'deposit', title: 'Başlangıç bakiyesi', sub: 'Hesap açılışı', amount: START_CASH, status: 'Tanımlandı' });
    }
    state.ledger = L.sort((a?: any, b?: any) => b.ts - a.ts);
  }
  state.firstRunToast = state.firstRun;
}

/* ---------- hesap hareketleri ---------- */
function addLedger(e?: any) { e.id = e.id || uid('L'); e.ts = e.ts || nowTs(); state.ledger.unshift(e); return e; }
const LTYPE: any = { deposit: ['Yatırma', 'up'], withdraw: ['Çekme', 'down'], buy: ['Alış', 'down'], sell: ['Satış', 'up'], block: ['Teminat', 'warn'], refund: ['İade', 'up'], ipo: ['Halka arz', 'warn'] };
function ledgerRow(e?: any) {
  const pos = e.amount >= 0;
  return `<div class="baltx"><span class="lic ${LTYPE[e.type] ? LTYPE[e.type][1] : ''}">${e.type === 'deposit' || e.type === 'refund' || e.type === 'sell' ? ic.down : ic.up}</span><div class="t"><b>${esc(e.title)}</b><span>${dtstr(e.ts)}${e.sub ? ' · ' + esc(e.sub) : ''} · <i class="${e.status === 'İptal' ? 'no' : e.status === 'Bekliyor' ? 'wait' : 'ok'}">${esc(e.status)}</i></span></div><b class="num ${pos ? 'accent' : ''}">${(pos ? '+' : '−') + tl(Math.abs(e.amount))}</b></div>`;
}
function ledgerRows(n?: any) { const l = (state.ledger || []).slice(0, n); return l.length ? l.map(ledgerRow).join('') : '<div class="empty">Henüz hesap hareketi yok.</div>'; }
function openLedger(f?: any) {
  f = f || 'all';
  const F = [['all', 'Tümü'], ['money', 'Para'], ['trade', 'İşlem'], ['other', 'Diğer']];
  const match = (e: any) => f === 'all' || (f === 'money' && (e.type === 'deposit' || e.type === 'withdraw')) || (f === 'trade' && (e.type === 'buy' || e.type === 'sell')) || (f === 'other' && !['deposit', 'withdraw', 'buy', 'sell'].includes(e.type));
  const list = state.ledger.filter(match);
  const inSum = list.filter((e: any) => e.amount > 0).reduce((a?: any, e?: any) => a + e.amount, 0), outSum = list.filter((e: any) => e.amount < 0).reduce((a?: any, e?: any) => a - e.amount, 0);
  sheet(`<h3>Hesap Hareketleri</h3><div class="sub2">Para yatırma, çekme, alım satım ve teminat hareketleriniz.</div>
   <div class="hf chips">${F.map(([k, n]: any) => `<button data-act="ledgerF" data-v="${k}" class="${f === k ? 'active' : ''}">${n}</button>`).join('')}</div>
   <div class="lsum num"><div><span>Giriş</span><b class="up">+${tl(inSum)}</b></div><div><span>Çıkış</span><b class="down">−${tl(outSum)}</b></div></div>
   <div class="setlist">${list.length ? list.map(ledgerRow).join('') : '<div class="empty">Bu filtrede hareket yok.</div>'}</div>
   <div class="acts"><button class="btn ghost" data-act="ledgerCsv">${ic.dl} CSV indir</button><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Hesap hareketleri', 'tall');
}
function ledgerCsv() {
  const rows = [['Tarih', 'Saat', 'Tür', 'Açıklama', 'Ayrıntı', 'Tutar (TL)', 'Durum']].concat(state.ledger.map((e: any) => [dstr(e.ts), tstr(e.ts), (LTYPE[e.type] || [e.type])[0], e.title, e.sub || '', fmt(e.amount), e.status]));
  const csv = '﻿' + rows.map((r: any) => r.map((c: any) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'meridyen-hesap-hareketleri-' + state.auth.no + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  toast('Hesap hareketleri indirildi');
}

/* ---------- emir kancaları (app.js submitOrder / cancel) ---------- */
function recordSale(s?: any, q?: any, cost?: any, px?: any) {
  const d = new Date();
  state.sold.unshift({ s, q, cost, px, d: d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }), sa: tstr(d), plp: +((px - cost) / cost * 100).toFixed(2) });
}
function afterOrder(o?: any, gross?: any, fee?: any) {
  const lbl = `${fmt(o.qty, 0)} adet · ${tl(o.price)}`;
  if (o.status === 'filled') {
    addLedger({ type: o.side, title: `${o.s} ${o.side === 'buy' ? 'alış' : 'satış'}`, sub: lbl, amount: o.side === 'buy' ? -(gross + fee) : gross - fee, status: 'Gerçekleşti', oid: o.id });
    note('order', `${o.s} ${o.side === 'buy' ? 'alış' : 'satış'} emriniz gerçekleşti`, lbl);
  } else {
    if (o.side === 'buy') addLedger({ type: 'block', title: `${o.s} alış emri teminatı`, sub: lbl, amount: -(gross + fee), status: 'Bekliyor', oid: o.id });
    note('order', `${o.s} ${typeName(o.type).toLocaleLowerCase('tr')} ${o.side === 'buy' ? 'alış' : 'satış'} emriniz iletildi`, lbl + ' · fiyat koşulu oluşunca gerçekleşir');
  }
}
function afterCancel(o?: any, back?: any) {
  const e = state.ledger.find((x: any) => x.oid === o.id && x.type === 'block'); if (e) e.status = 'İptal';
  if (back > 0) addLedger({ type: 'refund', title: `${o.s} teminat iadesi`, sub: 'Emir iptal edildi', amount: back, status: 'İade edildi', oid: o.id });
  note('order', `${o.s} emriniz iptal edildi`, `${fmt(o.qty, 0)} adet · ${tl(o.price)}`);
}
/* Bekleyen emirler: fiyat koşulu oluşunca gerçekleşir.
   Limit alış: fiyat ≤ limit · Limit satış: fiyat ≥ limit · Stop alış: fiyat ≥ tetik · Stop satış: fiyat ≤ tetik. */
function matchOrders() {
  let changed = false;
  state.orders.filter((o: any) => o.status === 'pending').forEach((o: any) => {
    const st = stock(o.s); if (!st) return;
    const p = st.p, buy = o.side === 'buy';
    const hit = o.type === 'limit' ? (buy ? p <= o.price : p >= o.price) : o.type === 'stop' ? (buy ? p >= o.price : p <= o.price) : true;
    if (!hit) return;
    const fillPx = o.type === 'limit' ? o.price : p, k = 1 + commRate * (1 + bsmv);
    if (buy) {
      const reserved = o.price * o.qty * k, actual = fillPx * o.qty * k;
      state.cash += reserved - actual;
      const h = holding(o.s); if (h) { h.cost = (h.cost * h.q + fillPx * o.qty) / (h.q + o.qty); h.q += o.qty; } else state.holdings.push({ s: o.s, q: o.qty, cost: fillPx });
      const e = state.ledger.find((x: any) => x.oid === o.id && x.type === 'block');
      if (e) { e.type = 'buy'; e.title = `${o.s} alış`; e.amount = -actual; e.status = 'Gerçekleşti'; e.sub = `${fmt(o.qty, 0)} adet · ${tl(fillPx)}`; e.ts = nowTs(); }
    } else {
      const h = holding(o.s);
      if (!h || h.q < o.qty) { o.status = 'cancelled'; note('order', `${o.s} satış emri iptal edildi`, 'Yeterli pay kalmadı'); changed = true; return; }
      const gross = fillPx * o.qty, fee = gross * commRate * (1 + bsmv);
      recordSale(o.s, o.qty, h.cost, fillPx);
      h.q -= o.qty; if (h.q <= 0) state.holdings = state.holdings.filter((x: any) => x !== h);
      state.cash += gross - fee;
      addLedger({ type: 'sell', title: `${o.s} satış`, sub: `${fmt(o.qty, 0)} adet · ${tl(fillPx)}`, amount: gross - fee, status: 'Gerçekleşti', oid: o.id });
    }
    o.status = 'filled'; o.filled = o.qty; o.price = +fillPx.toFixed(2);
    note('order', `${o.s} ${buy ? 'alış' : 'satış'} emriniz gerçekleşti`, `${fmt(o.qty, 0)} adet · ${tl(fillPx)}`, true);
    orderToast(o);
    changed = true;
  });
  return changed;
}

/* ---------- bildirimler ---------- */
function note(k?: any, title?: any, body?: any, push?: any) {
  const pref = k === 'order' ? state.notif.orders : k === 'alarm' ? state.notif.alarms : true;
  if (!pref) return;
  state.notes.unshift({ id: uid('N'), ts: nowTs(), k, title, body, read: false });
  state.notes = state.notes.slice(0, 60);
  paintBell();
  if (push && k === 'alarm') toast(title);
}
function paintBell() {
  const n = (state.notes || []).filter((x: any) => !x.read).length;
  document.querySelectorAll('[data-bell]').forEach((b: any) => {
    let d = b.querySelector('.dot'); if (n && !d) { d = document.createElement('span'); d.className = 'dot'; b.appendChild(d); } if (!n && d) d.remove();
    b.setAttribute('aria-label', n ? `Bildirimler, ${n} okunmamış` : 'Bildirimler');
  });
}
function openNotes() {
  const list = state.notes || [];
  const icon = (k: any) => k === 'order' ? ic.swap : k === 'alarm' ? ic.bell : ic.bulb;
  sheet(`<h3>Bildirimler</h3><div class="sub2">${list.filter((x: any) => !x.read).length} okunmamış bildirim</div>
   <div class="setlist">${list.length ? list.map((n: any) => `<div class="setrow note2 ${n.read ? '' : 'unread'}"><span class="ic">${icon(n.k)}</span><div class="t"><b>${esc(n.title)}</b><span>${esc(n.body || '')}</span><span class="tm">${dtstr(n.ts)}</span></div></div>`).join('') : '<div class="empty">Bildiriminiz yok.</div>'}</div>
   <div class="acts"><button class="btn ghost" data-act="notesClear" ${list.length ? '' : 'disabled'}>Tümünü sil</button><button class="btn primary" data-act="notifSet">Bildirim ayarları</button></div>`, 'Bildirimler', 'tall');
  list.forEach((n: any) => n.read = true); paintBell(); persistApp();
}
function openNotifSet() {
  const n = state.notif, sw = (k?: any, t?: any, s?: any) => `<div class="setrow"><div class="t"><b>${t}</b><span>${s}</span></div><button class="sw ${n[k] ? 'on' : ''}" data-act="nset" data-k="${k}" role="switch" aria-checked="${!!n[k]}" aria-label="${t}"><i></i></button></div>`;
  sheet(`<h3>Bildirim Ayarları</h3><div class="sub2">Hangi durumlarda haber verelim?</div>
   <div class="setlist">${sw('orders', 'Emir bildirimleri', 'Emir iletildi, gerçekleşti ya da iptal edildi')}${sw('alarms', 'Fiyat alarmları', 'Kurduğunuz fiyat seviyesine ulaşıldığında')}${sw('news', 'Takip listesi haberleri', 'Takip ettiğiniz paylarla ilgili haberler')}${sw('campaigns', 'Kampanyalar', 'Komisyon indirimleri ve duyurular')}</div>
   <div class="slab">Kanallar</div>
   <div class="setlist">${sw('email', 'E-posta', 'Önemli bildirimlerin kopyası e-postanıza')}${sw('sms', 'SMS', 'Emir gerçekleşince kısa mesaj')}</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Tamam</button></div>`, 'Bildirim ayarları');
}

/* ---------- takip listesi ve fiyat alarmı ---------- */
function watchToggle(s?: any) {
  state.watch = inWatch(s) ? state.watch.filter((x: any) => x !== s) : [...state.watch, s];
  toast(inWatch(s) ? `${s} takip listenize eklendi` : `${s} takip listenizden çıkarıldı`);
}
function openWatchAdd(q?: any) {
  q = q || '';
  const ql = q.toLocaleLowerCase('tr');
  const rows = STOCKS.filter((x: any) => !ql || (x.s + ' ' + x.n).toLocaleLowerCase('tr').includes(ql));
  const html = `<h3>Takip Listesine Ekle</h3><div class="sub2">${state.watch.length} pay takip ediliyor.</div>
   <div class="msearch">${ic.search}<input id="waQ" placeholder="Hisse ara" aria-label="Hisse ara" value="${esc(q)}" autocomplete="off"></div>
   <div class="setlist wa">${rows.map((x: any) => `<button data-act="waPick" data-s="${x.s}">${av(x.s)}<div class="t"><b>${x.s}</b><span>${x.n}</span></div><span class="chip ${inWatch(x.s) ? 'lime' : 'neutral'}">${inWatch(x.s) ? ic.checkS + ' Listede' : ic.plus + ' Ekle'}</span></button>`).join('') || '<div class="empty">Eşleşen hisse yok.</div>'}</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Bitti</button></div>`;
  const cur = layerEl().querySelector('.sheet.wadd');
  if (cur) { cur.innerHTML = `<div class="grab"></div><button class="sx" data-act="closeSheet" aria-label="Kapat">${ic.close}</button>` + html; bind(layerEl()); }
  else sheet(html, 'Takip listesine ekle', 'wadd tall');
  const inp = $id('waQ');
  inp.oninput = () => { openWatchAdd(inp.value); const n = $id('waQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
}
function openAlarm(s?: any) {
  const st = stock(s), mine = state.alarms.filter((a: any) => a.s === s);
  sheet(`<h3>Fiyat Alarmı</h3><div class="sub2">${st.s} şu an <b class="num">${tl(st.p)}</b>. Seviyeye ulaşınca bildirim gelir.</div>
   <div class="field"><label for="alPx">Alarm fiyatı (TL)</label><input class="inp num" id="alPx" inputmode="decimal" placeholder="${fmt(st.p * 1.05)}" autofocus><div class="ferr2" id="alPxErr"></div></div>
   <div class="pcts">${[-5, -2, 2, 5].map((p: any) => `<button data-act="alPct" data-v="${p}">${p > 0 ? '+' : ''}%${Math.abs(p)}</button>`).join('')}</div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn primary" data-act="alSave" data-s="${s}">${ic.bell} Alarm kur</button></div>
   ${mine.length ? `<div class="slab">Bu hissedeki alarmlar</div><div class="setlist">${mine.map((a: any) => `<div class="setrow"><span class="ic">${ic.bell}</span><div class="t"><b class="num">${a.dir === 'up' ? '▲ ' : '▼ '}${tl(a.price)}</b><span>${a.done ? 'Tetiklendi · ' + dtstr(a.doneTs) : (a.dir === 'up' ? 'Fiyat bu seviyenin üstüne çıkınca' : 'Fiyat bu seviyenin altına inince')}</span></div><button class="iconbtn sm" data-act="alDel" data-id="${a.id}" data-s="${s}" aria-label="Alarmı sil">${ic.trash}</button></div>`).join('')}</div>` : ''}`, 'Fiyat alarmı');
  moneyField($id('alPx'));
}
function checkAlarms() {
  let changed = false;
  state.alarms.filter((a: any) => !a.done).forEach((a: any) => {
    const st = stock(a.s); if (!st) return;
    if ((a.dir === 'up' && st.p >= a.price) || (a.dir === 'down' && st.p <= a.price)) {
      a.done = true; a.doneTs = nowTs(); changed = true;
      note('alarm', `${a.s} ${tl(a.price)} seviyesine ${a.dir === 'up' ? 'yükseldi' : 'düştü'}`, `Anlık fiyat ${tl(st.p)}`, true);
    }
  });
  return changed;
}

/* ---------- haberler ---------- */
function newsFeed() {
  const all = [...NEWS.default.map((n: any) => ({ ...n, tag: 'Gündem' })), ...Object.keys(NEWS).filter((k: any) => k !== 'default').flatMap((k: any) => NEWS[k].map((n: any) => ({ ...n, tag: k }))),
    ...NEWSFEED.filter((x: any) => !NEWS.default.some((n: any) => n.t === x.t) && !(NEWS.THYAO || []).some((n: any) => n.t === x.t)).map((x: any) => ({ t: x.t, s: x.s, tag: 'Gündem', url: x.url, body: x.body }))];
  return all.map((n?: any, i?: any) => ({ ...n, i, src: n.s.split(' · ')[0] })).filter((n: any) => !state.newsOff.includes(n.src));
}
function openArticle(i?: any) {
  const all = newsFeed(), n = all.find((x: any) => x.i === +i); if (!n) return;
  const st = stock(n.tag);
  sheet(`<div class="art"><span class="chip neutral">${esc(n.tag)}</span><h3>${esc(n.t)}</h3><div class="sub2">${esc(n.s)}</div>
   <p>${esc(n.body||'')}</p>
   ${n.url?`<p><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">Haberin tamamı için kaynağa git</a></p>`:''}
   <p class="note">Yatırım tavsiyesi değildir.</p></div>
   <div class="acts">${st ? `<button class="btn ghost" data-act="detailSheet" data-s="${st.s}">${st.s} sayfası</button>` : ''}<button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Haber', 'tall');
}
function openNewsSrc() {
  const srcs = [...new Set([...NEWS.default, ...Object.values(NEWS).flat(), ...NEWSFEED].map((n: any) => n.s.split(' · ')[0]))].sort((a?: any, b?: any) => a.localeCompare(b, 'tr'));
  sheet(`<h3>Haber Kaynakları</h3><div class="sub2">Akışta görmek istediğiniz kaynakları seçin.</div>
   <div class="setlist">${srcs.map((s: any) => `<div class="setrow"><div class="t"><b>${esc(s)}</b></div><button class="sw ${state.newsOff.includes(s) ? '' : 'on'}" data-act="srcT" data-v="${esc(s)}" role="switch" aria-checked="${!state.newsOff.includes(s)}" aria-label="${esc(s)}"><i></i></button></div>`).join('')}</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Tamam</button></div>`, 'Haber kaynakları');
}

/* ---------- piyasa ürünleri ve halka arz ---------- */
function instRow(k?: any) { const d = (MKT[state.mkt] || MKT.stocks)(); return { d, r: d.rows.find((x: any) => x.k === k) }; }
function openInst(k?: any) {
  const { d, r } = instRow(k); if (!r) return;
  if (state.mkt === 'ipo') return openIpo(r);
  const pts = (() => { const g = rng(r.k + 'inst'), n = 40, out = []; let v = 100; for (let i = 0; i < n; i++) { v *= 1 + (g() - .5) * .02 + (r.c || 0) / 100 / n; out.push(v); } return out; })();
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 320, H = 110, up = (r.c == null ? pts[pts.length - 1] >= pts[0] : r.c >= 0), col = up ? 'var(--up)' : 'var(--down)';
  const line = pts.map((v?: any, i?: any) => (i ? 'L' : 'M') + (i / (pts.length - 1) * W).toFixed(1) + ' ' + (H - 6 - (v - mn) / ((mx - mn) || 1) * (H - 12)).toFixed(1)).join(' ');
  sheet(`<div class="sym" style="margin-top:0"><div class="avatar" style="background:var(--g700)">${esc(r.k.slice(0, 4))}</div><div class="t"><b>${esc(r.k)}</b><span>${esc(r.n)}</span></div></div>
   <div class="price num" style="margin-top:12px"><span class="big" style="font-size:28px">${esc(r.v)}</span>${r.c != null ? `<span class="chip ${cls(r.c)}">${arrow(r.c)} ${pct(r.c)}</span>` : r.note ? `<span class="chip neutral">${esc(r.note)}</span>` : ''}</div>
   <svg class="ichart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${esc(r.k)} grafiği"><path d="${line} L${W} ${H} L0 ${H} Z" fill="${col}" opacity=".12"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/></svg>
   <div class="stats num"><div><span>Kategori</span><b>${esc(d.t)}</b></div><div><span>Kaynak</span><b>${esc(d.s.split(' · ')[0])}</b></div></div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, r.k);
}
function openIpo(r?: any) {
  const px = parseNum((r.n.match(/₺([\d.,]+)/) || [])[1] || '0'), mine = state.ipoReq.filter((x: any) => x.k === r.k && x.status !== 'İptal');
  sheet(`<h3>${esc(r.k)} halka arz talebi</h3><div class="sub2">${esc(r.n)} · ${esc(r.note || '')}</div>
   <div class="stats num"><div><span>Fiyat</span><b>${tl(px)}</b></div><div><span>Kalan süre</span><b>${esc(r.v)}</b></div><div><span>Dağıtım</span><b>Eşit</b></div><div><span>Kullanılabilir</span><b>${tl(state.cash)}</b></div></div>
   <div class="field"><label for="ipoQ">Talep edilen adet (lot)</label><input class="inp num" id="ipoQ" inputmode="numeric" placeholder="100" autofocus><div class="ferr2" id="ipoQErr"></div></div>
   <div class="tsum num" style="margin-top:12px"><div><span>Bloke edilecek tutar</span><b id="ipoTot">${tl(0)}</b></div></div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn primary" data-act="ipoSave" data-k="${esc(r.k)}" data-px="${px}">Talep ver</button></div>
   ${mine.length ? `<div class="slab">Talepleriniz</div><div class="setlist">${mine.map((x: any) => `<div class="setrow"><div class="t"><b class="num">${fmt(x.q, 0)} lot · ${tl(x.q * x.px)}</b><span>${dtstr(x.ts)} · ${x.status}</span></div><button class="btn ghost sm" data-act="ipoCancel" data-id="${x.id}" data-k="${esc(r.k)}">İptal et</button></div>`).join('')}</div>` : ''}`, 'Halka arz talebi');
  const q = $id('ipoQ');
  moneyField(q, (v: any) => { $id('ipoTot').textContent = tl(Math.floor(v) * px); });
}

/* ---------- para yatırma / çekme ve banka hesapları ---------- */
function openMoney(kind?: any) {
  const dep = kind === 'deposit', banks = state.banks;
  if (!banks.length) {
    return sheet(`<h3>${dep ? 'Para Yatır' : 'Para Çek'}</h3><div class="sub2">Önce bir banka hesabı ekleyin; ${dep ? 'yatırma' : 'çekme'} işlemi bu hesap üzerinden yapılır.</div>
     <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn primary" data-act="bankAdd" data-then="${kind}">${ic.plus} Banka hesabı ekle</button></div>`, dep ? 'Para yatır' : 'Para çek');
  }
  sheet(`<h3>${dep ? 'Para Yatır' : 'Para Çek'}</h3><div class="sub2">${dep ? 'Tutar hesabınıza hemen geçer.' : 'Kullanılabilir bakiye: <b class="num">' + tl(state.cash) + '</b>'}</div>
   <div class="field"><label for="mAmt">Tutar (TL)</label><input class="inp num" id="mAmt" inputmode="decimal" placeholder="0,00" autofocus><div class="ferr2" id="mAmtErr"></div></div>
   <div class="pcts">${(dep ? [1000, 5000, 10000, 50000] : [25, 50, 75, 100]).map((v: any) => `<button data-act="mQuick" data-v="${v}" data-k="${kind}">${dep ? '₺' + fmt(v, 0) : '%' + v}</button>`).join('')}</div>
   <div class="field"><label>${dep ? 'Gönderen hesap' : 'Alıcı hesap'}</label>
    <div class="setlist banksel">${banks.map((b?: any, i?: any) => `<label class="setrow rad"><input type="radio" name="mBank" value="${b.id}" ${i === 0 ? 'checked' : ''}><span class="ic">${ic.bank}</span><div class="t"><b>${esc(b.bank)}</b><span class="num">${ibanMask(b.iban)}</span></div></label>`).join('')}</div></div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn ${dep ? 'buy' : 'primary'}" data-act="mSave" data-k="${kind}">${dep ? ic.down + ' Yatır' : ic.up + ' Çek'}</button></div>`, dep ? 'Para yatır' : 'Para çek');
  moneyField($id('mAmt'));
}
function saveMoney(kind?: any) {
  const dep = kind === 'deposit', v = +parseNum($id('mAmt').value).toFixed(2);
  const b = state.banks.find((x: any) => x.id === (layerEl().querySelector('input[name="mBank"]:checked') || {}).value);
  if (!(v > 0)) return ferr('mAmtErr', 'Tutar girin.');
  if (dep && v > 10000000) return ferr('mAmtErr', 'Tek seferde en fazla ₺10.000.000 yatırabilirsiniz.');
  if (!dep && v > state.cash) return ferr('mAmtErr', `Kullanılabilir bakiyeniz ${tl(state.cash)}.`);
  if (!b) return toast('Bir banka hesabı seçin');
  state.cash += dep ? v : -v;
  addLedger({ type: kind, title: dep ? 'Para yatırma' : 'Para çekme', sub: b.bank, amount: dep ? v : -v, status: dep ? 'Onaylandı' : 'Gönderildi' });
  note('info', dep ? `${tl(v)} hesabınıza geçti` : `${tl(v)} ${b.bank} hesabınıza gönderildi`, ibanMask(b.iban));
  closeSheet(); state.keepScroll = true; render(); toast(dep ? `${tl(v)} hesabınıza yatırıldı` : `${tl(v)} çekme talimatı verildi`);
}
function openBanks() {
  sheet(`<h3>Banka Hesaplarım</h3><div class="sub2">Para yatırma ve çekme yalnızca kendi adınıza kayıtlı hesaplarla yapılır.</div>
   <div class="setlist">${state.banks.length ? state.banks.map((b: any) => `<div class="setrow"><span class="ic">${ic.bank}</span><div class="t"><b>${esc(b.bank)}</b><span class="num">${ibanFmt(b.iban)}</span><span>${esc(b.holder)}</span></div><button class="iconbtn sm" data-act="bankDel" data-id="${b.id}" aria-label="${esc(b.bank)} hesabını sil">${ic.trash}</button></div>`).join('') : '<div class="empty">Kayıtlı banka hesabınız yok.</div>'}</div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Kapat</button><button class="btn primary" data-act="bankAdd">${ic.plus} Hesap ekle</button></div>`, 'Banka hesaplarım');
}
function openBankAdd(then?: any) {
  sheet(`<h3>Banka Hesabı Ekle</h3><div class="sub2">Hesap sahibi: <b>${esc(state.auth.user)}</b></div>
   <div class="field"><label for="bkIban">IBAN</label><input class="inp num" id="bkIban" placeholder="TR00 0000 0000 0000 0000 0000 00" autocomplete="off" spellcheck="false" maxlength="32" autofocus><div class="ferr2" id="bkIbanErr"></div></div>
   <div class="hint2" id="bkName">Banka, IBAN'dan otomatik tanınır.</div>
   <div class="field"><label for="bkAlias">Hesap adı (isteğe bağlı)</label><input class="inp" id="bkAlias" placeholder="Maaş hesabım" maxlength="40"></div>
   <div class="acts"><button class="btn ghost" data-act="${then ? then : 'banks'}">Geri</button><button class="btn primary" data-act="bankSave" data-then="${then || ''}">Kaydet</button></div>`, 'Banka hesabı ekle');
  const el = $id('bkIban');
  el.addEventListener('input', () => {
    let v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v && !v.startsWith('T')) v = 'TR' + v.replace(/^R/, '');
    el.value = ibanFmt(v.slice(0, 26)); ferr('bkIbanErr', '');
    const bank = BANKS[v.slice(4, 9)]; $id('bkName').textContent = v.length >= 9 ? (bank ? 'Banka: ' + bank : 'Banka kodu tanınmadı') : "Banka, IBAN'dan otomatik tanınır.";
  });
}
function saveBank(then?: any) {
  const v = $id('bkIban').value.replace(/\s/g, '').toUpperCase(), alias = $id('bkAlias').value.trim();
  if (!v) return ferr('bkIbanErr', 'IBAN girin.');
  if (!/^TR\d{24}$/.test(v)) return ferr('bkIbanErr', 'IBAN TR ile başlamalı ve 26 karakter olmalı.');
  if (!ibanValid(v)) return ferr('bkIbanErr', 'IBAN kontrol basamakları hatalı. Numarayı kontrol edin.');
  if (state.banks.some((b: any) => b.iban === v)) return ferr('bkIbanErr', 'Bu IBAN zaten kayıtlı.');
  const bank = (alias ? alias + ' · ' : '') + (BANKS[v.slice(4, 9)] || 'Banka ' + v.slice(4, 9));
  state.banks.push({ id: uid('B'), bank, iban: v, holder: state.auth.user });
  persistApp(); toast('Banka hesabı eklendi');
  if (then) openMoney(then); else openBanks();
}

/* ---------- kişisel bilgiler, kimlik, güvenlik ---------- */
function openPersonal() {
  const u = (MeridyenAuth.getUser(state.auth.no) || {}) as any;
  const ph = (u.phone || '').replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
  sheet(`<h3>Kişisel Bilgiler</h3><div class="sub2">Müşteri No: <b class="num">${esc(u.no)}</b> · Kayıt: ${u.createdAt ? dstr(Date.parse(u.createdAt)) : '—'}</div>
   <div class="field"><label for="pfName">Ad soyad</label><input class="inp" id="pfName" value="${esc(u.name)}" autocomplete="name" maxlength="80"><div class="ferr2" id="pfNameErr"></div></div>
   <div class="field"><label for="pfEmail">E-posta</label><input class="inp" id="pfEmail" type="email" value="${esc(u.email)}" autocomplete="email" maxlength="120"><div class="ferr2" id="pfEmailErr"></div></div>
   <div class="field"><label for="pfPhone">Cep telefonu</label><input class="inp num" id="pfPhone" type="tel" value="${esc(ph)}" autocomplete="tel-national" maxlength="13"><div class="ferr2" id="pfPhoneErr"></div></div>
   <div class="setrow"><div class="t"><b>Ticari ileti izni</b><span>Bülten ve kampanyalar için e-posta / SMS</span></div><button class="sw ${u.marketing ? 'on' : ''}" id="pfMkt" data-act="swOnly" role="switch" aria-checked="${!!u.marketing}" aria-label="Ticari ileti izni"><i></i></button></div>
   <div class="err" id="pfErr"></div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Vazgeç</button><button class="btn primary" data-act="pfSave">Kaydet</button></div>`, 'Kişisel bilgiler');
  const p = $id('pfPhone');
  p.addEventListener('input', () => { const d = MeridyenAuth.normPhone(p.value).slice(0, 10); p.value = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' '); });
}
async function savePersonal() {
  ['pfNameErr', 'pfEmailErr', 'pfPhoneErr'].forEach((id: any) => ferr(id, ''));
  const res = await MeridyenAuth.updateProfile(state.auth.no, { name: v('pfName'), email: v('pfEmail'), phone: v('pfPhone'), marketing: $id('pfMkt').getAttribute('aria-checked') === 'true' });
  if (!res.ok) { const e = res.errors || {}; ferr('pfNameErr', e.name); ferr('pfEmailErr', e.email); ferr('pfPhoneErr', e.phone); if (e.form) $id('pfErr').textContent = e.form; return; }
  state.auth.user = res.user.name; state.accounts = MeridyenAuth.accounts();
  state.banks.forEach((b: any) => b.holder = res.user.name);
  closeSheet(); state.keepScroll = true; render(); toast('Bilgileriniz güncellendi');
}
const v = (id: any) => ($id(id) || {}).value || '';
function openKyc() {
  const u = (MeridyenAuth.getUser(state.auth.no) || {}) as any;
  const row = (t?: any, s?: any) => `<div class="setrow"><span class="ic lime">${ic.checkS}</span><div class="t"><b>${t}</b><span>${s}</span></div></div>`;
  sheet(`<h3>Kimlik Doğrulama</h3><div class="sub2">Hesabınız işlem yapmaya açık.</div>
   <div class="setlist">${row('Kimlik bilgileri', esc(u.name) + ' · onaylandı')}${row('Cep telefonu', '+90 ' + MeridyenAuth.maskPhone(u.phone) + ' · doğrulandı')}${row('E-posta', esc(u.email) + ' · doğrulandı')}${row('Uygunluk testi', 'Pay piyasası işlemleri için uygun')}</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Tamam</button></div>`, 'Kimlik doğrulama');
}
function openSecurity() {
  const u = (MeridyenAuth.getUser(state.auth.no) || {}) as any;
  sheet(`<h3>Güvenlik</h3><div class="sub2">Son giriş: ${u.lastLogin ? dtstr(Date.parse(u.lastLogin)) : '—'}${u.prevLogin ? ' · Önceki: ' + dtstr(Date.parse(u.prevLogin)) : ''}</div>
   <div class="setlist">
    <button data-act="pwChange"><span class="ic">${ic.lock}</span><div class="t"><b>Şifre değiştir</b><span>${u.pwChangedAt ? 'Son değişiklik ' + dstr(Date.parse(u.pwChangedAt)) : 'Şifrenizi düzenli olarak yenileyin'}</span></div>${ic.chev}</button>
    <div class="setrow"><span class="ic">${ic.shield}</span><div class="t"><b>İki adımlı doğrulama</b><span>Girişte telefonunuza gelen 6 haneli kod istenir</span></div><button class="sw ${u.twoFA ? 'on' : ''}" data-act="twofa" role="switch" aria-checked="${!!u.twoFA}" aria-label="İki adımlı doğrulama"><i></i></button></div>
    <div class="setrow"><span class="ic">${ic.lock}</span><div class="t"><b>Her girişte şifre sor</b><span>Uygulama her açıldığında giriş ekranı gelsin</span></div><button class="sw ${!state.auth.remember ? 'on' : ''}" data-act="askpw" role="switch" aria-checked="${!state.auth.remember}" aria-label="Her girişte şifre sor"><i></i></button></div>
    <button data-act="delAcct" class="danger"><span class="ic rose">${ic.trash}</span><div class="t"><b>Hesabı kapat</b><span>Hesabınız ve bu cihazdaki tüm verileri silinir</span></div>${ic.chev}</button>
   </div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Güvenlik');
}
function openPwChange() {
  const eye = (id: any) => `<button class="eye" type="button" data-act="eye" data-id="${id}" aria-label="Şifreyi göster">${ic.eye}</button>`;
  sheet(`<h3>Şifre Değiştir</h3><div class="sub2">Yeni şifre en az 8 karakter olmalı, harf ve rakam içermeli.</div>
   <div class="field"><label for="pwCur">Mevcut şifre</label><div class="inpw"><input class="inp" id="pwCur" type="password" autocomplete="current-password" autofocus>${eye('pwCur')}</div><div class="ferr2" id="pwCurErr"></div></div>
   <div class="field"><label for="pwNew">Yeni şifre</label><div class="inpw"><input class="inp" id="pwNew" type="password" autocomplete="new-password">${eye('pwNew')}</div><div class="meter" id="pwMeter" data-s="0"><i></i><i></i><i></i><i></i></div><div class="ferr2" id="pwNewErr"></div></div>
   <div class="field"><label for="pwNew2">Yeni şifre tekrar</label><input class="inp" id="pwNew2" type="password" autocomplete="new-password"><div class="ferr2" id="pwNew2Err"></div></div>
   <div class="acts"><button class="btn ghost" data-act="security">Geri</button><button class="btn primary" data-act="pwSave">Şifreyi değiştir</button></div>`, 'Şifre değiştir');
  const n = $id('pwNew'); n.addEventListener('input', () => { $id('pwMeter').dataset.s = MeridyenAuth.strength(n.value); });
}
async function savePw() {
  ['pwCurErr', 'pwNewErr', 'pwNew2Err'].forEach((id: any) => ferr(id, ''));
  const res = await MeridyenAuth.changePassword(state.auth.no, v('pwCur'), v('pwNew'), v('pwNew2'));
  if (!res.ok) return ferr({ current: 'pwCurErr', next: 'pwNewErr', confirm: 'pwNew2Err' }[res.field] || 'pwCurErr', res.error);
  note('info', 'Şifreniz değiştirildi', 'Bu işlemi siz yapmadıysanız hemen şifrenizi yenileyin.');
  openSecurity(); toast('Şifreniz değiştirildi');
}
function openDelAcct() {
  sheet(`<h3>Hesabı Kapat</h3><div class="sub2">Bu işlem geri alınamaz. Hesabınız, portföyünüz ve hesap hareketleriniz bu cihazdan silinir.</div>
   <div class="field"><label for="delPw">Onaylamak için şifreniz</label><input class="inp" id="delPw" type="password" autocomplete="current-password" autofocus><div class="ferr2" id="delPwErr"></div></div>
   <div class="acts"><button class="btn ghost" data-act="security">Vazgeç</button><button class="btn sell" data-act="delSave">Hesabı kapat</button></div>`, 'Hesabı kapat');
}
async function saveDel() {
  if (DEMO_MODE) return ferr('delPwErr', 'Bu ekranda hesap kapatılamaz.');
  const res = await MeridyenAuth.deleteAccount(state.auth.no, v('delPw'));
  if (!res.ok) return ferr('delPwErr', res.error);
  state.auth.in = false; topNav('/');
}

/* ---------- sözleşmeler, yardım, referans, yükleme, hakkında ---------- */
const DOCS: any = [
  ['Çerçeve sözleşme', 'Aracı kurum ile müşteri arasındaki hak ve yükümlülükleri, emir iletim kanallarını, ücret ve komisyonları ve hesabın işleyişini düzenler. Emirler müşterinin talimatı doğrultusunda iletilir; aracı kurum en iyi gerçekleştirme ilkesine göre hareket eder.'],
  ['Genel risk bildirim formu', 'Sermaye piyasası araçlarında yapılan işlemler kâr imkânının yanında zarar riski de taşır. Yatırdığınız tutarın bir kısmını ya da tamamını kaybedebilirsiniz. Kaldıraçlı ürünlerde zarar, yatırılan tutarı aşabilir.'],
  ['Pay piyasası bilgilendirme formu', 'Pay piyasasında sürekli işlem hafta içi 10:00–18:00 arasındadır. Fiyat adımları pay fiyatına göre değişir; günlük fiyat değişim sınırı önceki kapanışın ±%10\'udur. Takas işlem gününden iki iş günü sonra (T+2) gerçekleşir.'],
  ['Kişisel verilerin işlenmesi aydınlatma metni', 'Kimlik ve iletişim bilgileriniz hesabınızın açılması, işlemlerinizin yürütülmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir. 6698 sayılı Kanun\'un 11. maddesindeki haklarınızı kullanabilirsiniz.'],
];
function openContracts(i?: any) {
  const u = (MeridyenAuth.getUser(state.auth.no) || {}) as any, d = u.createdAt ? dstr(Date.parse(u.createdAt)) : dstr(nowTs());
  if (i != null) {
    const doc = DOCS[+i];
    return sheet(`<h3>${doc[0]}</h3><div class="sub2">Onay tarihi: ${d}</div><div class="art"><p>${doc[1]}</p></div>
     <div class="acts"><button class="btn ghost" data-act="contracts">Geri</button><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, doc[0], 'tall');
  }
  sheet(`<h3>Sözleşmeler</h3><div class="sub2">Hesap açılışında onayladığınız metinler.</div>
   <div class="setlist">${DOCS.map((doc?: any, k?: any) => `<button data-act="contract" data-i="${k}"><span class="ic">${ic.doc}</span><div class="t"><b>${doc[0]}</b><span>Onaylandı · ${d}</span></div>${ic.chev}</button>`).join('')}</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Sözleşmeler');
}
const FAQ: any = [
  ['Borsa hangi saatlerde açık?', 'Pay piyasasında sürekli işlem hafta içi 10:00 ile 18:00 arasındadır.'],
  ['Limit emrim neden gerçekleşmedi?', 'Limit alış emri fiyat limitinize ya da altına inince, limit satış emri limitinize ya da üstüne çıkınca gerçekleşir. Bekleyen emirlerinizi Portföy > Emirler\'den izleyip iptal edebilirsiniz.'],
  ['Komisyon ne kadar?', 'İşlem tutarının %0,1\'i ve bu komisyonun %5\'i kadar BSMV. Onay ekranında ayrıntılı gösterilir.'],
  ['Para yatırma ne kadar sürer?', 'Tutar hemen hesabınıza geçer. Önce Banka hesaplarım\'dan kendi adınıza kayıtlı bir IBAN ekleyin.'],
  ['Fiyat alarmı nasıl kurulur?', 'Hisse sayfasındaki zil simgesine dokunun, seviyeyi yazın. Fiyat o seviyeye ulaşınca bildirim gelir.'],
];
function openHelp() {
  sheet(`<h3>Yardım ve Destek</h3><div class="sub2">Sık sorulan sorular ve destek talebi.</div>
   <div class="faq2">${FAQ.map(([q, a]: any) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
   <div class="slab">Destek talebi</div>
   <div class="field"><label for="tkSub">Konu</label><select class="inp" id="tkSub"><option>Emir ve işlemler</option><option>Para yatırma / çekme</option><option>Hesap ve güvenlik</option><option>Öneri</option></select></div>
   <div class="field"><label for="tkMsg">Mesajınız</label><textarea class="inp" id="tkMsg" rows="4" maxlength="1000" placeholder="Sorununuzu kısaca anlatın"></textarea><div class="ferr2" id="tkMsgErr"></div></div>
   <div class="acts"><button class="btn ghost" data-act="closeSheet">Kapat</button><button class="btn primary" data-act="tkSave">Talep gönder</button></div>
   ${state.tickets.length ? `<div class="slab">Taleplerim</div><div class="setlist">${state.tickets.map((t: any) => `<div class="setrow"><span class="ic">${ic.help}</span><div class="t"><b>${esc(t.sub)} · #${t.no}</b><span>${dtstr(t.ts)} · ${t.status}</span><span>${esc(t.msg.slice(0, 80))}${t.msg.length > 80 ? '…' : ''}</span></div></div>`).join('')}</div>` : ''}`, 'Yardım ve destek', 'tall');
}
function saveTicket() {
  const msg = v('tkMsg').trim();
  if (msg.length < 10) return ferr('tkMsgErr', 'Mesajınız en az 10 karakter olmalı.');
  const t = { id: uid('T'), no: String(Math.floor(100000 + Math.random() * 900000)), ts: nowTs(), sub: v('tkSub'), msg, status: 'Alındı' };
  state.tickets.unshift(t); note('info', `Destek talebiniz alındı · #${t.no}`, t.sub);
  persistApp(); openHelp(); toast(`Talebiniz alındı · #${t.no}`);
}
function refCode() { return 'MRD' + state.auth.no.slice(-5); }
function openReferral() {
  const code = refCode(), text = `Meridyen Yatırım'da hesap aç, ilk ay komisyonsuz işlem yap. Davet kodum: ${code}`;
  sheet(`<h3>Arkadaşını Davet Et</h3><div class="sub2">Davet kodunuzla hesap açan her arkadaşınız ve siz bir ay komisyonsuz işlem yaparsınız.</div>
   <div class="refbox"><span>Davet kodunuz</span><b class="num">${code}</b></div>
   <div class="stats num"><div><span>Davet edilen</span><b>0</b></div><div><span>Kazanılan</span><b>0 ay</b></div></div>
   <div class="acts"><button class="btn ghost" data-act="copy" data-v="${esc(code)}">${ic.copy} Kodu kopyala</button><button class="btn primary" data-act="share" data-v="${esc(text)}">Paylaş</button></div>`, 'Referans');
}
function openInstall() {
  sheet(`<h3>Uygulamayı Yükle</h3><div class="sub2">Meridyen Yatırım Android uygulaması (sürüm 0.1.0).</div>
   <div class="setlist">
    <a class="setrow lnkrow" href="/indir/MeridyenYatirim.apk" download><span class="ic lime">${ic.dl}</span><div class="t"><b>Android (APK)</b><span>Android 7.0 ve üzeri · ≈ 28 MB</span></div>${ic.chev}</a>
    <div class="setrow"><span class="ic">${ic.globe}</span><div class="t"><b>Web</b><span>Şu an kullandığınız sürüm; telefon, tablet ve bilgisayarda çalışır</span></div></div>
   </div>
   <div class="note">APK kurmak için telefonda "bilinmeyen kaynaklardan yükleme" izni gerekir.</div>
   <div class="acts"><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Uygulamayı yükle');
}
function openAbout() {
  sheet(`<h3>Uygulama Hakkında</h3><div class="sub2">Meridyen Yatırım</div>
   <div class="stats num"><div><span>Sürüm</span><b>1.0.0</b></div><div><span>Android</span><b>0.1.0</b></div><div><span>Platform</span><b>Web</b></div><div><span>Durum</span><b>Güncel</b></div></div>
   <div class="acts"><button class="btn ghost" data-act="resetDemo">Verileri sıfırla</button><button class="btn primary" data-act="closeSheet">Kapat</button></div>`, 'Uygulama hakkında');
}

/* ---------- eylemler ---------- */
function extraAct(act?: any, a?: any, el?: any) {
  switch (act) {
    case 'watchToggle': watchToggle(a.s); state.keepScroll = true; render(); break;
    case 'watchEdit': state.watchEdit = !state.watchEdit; state.keepScroll = true; render(); break;
    case 'watchRm': state.watch = state.watch.filter((x: any) => x !== a.s); state.keepScroll = true; render(); toast(`${a.s} çıkarıldı`); break;
    case 'watchUp': { const i = state.watch.indexOf(a.s); if (i > 0) { state.watch.splice(i, 1); state.watch.splice(i - 1, 0, a.s); } state.keepScroll = true; render(); break; }
    case 'watchAdd': openWatchAdd(''); break;
    case 'waPick': watchToggle(a.s); openWatchAdd(($id('waQ') || {}).value || ''); if (state.screen === 'watch' || state.screen === 'detail') { state.keepScroll = true; render(); } break;
    case 'alarm': openAlarm(a.s); break;
    case 'alPct': { const st = stock(layerEl().querySelector('[data-act="alSave"]').dataset.s); $id('alPx').value = fmt(st.p * (1 + (+a.v) / 100)); break; }
    case 'alSave': {
      const st = stock(a.s), p = +parseNum(v('alPx')).toFixed(2);
      if (!(p > 0)) return ferr('alPxErr', 'Alarm fiyatı girin.');
      if (Math.abs(p - st.p) < 0.005) return ferr('alPxErr', 'Alarm fiyatı anlık fiyattan farklı olmalı.');
      state.alarms.push({ id: uid('A'), s: a.s, price: p, dir: p > st.p ? 'up' : 'down', ts: nowTs() });
      persistApp(); openAlarm(a.s); state.keepScroll = true; render(); openAlarm(a.s); toast(`${a.s} için ${tl(p)} alarmı kuruldu`); break;
    }
    case 'alDel': state.alarms = state.alarms.filter((x: any) => x.id !== a.id); persistApp(); openAlarm(a.s); break;
    case 'bell': openNotes(); break;
    case 'notesClear': state.notes = []; persistApp(); openNotes(); break;
    case 'notifSet': openNotifSet(); break;
    case 'nset': state.notif[a.k] = !state.notif[a.k]; el.classList.toggle('on', state.notif[a.k]); el.setAttribute('aria-checked', state.notif[a.k]); persistApp(); break;
    case 'article': openArticle(a.i); break;
    case 'newsSrc': openNewsSrc(); break;
    case 'srcT': { const on = state.newsOff.includes(a.v); state.newsOff = on ? state.newsOff.filter((x: any) => x !== a.v) : [...state.newsOff, a.v]; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); state.keepScroll = true; persistApp(); if (state.screen === 'news') { const y = main.scrollTop; main.innerHTML = renderNews(); bind(); main.scrollTop = y; } break; }
    case 'inst': openInst(a.k); break;
    case 'ipoSave': {
      const q = Math.floor(parseNum(v('ipoQ'))), px = +a.px, tot = q * px;
      if (!(q > 0)) return ferr('ipoQErr', 'Adet girin.');
      if (tot > state.cash) return ferr('ipoQErr', `Kullanılabilir bakiyeniz ${tl(state.cash)}.`);
      const r = { id: uid('I'), k: a.k, q, px, ts: nowTs(), status: 'Talep alındı' };
      state.ipoReq.push(r); state.cash -= tot;
      addLedger({ type: 'ipo', title: `${a.k} halka arz talebi`, sub: `${fmt(q, 0)} lot · ${tl(px)}`, amount: -tot, status: 'Bekliyor', ipo: r.id });
      note('info', `${a.k} halka arz talebiniz alındı`, `${fmt(q, 0)} lot · ${tl(tot)} bloke edildi`);
      persistApp(); openIpo(instRow(a.k).r); toast('Talebiniz alındı'); break;
    }
    case 'ipoCancel': {
      const r = state.ipoReq.find((x: any) => x.id === a.id); if (!r) break;
      r.status = 'İptal'; state.cash += r.q * r.px;
      const e = state.ledger.find((x: any) => x.ipo === r.id); if (e) e.status = 'İptal';
      addLedger({ type: 'refund', title: `${r.k} talep iadesi`, sub: 'Halka arz talebi iptal edildi', amount: r.q * r.px, status: 'İade edildi' });
      persistApp(); openIpo(instRow(a.k).r); toast('Talebiniz iptal edildi'); break;
    }
    case 'deposit': case 'withdraw': openMoney(act); break;
    case 'mQuick': { const el2 = $id('mAmt'); el2.value = a.k === 'deposit' ? fmt(+a.v) : fmt(Math.floor(state.cash * (+a.v) / 100 * 100) / 100); ferr('mAmtErr', ''); break; }
    case 'mSave': saveMoney(a.k); break;
    case 'banks': openBanks(); break;
    case 'bankAdd': openBankAdd(a.then); break;
    case 'bankSample': { const el2 = $id('bkIban'); el2.value = ibanMake('00064', String(Math.floor(1e15 + Math.random() * 8e15))); el2.dispatchEvent(new Event('input')); break; }
    case 'bankSave': saveBank(a.then); break;
    case 'bankDel': state.banks = state.banks.filter((b: any) => b.id !== a.id); persistApp(); openBanks(); toast('Banka hesabı silindi'); break;
    case 'ledger': openLedger('all'); break;
    case 'ledgerF': openLedger(a.v); break;
    case 'ledgerCsv': ledgerCsv(); break;
    case 'personal': openPersonal(); break;
    case 'swOnly': { const on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', on); el.classList.toggle('on', on); break; }
    case 'pfSave': savePersonal(); break;
    case 'kyc': openKyc(); break;
    case 'security': openSecurity(); break;
    case 'pwChange': openPwChange(); break;
    case 'pwSave': savePw(); break;
    case 'eye': { const i = $id(a.id); i.type = i.type === 'password' ? 'text' : 'password'; break; }
    case 'twofa': { const u = MeridyenAuth.getUser(state.auth.no); if (!u) break; void MeridyenAuth.setTwoFA(state.auth.no, !u.twoFA).then((r: any) => { if (!r.ok) { toast(r.error); return; } state.keepScroll = true; render(); openSecurity(); toast(r.user.twoFA ? 'İki adımlı doğrulama açıldı' : 'İki adımlı doğrulama kapatıldı'); }); break; }
    case 'delAcct': openDelAcct(); break;
    case 'delSave': saveDel(); break;
    case 'contracts': openContracts(); break;
    case 'contract': openContracts(a.i); break;
    case 'notifSet2': openNotifSet(); break;
    case 'help': openHelp(); break;
    case 'tkSave': saveTicket(); break;
    case 'referral': openReferral(); break;
    case 'copy': (navigator.clipboard ? navigator.clipboard.writeText(a.v) : Promise.reject()).then(() => toast('Kopyalandı'), () => toast(a.v)); break;
    case 'share': if (navigator.share) navigator.share({ text: a.v }).catch(() => {}); else (navigator.clipboard ? navigator.clipboard.writeText(a.v) : Promise.reject()).then(() => toast('Davet metni kopyalandı'), () => toast(a.v)); break;
    case 'install': openInstall(); break;
    case 'about': openAbout(); break;
    case 'resetDemo': {
      if (DEMO_MODE) break;
      MeridyenAuth.saveState({ v: 0 }); MeridyenAuth.flushState();
      toast('Hesap verileri sıfırlandı'); setTimeout(() => location.reload(), 900); break;
    }
    case 'simToggle': MeridyenMarket.setEnabled(!MeridyenMarket.enabled()); state.keepScroll = true; render(); toast(MeridyenMarket.enabled() ? 'Canlı fiyatlar açık' : 'Canlı fiyatlar kapalı'); break;
    case 'nav': state.nav = []; go(a.v, { push: false }); break;
    case 'navOrders': state.pfTab = 'orders'; state.nav = []; go('portfolio', { push: false }); break;
    case 'home': topNav('/'); break;
  }
}

/* ---------- canlı fiyat döngüsü ---------- */
function onMarketTick() {
  const a = matchOrders(), b = checkAlarms();
  if (a || b) persistApp();
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const sheetOpen = layerEl() && layerEl().innerHTML;
  const live = ['home', 'mkt', 'detail', 'watch', 'portfolio', 'profile', 'ticket', 'orders'];
  if (live.includes(state.screen) && !typing && !sheetOpen) { state.keepScroll = true; render(); }
  else if (state.tradeSheet && !typing) drawTrade();
  else paintShell();
  paintTape();
}
function paintTape() {
  const t = $id('tmtrack'); if (!t || state.screen === 'welcome') return;
  if (t.dataset.live !== '1') return;
}

/* ---------- masaüstü kenar panelleri (≥ 1100 px) ---------- */
const NAV: any = [['home', 'Piyasalar', ic.trend], ['portfolio', 'Portföy', ic.pie], ['ticket', 'Al · Sat', ic.swap2], ['watch', 'Takip', ic.star], ['news', 'Haberler', ic.doc], ['profile', 'Hesap', ic.user]];
const wide = () => matchMedia('(min-width: 1100px)').matches;
function paintShell() {
  const side = $id('dside'), rail = $id('drail');
  if (!side || !rail || !wide()) return;
  const cur = menuFor(state.screen) || (state.screen === 'news' ? 'news' : '');
  const pend = state.orders.filter((o: any) => o.status === 'pending').length, unread = (state.notes || []).filter((n: any) => !n.read).length;
  side.innerHTML = `<button class="dbrand" data-act="nav" data-v="welcome" aria-label="Açılış ekranı"><span class="logo">M</span><span><b>Meridyen Yatırım</b><small>İşlem platformu</small></span></button>
   <nav class="dnav" aria-label="Uygulama menüsü">${NAV.map(([k, n, i]: any) => `<button data-act="nav" data-v="${k}" class="${cur === k || (k === 'news' && state.screen === 'news') ? 'active' : ''}" ${cur === k ? 'aria-current="page"' : ''}>${i}<span>${n}</span>${k === 'portfolio' && pend ? `<em class="num">${pend}</em>` : ''}</button>`).join('')}
    <button data-act="bell" data-bell>${ic.bell}<span>Bildirimler</span>${unread ? `<em class="num">${unread}</em>` : ''}</button></nav>
   <div class="dlive ${MeridyenMarket.enabled() ? 'on' : ''}"><i></i><span>${MeridyenMarket.enabled() ? 'Canlı fiyatlar açık' : 'Canlı fiyatlar kapalı'}</span><button class="sw ${MeridyenMarket.enabled() ? 'on' : ''}" data-act="simToggle" role="switch" aria-checked="${MeridyenMarket.enabled()}" aria-label="Canlı fiyatlar"><i></i></button></div>
   <div class="duser"><span class="av">${esc(initials(state.auth.user))}</span><span class="t"><b>${esc(state.auth.user)}</b><small class="num">Müşteri No ${esc(state.auth.no)}</small></span>
    <button class="iconbtn sm" data-act="logout" aria-label="Çıkış yap" title="Çıkış yap">${ic.out}</button></div>
   <button class="dhome" data-act="home">${ic.back} Tanıtım sayfası</button>`;
  bind(side);
  const pf = portfolio(), hide = state.hidden, m = (x: any) => hide ? String(x).replace(/[0-9]/g, '•') : x;
  const wl = (state.watch || []).map(stock).filter(Boolean).slice(0, 8);
  rail.innerHTML = `<div class="card rsum"><div class="rh"><span>Toplam varlık</span><button class="eye2" data-act="hide" aria-label="Bakiyeyi gizle">${ic.eye}</button></div>
    <b class="num big">${m(tl(pf.total))}</b><span class="num ${cls(pf.dayPl)}">${m((pf.dayPl >= 0 ? '+' : '−') + tl(Math.abs(pf.dayPl)))} bugün</span>
    <div class="rgrid num"><div><span>Kullanılabilir</span><b>${m(tl(state.cash))}</b></div><div><span>Portföy</span><b>${m(tl(pf.value))}</b></div></div>
    <div class="racts"><button class="btn buy sm" data-act="deposit">${ic.down} Yatır</button><button class="btn ghost sm" data-act="withdraw">${ic.up} Çek</button></div></div>
   <div class="card rlist"><div class="rh"><b>Takip listem</b><button class="lnk" data-act="watchAdd">${ic.plus} Ekle</button></div>
    ${wl.length ? wl.map((st: any) => `<button class="rrow" data-act="detail" data-s="${st.s}">${av(st.s)}<span class="t"><b>${st.s}</b><em>${st.n}</em></span><span class="p num"><b class="${st.prev != null && st.p !== st.prev ? (st.p > st.prev ? 'flashU' : 'flashD') : ''}">${tl(st.p)}</b><em class="${cls(st.c)}">${pct(st.c)}</em></span></button>`).join('') : '<div class="empty">Listeniz boş.</div>'}</div>
   <div class="card rlist"><div class="rh"><b>Bekleyen emirler</b><button class="lnk" data-act="navOrders">Tümü</button></div>
    ${pend ? state.orders.filter((o: any) => o.status === 'pending').slice(0, 4).map((o: any) => `<div class="rrow"><span class="side-tag ${o.side}">${o.side === 'buy' ? 'AL' : 'SAT'}</span><span class="t"><b>${o.s} · ${typeName(o.type)}</b><em class="num">${fmt(o.qty, 0)} adet · ${tl(o.price)}</em></span><span class="p num"><em>Anlık</em><b>${tl(stock(o.s).p)}</b></span></div>`).join('') : '<div class="empty">Bekleyen emir yok.</div>'}</div>
   <div class="card rlist"><div class="rh"><b>Piyasa</b></div>${INDICES.map((i: any) => `<div class="rrow idx"><span class="t"><b>${i.n}</b></span><span class="p num"><b>${i.v}</b><em class="${cls(i.c)}">${pct(i.c)}</em></span></div>`).join('')}</div>`;
  bind(rail);
}

/* ---------- açılış ---------- */
const SCREENS = ['welcome', 'home', 'portfolio', 'ticket', 'watch', 'profile', 'news', 'orders'];
function syncHash() { const k = state.screen; if (SCREENS.includes(k) && location.hash !== '#' + k) history.replaceState(null, '', '#' + k); }
let booted = false;
export async function boot() {
  if (booted) return; booted = true;
  main = $id('main');
  $id('menu')!.addEventListener('click', (e: any) => { const b = e.target.closest('button'); if (!b) return; state.nav = []; go(b.dataset.screen, { push: false }); });
  applyTheme(); applyFont();
  if (!DEMO_MODE) {
    const u = await MeridyenAuth.load();
    if (!u) { openLogin(null); return; }
    try { preloadedState = (await MeridyenAuth.loadState()).data; } catch { preloadedState = null; }
    MeridyenAuth.onConflict((data: any) => { PERSIST_KEYS.forEach((k: any) => { if (data[k] !== undefined) state[k] = data[k]; }); state.keepScroll = true; render(); toast('Hesabınız başka bir oturumda güncellendi'); });
  }
  await MeridyenMarket.refresh();
  loadAuth();
  if (!state.auth.in) { openLogin(null); return; }
  seedState();
  const h = (location.hash || '').replace('#', '');
  if (SCREENS.includes(h)) state.screen = h;
  render(); paintBell(); setTimeout(toTop, 0);
  const tb = document.querySelector('.topbar');
  if (tb && !tb.querySelector('[data-bell]')) { const b = document.createElement('button'); b.className = 'iconbtn'; b.dataset.bell = ''; b.innerHTML = ic.bell; b.onclick = openNotes; tb.appendChild(b); paintBell(); }
  window.addEventListener('pagehide', () => { persistApp(); MeridyenAuth.flushState(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { persistApp(); MeridyenAuth.flushState(); } });
  matchMedia('(min-width: 1100px)').addEventListener('change', () => { paintShell(); if (state.screen === 'detail' || state.screen === 'ticket') drawChart(); });
  if (state.firstRunToast) setTimeout(() => toast('Hesabınıza ₺100.000 bakiye tanımlandı'), 500);
  MeridyenMarket.onTick(onMarketTick); MeridyenMarket.start();
}
