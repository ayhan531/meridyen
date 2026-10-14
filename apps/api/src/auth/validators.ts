/** Alan doğrulamaları — mesajlar arayüzdeki ile birebir aynı. */
export const trLower = (s: unknown) => String(s ?? '').trim().toLocaleLowerCase('tr');
export const normPhone = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
export const normName = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');

export const V = {
  name(v: string): string {
    const s = normName(v);
    if (!s) return 'Adınızı ve soyadınızı yazın.';
    if (s.length < 5 || s.split(' ').length < 2) return 'Adınızı ve soyadınızı birlikte yazın.';
    if (s.length > 80) return 'Ad soyad en fazla 80 karakter olabilir.';
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû' .-]+$/.test(s)) return 'Ad soyad yalnızca harf içerebilir.';
    return '';
  },
  email(v: string): string {
    const s = String(v ?? '').trim();
    if (!s) return 'E-posta adresinizi yazın.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) || s.length > 120) return 'Geçerli bir e-posta adresi yazın (ör. ad@alanadi.com).';
    return '';
  },
  phone(v: string): string {
    const d = normPhone(v);
    if (!d) return 'Cep telefonu numaranızı yazın.';
    if (d.length !== 10 || d[0] !== '5') return 'Cep telefonu 5 ile başlayan 10 haneli olmalı (5XX XXX XX XX).';
    return '';
  },
  password(v: string): string {
    const s = String(v ?? '');
    if (s.length < 8) return 'Şifre en az 8 karakter olmalı.';
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s) || !/\d/.test(s)) return 'Şifrede en az bir harf ve bir rakam olmalı.';
    if (s.length > 128) return 'Şifre en fazla 128 karakter olabilir.';
    return '';
  },
};

export const maskPhone = (ph: string) => (ph && ph.length === 10 ? `${ph.slice(0, 3)} *** ** ${ph.slice(8)}` : '***');
