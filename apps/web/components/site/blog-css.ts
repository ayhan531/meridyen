export const BLOG_CSS = `
.blog{padding-block:48px 80px}.blog.art{max-width:780px}.blog h1{font-size:clamp(30px,5vw,44px);line-height:1.15;margin:8px 0 10px;letter-spacing:-.5px}
.blog .crumb{font-size:14px;opacity:.7}.blog .crumb a{text-decoration:underline}.blog .eyebrow{margin:18px 0 0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.65}
.blog .lead{font-size:18px;line-height:1.6;opacity:.8;margin:0 0 28px}.blog .cat{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:rgba(20,54,48,.09);color:#143630}
.blog .meta{font-size:13px;opacity:.65}.blog .card .cat{align-self:flex-start}
.blog .feat{display:block;padding:clamp(22px,4vw,36px);border-radius:20px;background:linear-gradient(135deg,#143630,#1f5a4d);color:#fff;margin-bottom:28px;text-decoration:none}
.blog .feat .cat{background:rgba(255,255,255,.16);color:#fff}.blog .feat h2{font-size:clamp(22px,3.4vw,32px);line-height:1.2;margin:14px 0 8px}.blog .feat p{opacity:.88;line-height:1.6;max-width:62ch}.blog .feat .meta{opacity:.75}
.blog .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:18px}
.blog .card{display:flex;flex-direction:column;gap:10px;padding:22px;border:1px solid rgba(20,54,48,.14);border-radius:18px;background:#fff;color:#16231f;text-decoration:none;transition:transform .15s,box-shadow .15s}
.blog .card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(20,54,48,.12)}.blog .card h3{font-size:19px;line-height:1.3;margin:0}.blog .card p{margin:0;line-height:1.55;opacity:.8;font-size:15px;flex:1}
.blog article section{margin-top:6px}.blog article h2{font-size:23px;margin:34px 0 8px}.blog article p,.blog article li{line-height:1.75;font-size:17px}.blog article ul{padding-left:22px;display:grid;gap:6px}
.blog .note{font-size:14px!important;padding:12px 16px;border-left:3px solid #143630;background:rgba(20,54,48,.06);border-radius:0 10px 10px 0;margin-top:16px}
.blog .cta{display:grid;gap:8px;justify-items:start;margin-top:44px;padding:26px;border-radius:18px;background:rgba(20,54,48,.07)}.blog .cta span{opacity:.8}
.blog .morehd{font-size:22px;margin:56px 0 16px}
@media (prefers-color-scheme: dark){.blog .card{background:#13201c;color:#e8f0ec;border-color:rgba(255,255,255,.12)}.blog .cat{background:rgba(255,255,255,.1);color:#cfe3da}.blog .note{border-color:#5fb89a;background:rgba(255,255,255,.05)}.blog .cta{background:rgba(255,255,255,.06)}}
`;
