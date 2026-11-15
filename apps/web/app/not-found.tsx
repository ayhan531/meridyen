import '@/styles/site.css';
import '@/styles/corp.css';
import '@/styles/corp2.css';

export default function NotFound() {
  return (
    <main className="nf">
      <div>
        <img className="logo" src="/img/logo-mark.svg" alt="" width={38} height={38} style={{ margin: '0 auto' }} />
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
