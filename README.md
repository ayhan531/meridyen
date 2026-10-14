# Meridyen Yatırım

Borsa İstanbul işlem platformu: tanıtım sayfası, hesap açma, giriş ve işlem uygulaması.

| Klasör | Teknoloji | Görev |
|---|---|---|
| `apps/web` | Next.js 15 · React 19 · TypeScript | Tanıtım, giriş, kayıt sayfaları ve `/app` işlem platformu |
| `apps/api` | NestJS 11 · TypeORM · PostgreSQL · TypeScript | Hesaplar, oturum, iki adımlı doğrulama, kullanıcı verileri, canlı fiyatlar |
| `render.yaml` | Render Blueprint | Veritabanı + iki servisin tek adımda kurulumu |

## Render'a dağıtım

1. Bu klasörü bir GitHub (ya da GitLab) deposuna gönderin:
   ```
   git remote add origin https://github.com/<kullanici>/meridyen.git
   git push -u origin main
   ```
2. Render panelinde **New > Blueprint**'i seçin ve depoyu bağlayın. `render.yaml` okunur ve şunlar kurulur:
   - `meridyen-db` — PostgreSQL
   - `meridyen-api` — NestJS API (`/api/health` sağlık denetimi; açılışta veritabanı tablolarını kendisi kurar)
   - `meridyen-web` — Next.js sitesi
3. Kurulum bitince `meridyen-api` servisinin adresine bakın. Adres `https://meridyen-api.onrender.com` değilse
   (ad doluysa Render sonuna ek koyar), `meridyen-web` > Environment > `API_URL` değerini o adresle güncelleyin.
4. Site, `meridyen-web` servisinin adresindedir. Hazır hesap: müşteri no `48273621`, şifre `Meridyen2026`.

Ücretsiz planda servisler bir süre istek gelmeyince uyur; ilk açılış yarım dakika kadar sürebilir.
Ücretsiz PostgreSQL'in süre ve kapasite sınırları için Render'ın güncel plan sayfasına bakın; kalıcı kullanımda ücretli plana geçin.

### Ortam değişkenleri

**API (`apps/api`)**

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı (Render otomatik verir) |
| `JWT_SECRET` | Oturum imza anahtarı (Render rastgele üretir) |
| `COOKIE_SECURE` | `true`: çerez yalnızca HTTPS'te gönderilir |
| `SEED_DEMO` | `true`: hazır hesap (48273621) açılışta oluşturulur |
| `SMS_MODE` | `screen`: iki adımlı doğrulama kodu ekranda gösterilir · `log`: yalnızca sunucu günlüğüne yazılır |
| `DATABASE_SSL` | Render dışındaki bir veritabanına TLS ile bağlanmak için `true` |

**Web (`apps/web`)**

| Değişken | Açıklama |
|---|---|
| `API_URL` | API servisinin adresi. Tarayıcı yalnızca web sitesine istek atar; `/api/*` istekleri sunucu tarafında bu adrese iletilir, böylece oturum çerezi aynı alan adında kalır. |

## Yerelde çalıştırma

Gereken: Node.js 20+ ve PostgreSQL (Docker varsa `docker compose up -d`).

```
# API
cd apps/api
cp .env.example .env        # değerleri gerekirse düzenleyin
npm install
npm run start:dev           # http://localhost:4000

# Web (ayrı terminalde)
cd apps/web
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## Mimari

- **Oturum:** Giriş yapınca API `HttpOnly` + `SameSite=Lax` (üretimde ayrıca `Secure`) bir çerez verir. "Beni hatırla" açıksa 30 gün, kapalıysa tarayıcı kapanana kadar geçerlidir. Şifre değişince eski oturumlar düşer.
- **Şifreler:** scrypt ile tuzlu özet. 5 hatalı denemede hesap 5 dakika kilitlenir.
- **Koruma:** Helmet başlıkları, istek sınırlama (giriş ve kayıt için daha sıkı), durum değiştiren isteklerde yalnızca JSON (CSRF'e karşı), girdi doğrulama (fazla alan reddedilir).
- **Kullanıcı verileri:** Portföy, emirler, hesap hareketleri, takip listesi, alarmlar ve tercihler `app_states` tablosunda kullanıcıya özel saklanır. Aynı hesap iki yerde açıksa sürüm numarası çakışmayı yakalar ve güncel veri yüklenir.
- **Canlı fiyatlar:** API'deki fiyat motoru 3 saniyede bir payları günlük ±%10 sınırı içinde ve fiyat adımına uygun oynatır; bütün kullanıcılar aynı fiyatı görür. Gerçek veri sağlayıcısı bağlanırken yalnızca `apps/api/src/market` değişir.
- **İşlem platformu (`/app`):** Android uygulamasıyla birebir aynı görünüm için ekranları `apps/web/lib/trading/engine.ts` motoru çizer; `components/TradingApp.tsx` kabuğu kurup motoru başlatır.

## Uç noktalar

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/health` | Sağlık denetimi (veritabanı dahil) |
| GET | `/api/market` | Anlık fiyatlar |
| GET | `/api/auth/me` | Oturumdaki kullanıcı |
| POST | `/api/auth/register` | Hesap aç |
| POST | `/api/auth/login` | Giriş (iki adımlı doğrulama açıksa kod ister) |
| POST | `/api/auth/verify-code` | Doğrulama kodu |
| POST | `/api/auth/logout` | Çıkış |
| POST | `/api/auth/reset-password` | Şifre yenile (e-posta + telefon) |
| POST | `/api/auth/remember` | Oturumu açık tut / kapat |
| PATCH | `/api/auth/profile` | Kişisel bilgiler |
| POST | `/api/auth/change-password` | Şifre değiştir |
| POST | `/api/auth/two-factor` | İki adımlı doğrulamayı aç / kapat |
| DELETE | `/api/auth/account` | Hesabı kapat |
| GET / PUT | `/api/state` | Kullanıcının uygulama verisi |
