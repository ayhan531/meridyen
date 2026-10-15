'use client';
/** Yönetim paneli: e-şube yönetici API'sinin (/api/admin/*) arayüzü. Giriş: T.C. + şifre (/api/login). */
import { useCallback, useEffect, useMemo, useState } from 'react';

type Json = any;
const TOKEN_KEY = 'mrdyn.admin.token';

async function call(path: string, token: string, method = 'GET', body?: Json): Promise<Json> {
  const res = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}), cache: 'no-store' });
  const txt = await res.text(); let j: Json = null; try { j = JSON.parse(txt); } catch { /* düz metin */ }
  if (!res.ok) throw new Error((j && j.error) || `Hata ${res.status}`);
  return j;
}

const money = (v: any) => (v == null || v === '' ? '—' : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v)));
const cell = (k: string, v: any) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && /balance|amount|total|price|cash|limit|reserved|withdrawals/.test(k)) return money(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

interface Tab { key: string; label: string; path: string; pick: string; cols?: string[]; q?: boolean }
const TABS: Tab[] = [
  { key: 'summary', label: 'Özet', path: '/admin/summary', pick: 'summary' },
  { key: 'users', label: 'Kullanıcılar', path: '/admin/users', pick: 'users', cols: ['id', 'tc', 'full_name', 'phone', 'status', 'kyc_status', 'cash_balance', 'blocked_balance', 'order_count', 'document_count', 'created_at_label'] },
  { key: 'orders', label: 'Emirler', path: '/admin/orders', pick: 'orders' },
  { key: 'money', label: 'Para Talepleri', path: '/admin/money', pick: 'money_requests' },
  { key: 'docs', label: 'Belgeler', path: '/admin/documents', pick: 'documents' },
  { key: 'bank', label: 'Banka Hesapları', path: '/admin/bank-accounts', pick: 'system_bank_accounts' },
  { key: 'tx', label: 'İşlemler', path: '/admin/transactions', pick: 'transactions' },
  { key: 'pos', label: 'Pozisyonlar', path: '/admin/positions', pick: 'positions' },
  { key: 'prices', label: 'Fiyatlar', path: '/admin/prices', pick: 'prices', q: true },
  { key: 't2', label: 'T+2 Takas', path: '/admin/t2-settlements', pick: 't2_settlements' },
  { key: 'balances', label: 'Bakiyeler', path: '/admin/user-balances', pick: 'balances' },
  { key: 'reports', label: 'Raporlar', path: '/admin/reports', pick: 'reports' },
  { key: 'settings', label: 'Ayarlar', path: '/admin/system-settings', pick: 'settings' },
  { key: 'msgs', label: 'Mesajlar', path: '/admin/contact-messages', pick: 'messages' },
  { key: 'audit', label: 'Denetim', path: '/admin/audit', pick: 'audit', q: true },
];

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [me, setMe] = useState<Json>(null);
  const [tab, setTab] = useState('summary');
  const [data, setData] = useState<Json>(null);
  const [raw, setRaw] = useState<Json>(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ tc: string; password: string }>({ tc: '', password: '' });

  const def = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const notify = (t: 'ok' | 'err', m: string) => { setMsg({ t, m }); setTimeout(() => setMsg(null), 6000); };

  const load = useCallback(async (tk: string, d: Tab, query: string) => {
    setBusy(true);
    try {
      const j = await call(d.path + (d.q && query ? `?q=${encodeURIComponent(query)}` : ''), tk);
      setRaw(j); const v = j[d.pick] ?? j; setData(v);
    } catch (e: any) { setData(null); setRaw(null); notify('err', e.message); if (/yetki|oturum|giriş/i.test(e.message)) logout(); }
    setBusy(false);
  }, []);

  useEffect(() => { try { const t = sessionStorage.getItem(TOKEN_KEY); if (t) setToken(t); } catch { /* yok */ } }, []);
  useEffect(() => {
    if (!token) return;
    call('/me', token).then((j) => { if (!j.user || j.user.role !== 'admin') { logout(); notify('err', 'Bu hesap yönetici değil'); } else setMe(j.user); }).catch(() => logout());
  }, [token]);
  useEffect(() => { if (token && me) void load(token, def, q); /* eslint-disable-next-line */ }, [token, me, tab]);

  function logout() { setToken(''); setMe(null); try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* yok */ } }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tc: form.tc, password: form.password }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Giriş başarısız');
      if (!j.user || j.user.role !== 'admin') throw new Error('Bu hesap yönetici değil');
      try { sessionStorage.setItem(TOKEN_KEY, j.token); } catch { /* yok */ }
      setForm({ tc: '', password: '' }); setToken(j.token);
    } catch (er: any) { notify('err', er.message); }
    setBusy(false);
  }

  async function act(path: string, body: Json, okMsg: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try { await call(path, token, 'POST', body); notify('ok', okMsg); await load(token, def, q); }
    catch (e: any) { notify('err', e.message); }
    setBusy(false);
  }
  const ask = (label: string, d = '') => window.prompt(label, d);

  const rows: Json[] = Array.isArray(data) ? data : [];
  const cols = useMemo(() => {
    if (!rows.length) return [] as string[];
    const all = Object.keys(rows[0]).filter((k) => !/hash|salt|^data$|password|avatar|token/i.test(k));
    const pref = (def.cols || []).filter((c) => all.includes(c));
    return (pref.length ? pref : all).slice(0, 14);
  }, [rows, def]);

  function rowActions(r: Json) {
    const id = r.id;
    const B = (label: string, fn: () => void, cls = '') => <button key={label} className={'b ' + cls} onClick={fn} disabled={busy}>{label}</button>;
    if (tab === 'users') return [
      r.status !== 'approved' && B('Onayla', () => act(`/admin/users/${id}/approve`, {}, 'Kullanıcı onaylandı')),
      r.status !== 'rejected' && B('Reddet', () => { const reason = ask('Red gerekçesi'); if (reason !== null) void act(`/admin/users/${id}/reject`, { reason }, 'Kullanıcı reddedildi'); }, 'warn'),
      B('Kilidi aç', () => act(`/admin/users/${id}/unlock`, {}, 'Kilit açıldı')),
      B('Bakiye', () => { const a = ask('Bakiye işlemi (add / subtract / set / credit)', 'add'); if (!a) return; const amount = ask('Tutar (TL)'); if (!amount) return; const note = ask('Not', '') || ''; void act('/admin/balances', { user_id: id, action: a, amount: Number(amount.replace(',', '.')), note }, 'Bakiye güncellendi'); }),
      B('Şifre', () => { const p = ask('Yeni şifre (en az 10 karakter, büyük/küçük harf, rakam)'); if (p) void act(`/admin/users/${id}/password`, { password: p }, 'Şifre değiştirildi'); }),
      B('Yönetici yap', () => act(`/admin/users/${id}/make_admin`, {}, 'Yönetici yapıldı', 'Bu kullanıcı yönetici olsun mu?'), 'warn'),
      B('Sil', () => act(`/admin/users/${id}/delete`, {}, 'Kullanıcı silindi', `#${id} silinsin mi? Geri alınamaz.`), 'danger'),
    ];
    if (tab === 'orders' && r.status === 'pending') return [B('Onayla', () => act(`/admin/orders/${id}/approve`, {}, 'Emir işlendi')), B('Reddet', () => { const reason = ask('Red gerekçesi'); if (reason !== null) void act(`/admin/orders/${id}/reject`, { reason }, 'Emir reddedildi'); }, 'warn')];
    if (tab === 'money' && r.status === 'pending') return [B('Onayla', () => act(`/admin/money/${id}/approve`, {}, 'Talep onaylandı')), B('Reddet', () => { const reason = ask('Red gerekçesi'); if (reason !== null) void act(`/admin/money/${id}/reject`, { reason }, 'Talep reddedildi'); }, 'warn')];
    if (tab === 'docs') return [B('Onayla', () => act(`/admin/documents/${id}/approve`, {}, 'Belge onaylandı')), B('Reddet', () => { const note = ask('Gerekçe'); if (note !== null) void act(`/admin/documents/${id}/reject`, { note }, 'Belge reddedildi'); }, 'warn')];
    if (tab === 't2') return [B('Sil', () => act(`/admin/t2-settlements/${id}/delete`, {}, 'Silindi', 'Takas kaydı silinsin mi?'), 'danger')];
    if (tab === 'bank') return [B('Aç/Kapat', () => act(`/admin/bank-accounts/${id}`, { action: 'toggle' }, 'Güncellendi')), B('Sil', () => act(`/admin/bank-accounts/${id}`, { action: 'delete' }, 'Silindi', 'Hesap silinsin mi?'), 'danger')];
    if (tab === 'prices') return [B('Elle fiyat', () => { const p = ask(`${r.symbol} fiyatı (boş = beslemeye dön)`, ''); if (p === null) return; void act('/admin/prices', { symbol: r.symbol, price: p, change_pct: p ? ask('Değişim % (boş olabilir)', '') || '' : '' }, 'Fiyat güncellendi'); })];
    return [];
  }

  if (!token || !me) {
    return (
      <main className="wrap login">
        <Style />
        <form onSubmit={login} className="card">
          <h1>Yönetim Paneli</h1>
          <p className="sub">Yönetici hesabınızla giriş yapın.</p>
          <label>T.C. Kimlik No<input inputMode="numeric" autoComplete="username" maxLength={11} value={form.tc} onChange={(e) => setForm({ ...form, tc: e.target.value.replace(/\D/g, '') })} required /></label>
          <label>Şifre<input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <button className="b primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
          {msg && <div className={'toast ' + msg.t}>{msg.m}</div>}
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Style />
      <header className="top">
        <b>Meridyen · Yönetim</b>
        <span className="sub">{me.full_name || me.tc}</span>
        <button className="b" onClick={logout}>Çıkış</button>
      </header>
      <nav className="tabs">{TABS.map((t) => <button key={t.key} className={'tab' + (t.key === tab ? ' on' : '')} onClick={() => { setTab(t.key); setQ(''); }}>{t.label}</button>)}</nav>
      {msg && <div className={'toast ' + msg.t}>{msg.m}</div>}
      <section className="bar">
        {def.q && <form onSubmit={(e) => { e.preventDefault(); void load(token, def, q); }}><input placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} /><button className="b">Ara</button></form>}
        <button className="b" onClick={() => load(token, def, q)} disabled={busy}>Yenile</button>
        {tab === 'users' && <button className="b primary" onClick={() => {
          const tc = ask('T.C. kimlik no'); if (!tc) return; const full_name = ask('Ad soyad'); if (!full_name) return; const phone = ask('Telefon'); if (!phone) return;
          const password = ask('Şifre (en az 10 karakter, büyük/küçük harf, rakam)'); if (!password) return; const opening = ask('Açılış bakiyesi (TL)', '0') || '0';
          void act('/admin/create-user', { tc, full_name, phone, password, status: 'approved', opening_balance: Number(opening.replace(',', '.')) }, 'Kullanıcı oluşturuldu');
        }}>+ Kullanıcı</button>}
        {tab === 'prices' && raw && <button className="b" onClick={() => act('/admin/market-feed', { enabled: !raw.feed_enabled }, raw.feed_enabled ? 'Canlı besleme durduruldu' : 'Canlı besleme açıldı')}>{raw.feed_enabled ? 'Canlı beslemeyi durdur' : 'Canlı beslemeyi aç'}</button>}
      </section>

      {tab === 'summary' && data && !Array.isArray(data) && (
        <div className="grid">{Object.entries(data).map(([k, v]) => <div className="stat" key={k}><span>{k.replace(/_/g, ' ')}</span><b>{typeof v === 'number' && /total/.test(k) ? money(v) : String(v)}</b></div>)}</div>
      )}
      {tab === 'reports' && data && !Array.isArray(data) && Object.entries(data).map(([k, v]) => <details open key={k} className="card" style={{ marginBottom: 10, padding: 12 }}><summary style={{ fontWeight: 700, cursor: 'pointer' }}>{k.replace(/_/g, ' ')}</summary><pre style={{ overflow: 'auto', fontSize: 12, margin: '8px 0 0' }}>{JSON.stringify(v, null, 1)}</pre></details>)}
      {tab === 'settings' && data && !Array.isArray(data) && <Settings data={data} onSave={(s) => act('/admin/system-settings', s, 'Ayarlar kaydedildi')} />}
      {tab === 'prices' && raw && <p className="sub">Besleme: {raw.feed_enabled ? 'açık' : 'durdurulmuş'} · {raw.total} enstrüman · {raw.manual_count} elle fiyat</p>}

      {Array.isArray(data) && (
        <div className="tw">
          <table>
            <thead><tr><th />{cols.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={r.id ?? r.symbol ?? i}><td className="acts">{rowActions(r)}</td>{cols.map((c) => <td key={c}>{cell(c, r[c])}</td>)}</tr>)}
              {!rows.length && <tr><td colSpan={cols.length + 1} className="sub">Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Settings({ data, onSave }: { data: Record<string, string>; onSave: (s: Record<string, string>) => void }) {
  const [v, setV] = useState<Record<string, string>>(data);
  useEffect(() => setV(data), [data]);
  return (
    <div className="card">
      <div className="sg">{Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => (
        <label key={k}><span>{k}</span><input value={String(val ?? '')} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
      ))}</div>
      <button className="b primary" onClick={() => onSave(v)}>Kaydet</button>
    </div>
  );
}

function Style() {
  return <style>{`
  .wrap{max-width:1200px;margin:0 auto;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#10241d;background:#f6f8f6;min-height:100vh}
  .login{display:grid;place-items:center}.card{background:#fff;border:1px solid #dfe7e2;border-radius:14px;padding:20px;display:grid;gap:12px;width:min(420px,100%)}
  h1{margin:0;font-size:22px}.sub{color:#5b6f66;font-size:13px;margin:0}
  label{display:grid;gap:4px;font-size:13px;font-weight:600}input{border:1px solid #cdd8d2;border-radius:10px;padding:10px 12px;font-size:16px;background:#fff;min-width:0}
  .b{border:1px solid #cdd8d2;background:#fff;border-radius:9px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer}.b:disabled{opacity:.5}
  .b.primary{background:#1e4b41;border-color:#1e4b41;color:#fff}.b.warn{color:#8a5a00}.b.danger{color:#b42318}
  .top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}.top .sub{margin-left:auto}
  .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}.tab{white-space:nowrap;border:1px solid #cdd8d2;background:#fff;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer}
  .tab.on{background:#1e4b41;color:#fff;border-color:#1e4b41}.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}.bar form{display:flex;gap:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.stat{background:#fff;border:1px solid #dfe7e2;border-radius:12px;padding:14px;display:grid;gap:4px}
  .stat span{font-size:12px;color:#5b6f66;text-transform:capitalize}.stat b{font-size:20px}
  .tw{overflow-x:auto;background:#fff;border:1px solid #dfe7e2;border-radius:12px}table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{padding:9px 10px;text-align:left;border-bottom:1px solid #eef2ef;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}th{font-size:11px;text-transform:uppercase;color:#5b6f66;background:#fafcfb}
  .acts{display:flex;gap:5px;flex-wrap:nowrap}.toast{padding:10px 12px;border-radius:10px;font-size:14px;margin:8px 0}.toast.ok{background:#e4f4ea;color:#14532d}.toast.err{background:#fde8e8;color:#8a1c1c}
  .sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:10px}.sg span{font-size:11px;color:#5b6f66;word-break:break-all}
  @media (max-width:640px){.wrap{padding:10px}.tw{border-radius:8px}.top .sub{display:none}}
  `}</style>;
}
