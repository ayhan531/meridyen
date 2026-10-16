/** E-şubede bir emrin nasıl verildiğini gösteren örnek ekran döngüsü (yalnızca CSS animasyonu; veriler örnektir). */
export default function PhoneDemo() {
  return (
    <figure className="phone" aria-label="E-şube örnek ekranı: portföy, emir, onay">
      <div className="ph-frame" aria-hidden="true">
        <i className="ph-notch" />
        <div className="ph-screen">
          <div className="s s1">
            <small>Toplam varlık</small>
            <b className="big num">₺125.480,00</b>
            <div className="ph-rows"><div><span>Nakit</span><b className="num">₺38.200,00</b></div><div><span>Hisse senetleri</span><b className="num">₺87.280,00</b></div><div><span>T+2 bakiye</span><b className="num">₺0,00</b></div></div>
            <div className="ph-btn">Emir ver</div>
          </div>
          <div className="s s2">
            <small>Emir ver</small>
            <div className="ph-seg"><span className="on">Al</span><span>Sat</span></div>
            <div className="ph-f"><span>Adet</span><b className="num">100</b></div>
            <div className="ph-f"><span>Limit fiyat</span><b className="num">₺100,00</b></div>
            <div className="ph-rows"><div><span>İşlem tutarı</span><b className="num">₺10.000,00</b></div><div><span>Komisyon</span><b className="num">₺10,00</b></div><div><span>BSMV</span><b className="num">₺0,50</b></div><div className="t"><span>Toplam</span><b className="num">₺10.010,50</b></div></div>
            <div className="ph-btn pulse">Emri onayla</div>
          </div>
          <div className="s s3">
            <svg viewBox="0 0 64 64" width="84" height="84"><circle cx="32" cy="32" r="28" fill="none" stroke="#C8F169" strokeWidth="4" strokeOpacity=".35" /><path className="chk" pathLength={1} d="M19 33l9 9 18-20" fill="none" stroke="#1E4B41" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <b>Emir iletildi</b>
            <span>100 adet · Alış · Limit</span>
            <div className="ph-rows"><div><span>Durum</span><b>Gerçekleşti</b></div><div><span>Takas</span><b>T+2</b></div></div>
          </div>
        </div>
      </div>
      <figcaption>Örnek ekran; tutarlar gerçek veri değildir.</figcaption>
    </figure>
  );
}
