import '@/styles/site.css';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <span className="logo" style={{ margin: '0 auto 18px' }}>M</span>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Sayfa bulunamadı</h1>
        <p style={{ color: 'var(--muted)' }}>Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <a className="btn primary" href="/">Ana sayfaya dön</a>
      </div>
    </main>
  );
}
