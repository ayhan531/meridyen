/** Piyasa verisi: canlı kaynak, endeksler, döviz, şirket bilgisi, elle girilen fiyatlar (Python: refresh_market ve ilgili işlevler). */
import { Conn } from './db';
import {
  MARKET_URLS, Row, TRADINGVIEW_LOGO_BASE, TRADINGVIEW_SCANNER_URL, UA_BACKEND, cfg, httpJson, isoTime, now, pyFloat, pyRound, pyStr,
} from './common';
import { settingsMap } from './settings';

export function cleanSymbol(value: any): string {
  const raw = pyStr(value || '').toUpperCase().split(':').pop() as string;
  return raw.replace(/[^A-Z0-9]/g, '');
}

export function assetClassFor(symbol: string, productType = ''): string {
  const product = productType.toLowerCase();
  if (['fund', 'etf', 'mutual_fund'].includes(product)) return 'fund';
  if (symbol.startsWith('XU') || ['index', 'indices'].includes(product)) return 'index';
  if (symbol.endsWith('TRY') || ['forex', 'fx'].includes(product)) return 'fx';
  if (['BRENT', 'XAUUSD', 'XAGUSD', 'XAUTRY', 'XAGTRY'].includes(symbol) || ['commodity', 'futures'].includes(product)) return 'commodity';
  if ((symbol.endsWith('USD') && ['BTCUSD', 'ETHUSD'].includes(symbol)) || product === 'crypto') return 'crypto';
  return 'stock';
}

const isNone = (x: any) => x === null || x === undefined || x === '';
const truthy = (x: any) => !(x === null || x === undefined || x === '' || x === 0 || x === false || (Array.isArray(x) && !x.length));

export function quoteFromMapping(item: Row): Row | null {
  const data = Array.isArray(item.d) ? item.d : null;
  let symbolSource = item.symbol || item.code || item.s || item.name;
  let productType = pyStr(item.type || item.product_type || item.asset_class || '');
  if (data && data.length) {
    symbolSource = truthy(data[0]) ? data[0] : symbolSource;
    productType = pyStr(data.length > 12 ? data[12] : productType);
  }
  const symbol = cleanSymbol(symbolSource);
  if (!symbol || !/^[A-Z0-9]{2,16}$/.test(symbol)) return null;
  const priceCandidates = [item.price, item.last, item.last_price, item.close, data && data.length > 1 ? data[1] : null, data && data.length > 7 ? data[7] : null];
  const changeCandidates = [item.change_pct, item.changePercent, item.change_percent, item.change, data && data.length > 2 ? data[2] : null];
  const volumeCandidates = [item.volume, item.vol, data && data.length > 8 ? data[8] : null];
  let price: number; let changePct: number; let volume: number;
  try {
    const p = priceCandidates.find((x) => !isNone(x));
    if (p === undefined) return null;
    price = pyFloat(p);
    const c = changeCandidates.find((x) => !isNone(x));
    changePct = c === undefined ? 0 : pyFloat(c);
    const v = volumeCandidates.find((x) => !isNone(x));
    volume = v === undefined ? 0 : pyFloat(v);
  } catch {
    return null;
  }
  if (price <= 0) return null;
  let name = item.description || item.title || item.full_name;
  if (data && data.length > 11 && data[11]) name = data[11];
  return { symbol, name: pyStr(name || symbol), price, change_pct: changePct, volume, asset_class: assetClassFor(symbol, productType), updated_at: now() };
}

export function flattenMarketItems(value: any): Row[] {
  const items: Row[] = [];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (['d', 'symbol', 'code', 's', 'price', 'last'].some((k) => k in value)) items.push(value);
    for (const key of ['data', 'items', 'quotes', 'stocks', 'indices', 'last', 'result']) {
      if (key in value) items.push(...flattenMarketItems(value[key]));
    }
  } else if (Array.isArray(value)) {
    for (const item of value) items.push(...flattenMarketItems(item));
  }
  return items;
}

export function normalizeMarket(payload: any): Row[] {
  const quotes: Row[] = [];
  const seen = new Set<string>();
  for (const item of flattenMarketItems(payload)) {
    const quote = quoteFromMapping(item);
    if (!quote || seen.has(quote.symbol)) continue;
    seen.add(quote.symbol);
    quotes.push(quote);
  }
  return quotes;
}

export async function marketFeedEnabled(conn: Conn): Promise<boolean> {
  return (await settingsMap(conn)).market_feed_enabled !== '0' && ((await settingsMap(conn)).market_feed_enabled ?? '1') !== '0';
}

/** Yöneticinin panelden girdiği fiyatlar borsadan geleni ezer. */
export async function applyManualPrices(conn: Conn): Promise<void> {
  await conn.run(
    `UPDATE market_cache SET
       price=(SELECT m.price FROM instrument_prices m WHERE m.symbol=market_cache.symbol),
       change_pct=(SELECT m.change_pct FROM instrument_prices m WHERE m.symbol=market_cache.symbol)
     WHERE symbol IN (SELECT symbol FROM instrument_prices)`,
  );
}

export async function marketFromCache(conn: Conn): Promise<Row[]> {
  return conn.all(
    `SELECT m.*,
       COALESCE(p.compliant, 0) AS participation_compliant,
       p.updated_at AS participation_updated_at,
       COALESCE(p.note, '') AS participation_note
     FROM market_cache m
     LEFT JOIN participation_index p ON p.symbol = m.symbol
     WHERE m.updated_at > 0
     ORDER BY
       CASE m.symbol
         WHEN 'XU100' THEN 0 WHEN 'XU030' THEN 1 WHEN 'XBANK' THEN 2
         WHEN 'USDTRY' THEN 3 WHEN 'EURTRY' THEN 4 WHEN 'GBPTRY' THEN 5
         WHEN 'XAUTRY' THEN 6 WHEN 'XAGTRY' THEN 7 WHEN 'BRENT' THEN 8 WHEN 'BTCUSD' THEN 9
         ELSE 20
       END,
       m.symbol ASC
     LIMIT 1000`,
  );
}

export async function marketStatus(conn: Conn): Promise<Row> {
  const row = await conn.get('SELECT * FROM market_status WHERE id=1');
  if (!row) {
    const c = await conn.get('SELECT COUNT(*) c FROM market_cache');
    return { source: 'fallback', ok: 0, symbol_count: c?.c ?? 0, error: 'Durum kaydı yok', updated_at: 0, updated_at_label: '-' };
  }
  return { ...row, updated_at_label: row.updated_at ? isoTime(row.updated_at) : '-' };
}

export async function saveMarketStatus(conn: Conn, source: string, ok: boolean, symbolCount: number, error = ''): Promise<void> {
  await conn.run(
    `INSERT INTO market_status (id, source, ok, symbol_count, error, updated_at) VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET source=excluded.source, ok=excluded.ok, symbol_count=excluded.symbol_count, error=excluded.error, updated_at=excluded.updated_at`,
    [source, ok ? 1 : 0, symbolCount, error.slice(0, 500), now()],
  );
}

// ---- şirket bilgisi (ad, logo, sektör) -----------------------------------------------------------------------------

const COMPANY_META_VERSION = '2';
let metaFailedAt = 0;

export async function refreshCompanyMetadata(conn: Conn): Promise<void> {
  const stored = await conn.get("SELECT setting_value FROM system_settings WHERE setting_key='company_meta_version'");
  const forced = (stored ? stored.setting_value : '') !== COMPANY_META_VERSION;
  const meta = await conn.get(
    "SELECT COUNT(*) AS total, COALESCE(MAX(metadata_updated_at), 0) AS updated, SUM(CASE WHEN asset_class='fund' THEN 1 ELSE 0 END) AS funds FROM market_cache WHERE logo_url<>''",
  );
  if (!forced && meta && Number(meta.total || 0) >= 500 && Number(meta.funds || 0) >= 10 && now() - Number(meta.updated || 0) < cfg.companyMetaRefreshSeconds) return;
  if (Date.now() - metaFailedAt < 60_000) return; // kaynak yanıt vermiyorsa her istekte yeniden denenmez

  const body = JSON.stringify({
    markets: ['turkey'],
    symbols: { query: { types: [] }, tickers: [] },
    columns: ['name', 'description', 'logoid', 'sector', 'industry', 'type'],
    range: [0, 1000],
  });
  let payload: any;
  try {
    payload = await httpJson(TRADINGVIEW_SCANNER_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'User-Agent': UA_BACKEND }, timeoutMs: Math.max(15, cfg.marketTimeout) * 1000 });
  } catch {
    metaFailedAt = Date.now();
    return;
  }
  const refreshedAt = now();
  const syms: string[] = []; const names: string[] = []; const logos: string[] = []; const sectors: string[] = []; const inds: string[] = []; const classes: string[] = [];
  for (const item of payload?.data ?? []) {
    const values = item && typeof item === 'object' ? item.d : null;
    if (!Array.isArray(values) || values.length < 6) continue;
    const symbol = cleanSymbol(values[0]);
    if (!symbol) continue;
    const logoId = pyStr(values[2] || '').trim().toLowerCase();
    syms.push(symbol);
    names.push(pyStr(values[1] || symbol).trim());
    logos.push(/^[a-z0-9-]+$/.test(logoId) ? `${TRADINGVIEW_LOGO_BASE}/${logoId}--big.svg` : '');
    sectors.push(pyStr(values[3] || '').trim());
    inds.push(pyStr(values[4] || '').trim());
    classes.push(assetClassFor(symbol, pyStr(values[5] || '')));
  }
  if (!syms.length) { metaFailedAt = Date.now(); return; }
  await conn.run(
    `UPDATE market_cache m SET name=v.name, logo_url=v.logo_url, sector=v.sector, industry=v.industry, asset_class=v.asset_class, metadata_updated_at=?
       FROM (SELECT unnest(?::text[]) AS symbol, unnest(?::text[]) AS name, unnest(?::text[]) AS logo_url,
                    unnest(?::text[]) AS sector, unnest(?::text[]) AS industry, unnest(?::text[]) AS asset_class) v
      WHERE m.symbol=v.symbol`,
    [refreshedAt, syms, names, logos, sectors, inds, classes],
  );
  // Yöneticinin panelden verdiği adlar, borsadan gelen adı ezer.
  await conn.run(
    'UPDATE market_cache SET name=(SELECT n.name FROM instrument_names n WHERE n.symbol=market_cache.symbol) WHERE symbol IN (SELECT symbol FROM instrument_names)',
  );
  await conn.run(
    "INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES ('company_meta_version', ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at",
    [COMPANY_META_VERSION, now()],
  );
  await conn.commit();
}

// ---- döviz ---------------------------------------------------------------------------------------------------------

const FX_SOURCE_URL = 'https://api.frankfurter.dev/v1/latest?from=USD&to=TRY,EUR,GBP';
let fxFailedAt = 0;

async function fetchFxQuotes(conn: Conn): Promise<Row[]> {
  let usdtry: number; let eurPerUsd: number; let gbpPerUsd: number;
  try {
    const payload = await httpJson(FX_SOURCE_URL, { headers: { 'User-Agent': UA_BACKEND }, timeoutMs: cfg.marketTimeout * 1000 });
    const rates = payload.rates || {};
    usdtry = pyFloat(rates.TRY); eurPerUsd = pyFloat(rates.EUR); gbpPerUsd = pyFloat(rates.GBP);
    if (!(usdtry > 0 && eurPerUsd > 0 && gbpPerUsd > 0)) return [];
  } catch {
    return [];
  }
  const ts = now();
  const fresh: Record<string, [string, number]> = {
    USDTRY: ['Amerikan Doları', pyRound(usdtry, 4)],
    EURTRY: ['Euro', pyRound(usdtry / eurPerUsd, 4)],
    GBPTRY: ['İngiliz Sterlini', pyRound(usdtry / gbpPerUsd, 4)],
  };
  const quotes: Row[] = [];
  for (const [symbol, [name, price]] of Object.entries(fresh)) {
    const prior = await conn.get('SELECT price FROM market_cache WHERE symbol=?', [symbol]);
    const priorPrice = prior && prior.price ? Number(prior.price) : 0;
    const changePct = priorPrice > 0 ? pyRound(((price - priorPrice) / priorPrice) * 100, 2) : 0;
    quotes.push({ symbol, name, price, change_pct: changePct, volume: 0, asset_class: 'fx', updated_at: ts });
  }
  return quotes;
}

export async function refreshFx(conn: Conn): Promise<void> {
  const row = await conn.get("SELECT MIN(updated_at) AS oldest FROM market_cache WHERE symbol IN ('USDTRY','EURTRY','GBPTRY')");
  const oldest = row && row.oldest !== null && row.oldest !== undefined ? Number(row.oldest) : 0;
  if (now() - oldest < cfg.fxRefreshSeconds) return;
  if (Date.now() - fxFailedAt < 60_000) return;
  const quotes = await fetchFxQuotes(conn);
  if (!quotes.length) { fxFailedAt = Date.now(); return; }
  for (const q of quotes) {
    await conn.run(
      `INSERT INTO market_cache (symbol, name, price, change_pct, volume, asset_class, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(symbol) DO UPDATE SET price=excluded.price, change_pct=excluded.change_pct, updated_at=excluded.updated_at`,
      [q.symbol, q.name, q.price, q.change_pct, q.volume, q.asset_class, q.updated_at],
    );
  }
  await conn.commit();
}

// ---- endeksler -----------------------------------------------------------------------------------------------------

const INDEX_TICKERS: Record<string, [string, string]> = {
  'BIST:XU100': ['XU100', 'BIST 100'],
  'BIST:XU050': ['XU050', 'BIST 50'],
  'BIST:XU030': ['XU030', 'BIST 30'],
  'BIST:XKTUM': ['XKTUM', 'BIST Katılım Tüm'],
  'BIST:XBANK': ['XBANK', 'BIST Banka'],
};
let indexRefreshedAt = 0;

export async function refreshIndices(conn: Conn): Promise<void> {
  await conn.run('DELETE FROM market_cache WHERE updated_at<=0 AND metadata_updated_at<=0');
  if (Date.now() / 1000 - indexRefreshedAt < cfg.indexRefreshSeconds) return;
  indexRefreshedAt = Date.now() / 1000;
  const body = JSON.stringify({ symbols: { tickers: Object.keys(INDEX_TICKERS), query: { types: [] } }, columns: ['name', 'close', 'change'] });
  let payload: any;
  try {
    payload = await httpJson(TRADINGVIEW_SCANNER_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'User-Agent': UA_BACKEND }, timeoutMs: cfg.marketTimeout * 1000 });
  } catch {
    return;
  }
  const ts = now();
  const rows: any[][] = [];
  const list = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.data ?? [] : [];
  for (const item of list) {
    const ticker = item && typeof item === 'object' ? pyStr(item.s ?? '') : '';
    const values = item && typeof item === 'object' ? item.d : null;
    if (!(ticker in INDEX_TICKERS) || !Array.isArray(values) || values.length < 3) continue;
    let price: number; let change: number;
    try { price = pyFloat(values[1]); change = pyFloat(values[2]); } catch { continue; }
    if (!(price > 0) || Math.abs(change) > 25) continue;
    const [symbol, name] = INDEX_TICKERS[ticker];
    rows.push([symbol, name, pyRound(price, 2), pyRound(change, 2), 0, 'index', ts]);
  }
  if (rows.length) {
    for (const r of rows) {
      await conn.run(
        `INSERT INTO market_cache (symbol, name, price, change_pct, volume, asset_class, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(symbol) DO UPDATE SET price=excluded.price, change_pct=excluded.change_pct, updated_at=excluded.updated_at`,
        r,
      );
    }
    await conn.commit();
  }
}

// ---- ana yenileme --------------------------------------------------------------------------------------------------

let inflight: Promise<{ quotes: Row[]; url: string; lastError: string }> | null = null;

/** Canlı kaynaklardan sırayla dener; aynı anda tek istek uçar (bağlantı havuzunu tüketmesin). */
function fetchLatestQuotes(): Promise<{ quotes: Row[]; url: string; lastError: string }> {
  if (inflight) return inflight;
  inflight = (async () => {
    let lastError = '';
    for (const url of MARKET_URLS) {
      try {
        const payload = await httpJson(url, { headers: { 'User-Agent': UA_BACKEND }, timeoutMs: cfg.marketTimeout * 1000 });
        const quotes = normalizeMarket(payload);
        if (quotes.length) return { quotes, url, lastError: '' };
        lastError = 'Kaynak veri döndürdü ama sembol ayrıştırılamadı';
      } catch (exc: any) {
        lastError = String(exc?.message || exc);
      }
    }
    return { quotes: [], url: '', lastError };
  })().finally(() => { inflight = null; });
  return inflight;
}

export async function refreshMarket(conn: Conn): Promise<Row[]> {
  await refreshFx(conn);
  await refreshIndices(conn);
  if (!(await marketFeedEnabled(conn))) {
    // Panelden "borsadan fiyat çekmeyi durdur" denmiş: son fiyatlar dondurulur.
    await applyManualPrices(conn);
    await conn.commit();
    return marketFromCache(conn);
  }
  const latestRow = await conn.get('SELECT MAX(updated_at) AS updated FROM market_cache');
  const latest = Number(latestRow?.updated || 0);
  const statusRow = await conn.get('SELECT updated_at FROM market_status WHERE id=1');
  const statusUpdated = statusRow ? Number(statusRow.updated_at) : 0;
  if (now() - Math.trunc(Math.max(latest, statusUpdated)) < cfg.marketRefreshSeconds) {
    await refreshCompanyMetadata(conn);
    await applyManualPrices(conn);
    await conn.commit();
    return marketFromCache(conn);
  }
  const { quotes, url, lastError } = await fetchLatestQuotes();
  if (quotes.length) {
    // Fiyatlar her yenilemede güncellenir; TradingView'dan gelen ad, logo ve sektör bilgisi korunur.
    for (const q of quotes) {
      await conn.run(
        `INSERT INTO market_cache (symbol, name, price, change_pct, volume, asset_class, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(symbol) DO UPDATE SET
           price=excluded.price, change_pct=excluded.change_pct, volume=excluded.volume,
           asset_class=CASE WHEN market_cache.metadata_updated_at>0 THEN market_cache.asset_class ELSE excluded.asset_class END,
           name=CASE WHEN market_cache.metadata_updated_at>0 THEN market_cache.name ELSE excluded.name END,
           updated_at=excluded.updated_at`,
        [q.symbol, q.name, q.price, q.change_pct, q.volume, q.asset_class, q.updated_at],
      );
    }
    const sampledAt = now();
    const stocks = quotes.filter((q) => q.asset_class === 'stock');
    if (stocks.length) {
      await conn.run(
        'INSERT INTO market_history (symbol, price, recorded_at) SELECT unnest(?::text[]), unnest(?::float8[]), ?',
        [stocks.map((q) => q.symbol), stocks.map((q) => q.price), sampledAt],
      );
    }
    await conn.run('DELETE FROM market_history WHERE recorded_at<?', [sampledAt - 60 * 60 * 24 * 90]);
    await saveMarketStatus(conn, url, true, quotes.length, '');
    await conn.commit();
    await refreshCompanyMetadata(conn);
    await applyManualPrices(conn);
    await conn.commit();
    return marketFromCache(conn);
  }
  const c = await conn.get('SELECT COUNT(*) c FROM market_cache');
  await saveMarketStatus(conn, 'fallback-cache', false, Number(c?.c || 0), lastError || 'Canlı kaynak okunamadı');
  await applyManualPrices(conn);
  await conn.commit();
  return marketFromCache(conn);
}

export async function findQuote(conn: Conn, symbol: string, refresh = false): Promise<Row | null> {
  if (refresh) await refreshMarket(conn);
  const row = await conn.get('SELECT * FROM market_cache WHERE symbol=? AND updated_at>0', [symbol.toUpperCase()]);
  return row ?? null;
}
