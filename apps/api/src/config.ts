/** Ortam değişkenleri tek yerden okunur; eksik zorunlu değerde uygulama açılmaz. */
const env = process.env;

function required(name: string, devFallback?: string): string {
  const v = env[name];
  if (v && v.trim()) return v.trim();
  if (env.NODE_ENV !== 'production' && devFallback !== undefined) return devFallback;
  throw new Error(`Ortam değişkeni eksik: ${name}`);
}

export const config = {
  isProd: env.NODE_ENV === 'production',
  port: Number(env.PORT || 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/meridyen'),
  /** Render Postgres harici bağlantıda TLS ister; iç bağlantıda gerekmez. */
  databaseSsl: env.DATABASE_SSL === 'true',
  jwtSecret: required('JWT_SECRET', 'yerel-gelistirme-anahtari-uretimde-degistirin'),
  /** Tarayıcı çerezleri yalnızca HTTPS'te gönderilsin (Render'da her zaman HTTPS). */
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production',
  /** Hazır hesap (müşteri no 48273621) açılışta oluşturulsun mu. */
  seedDemo: env.SEED_DEMO !== 'false',
  /**
   * SMS sağlayıcısı bağlanana kadar iki adımlı doğrulama kodu yanıtta döner ve ekranda gösterilir.
   * "log" yapılırsa kod yalnızca sunucu günlüğüne yazılır.
   */
  smsMode: (env.SMS_MODE || 'screen') as 'screen' | 'log',
};
