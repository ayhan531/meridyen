/** Biçimlendirme ve seans yardımcıları (uygulamadaki kurallarla aynı). */
export const fmt = (n: number, d = 2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
export const tl = (n: number, d = 2) => '₺' + fmt(n, d);
export const pct = (n: number) => (n > 0 ? '+' : '') + fmt(n) + '%';
export const cls = (n: number) => (n >= 0 ? 'up' : 'down');
export const arrow = (n: number) => (n >= 0 ? '▲' : '▼');
export const parseNum = (v: string) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;

export const marketOpen = (d: Date) => { const g = d.getDay(), m = d.getHours() * 60 + d.getMinutes(); return g >= 1 && g <= 5 && m >= 600 && m < 1080; };
export function sessionText(d: Date) {
  const open = marketOpen(d), dk = d.getHours() * 60 + d.getMinutes(), wd = d.getDay() >= 1 && d.getDay() <= 5;
  const kalan = open ? 1080 - dk : wd && dk < 600 ? 600 - dk : 0;
  const sure = kalan ? `${Math.floor(kalan / 60)} sa ${kalan % 60} dk` : '';
  return { open, label: open ? 'Borsa açık' : 'Borsa kapalı', sub: kalan ? (open ? 'kapanışa ' : 'açılışa ') + sure : 'sıradaki seans hafta içi 10:00' };
}
export type Sky = 'dawn' | 'day' | 'dusk' | 'night';
export function skyKind(): Sky { const h = new Date().getHours(); if (h < 6) return 'night'; if (h < 12) return 'dawn'; if (h < 18) return 'day'; if (h < 22) return 'dusk'; return 'night'; }
export function greeting() { const h = new Date().getHours(); if (h < 6) return 'İyi geceler'; if (h < 12) return 'Günaydın'; if (h < 18) return 'İyi günler'; if (h < 22) return 'İyi akşamlar'; return 'İyi geceler'; }
