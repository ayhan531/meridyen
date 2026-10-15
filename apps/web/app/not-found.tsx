import '@/styles/site.css';
import '@/styles/corp.css';

export default function NotFound() {
  return (
    <main className="nf">
      <div>
        <span className="logo" style={{ margin: '0 auto' }}>M</span>
        <h1>Bu sayfa haritada yok</h1>
        <p>Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn lime" href="/">Ana sayfaya dön</a>
          <a className="btn onDark" href="/iletisim">Bize yazın</a>
        </div>
      </div>
    </main>
  );
}
