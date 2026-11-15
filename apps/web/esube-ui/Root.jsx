// Meridyen e-şube / yönetim kabuğu. Oturum çerezle yürür (/api/me); giriş tek yerde, /giris sayfasında yapılır.
import React, { useCallback, useEffect, useRef, useState } from "react";
import Esube from "./esube/App.jsx";
import AdminConsole from "./AdminConsole.jsx";
import { api } from "./esube/store.js";
import { trackSafeArea } from "./esube/safearea.js";
import { trackInstall, registerWorker, refreshPush, clearOfflineData } from "./esube/pwa.js";
import "./style.css";
import "./extra.css";
import "./theme.css";
import "./meridyen.css";

const normalize = (data) => data?.user || (data?.id ? data : null);
const BOSTA_CIKIS_MS = 30 * 60 * 1000; // 30 dk işlem yapılmazsa oturum kapanır

const git = (url) => window.location.replace(url);
const girisUrl = (hedef) => `/giris?next=${encodeURIComponent(hedef)}`;

function Root({ mode }) {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const sonIslem = useRef(Date.now());
  const hedef = mode === "admin" ? "/admin" : "/app";

  const loadMe = useCallback(async () => {
    try {
      const u = normalize(await api("/api/me"));
      if (!u) { git(girisUrl(hedef)); return; }
      setMe(u);
    } catch (hata) {
      const oturumYok = /Oturum gerekli|HTTP 401/.test(String(hata?.message || ""));
      if (oturumYok) { clearOfflineData(); git(girisUrl(hedef)); return; }
    } finally {
      setReady(true);
    }
  }, [hedef]);

  useEffect(() => { trackSafeArea(); trackInstall(); registerWorker(); loadMe(); }, [loadMe]);
  useEffect(() => { if (me) refreshPush(); }, [me]);

  // Hesap durumu admin tarafından değişince sayfa yenilenmeden görünsün.
  useEffect(() => {
    if (!me) return;
    const z = setInterval(loadMe, 30_000);
    return () => clearInterval(z);
  }, [me, loadMe]);

  const logout = useCallback(async (neden) => {
    await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
    try { clearOfflineData(); } catch { /* yoksay */ }
    setMe(null);
    git(neden === "bosta" ? "/giris?oturum=sona-erdi" : "/giris");
  }, []);

  // Boşta kalma: etkileşim yoksa oturum otomatik kapanır (ortak cihaz güvenliği).
  useEffect(() => {
    if (!me) return;
    const isaretle = () => { sonIslem.current = Date.now(); };
    const olaylar = ["pointerdown", "keydown", "touchstart", "scroll"];
    olaylar.forEach((o) => window.addEventListener(o, isaretle, { passive: true, capture: true }));
    const kontrol = () => { if (Date.now() - sonIslem.current > BOSTA_CIKIS_MS) logout("bosta"); };
    const z = setInterval(kontrol, 20_000);
    const gorunur = () => { if (document.visibilityState === "visible") kontrol(); };
    document.addEventListener("visibilitychange", gorunur);
    return () => {
      olaylar.forEach((o) => window.removeEventListener(o, isaretle, { capture: true }));
      clearInterval(z);
      document.removeEventListener("visibilitychange", gorunur);
    };
  }, [me, logout]);

  useEffect(() => {
    document.body.classList.toggle("esube-open", Boolean(me) && mode !== "admin");
    return () => document.body.classList.remove("esube-open");
  }, [me, mode]);

  const loadAdmin = useCallback(async () => {
    if (!me || me.role !== "admin") return;
    const [summary, users, orders, moneyData, reports, systemSettings, market, news] = await Promise.all([
      api("/api/admin/summary").catch(() => ({})),
      api("/api/admin/users").catch(() => ({})),
      api("/api/admin/orders").catch(() => ({})),
      api("/api/admin/money").catch(() => ({})),
      api("/api/admin/reports").catch(() => ({})),
      api("/api/admin/system-settings").catch(() => ({})),
      api("/api/market").catch(() => ({})),
      api("/api/news").catch(() => ({})),
    ]);
    setAdminData({
      ...(summary || {}),
      users: users.users || [],
      orders: orders.orders || [],
      money_requests: moneyData.money_requests || [],
      reports,
      market_meta: { ...(market.meta || {}), symbol_count: (market.quotes || []).length },
      news_meta: { ...(news.meta || {}), count: (news.items || []).length },
      system_settings: systemSettings.settings || {},
    });
  }, [me]);

  useEffect(() => {
    if (mode === "admin" && me) {
      if (me.role !== "admin") { git("/app"); return; }
      loadAdmin();
    }
  }, [mode, me, loadAdmin]);

  if (!ready || !me) return <div className="mrdn-boot" aria-busy="true"><span /></div>;
  if (mode === "admin") {
    if (me.role !== "admin") return null;
    return <AdminConsole data={adminData || {}} refresh={loadAdmin} logout={() => logout()} onClose={() => git("/app")} />;
  }
  return <Esube me={me} onLogout={() => logout()} onAdmin={() => git("/admin")} refreshMe={loadMe} />;
}

/** Beklenmeyen hatada beyaz ekran yerine toparlama ekranı. */
class HataSiniri extends React.Component {
  state = { hata: false };
  static getDerivedStateFromError() { return { hata: true }; }
  componentDidCatch(h) { try { console.error("Uygulama hatası:", h); } catch { /* yoksay */ } }
  yenile = async () => {
    try {
      const k = (await navigator.serviceWorker?.getRegistrations?.()) || [];
      await Promise.all(k.map((x) => x.unregister()));
      const a = (await caches?.keys?.()) || [];
      await Promise.all(a.map((ad) => caches.delete(ad)));
    } catch { /* yoksay */ }
    window.location.reload();
  };
  render() {
    if (!this.state.hata) return this.props.children;
    return (
      <div className="mrdn-boot"><div style={{ textAlign: "center", padding: 24 }}>
        <h2 style={{ margin: "0 0 8px" }}>Bir sorun oluştu</h2>
        <p style={{ margin: "0 0 16px", opacity: 0.7 }}>Sayfa beklenmedik şekilde durdu. Yenileyince kaldığınız yerden devam edebilirsiniz.</p>
        <button className="btn" onClick={this.yenile}>Sayfayı yenile</button>
      </div></div>
    );
  }
}

export default function Shell({ mode }) {
  return <HataSiniri><Root mode={mode} /></HataSiniri>;
}
