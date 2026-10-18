import { Ico } from './icons';

const CH: [string, string, string, string, string][] = [
  ['layers', 'E-şube (web)', 'Tarayıcıdan her cihazda: portföy, emirler, para hareketleri, haberler.', '/giris', 'E-şubeye gir'],
  ['phone', 'Android uygulaması', 'Android uygulamasını indirip kurun; e-şubeye telefonunuzdan tek dokunuşla ulaşın.', '/indir/MeridyenYatirim.apk', 'APK indir'],
  ['bell', 'Bildirimler', 'Emir gerçekleştiğinde ve para hareketi onaylandığında tarayıcı bildirimi alın.', '/platform#bildirim', 'Nasıl çalışır?'],
  ['globe', 'Telefona ekleyin', 'Tarayıcı menüsünden “Ana ekrana ekle” ile e-şubeye tek dokunuşla ulaşın.', '/destek#ekle', 'Adımlar'],
  ['user', 'Müşteri temsilcisi', 'Fon, VİOP ve döviz işlemleri için temsilcinizle iletişime geçin.', '/iletisim', 'Bize yazın'],
];

export default function Channels() {
  return (
    <div className="chan" id="kanallar" role="list">
      {CH.map(([i, t, d, h, c]) => (
        <a key={t} role="listitem" className="ch" href={h} {...(h.endsWith('.apk') ? { download: true } : {})}>
          <span className="ch-i"><Ico n={i} size={26} /></span>
          <h3>{t}</h3><p>{d}</p><em>{c}</em>
        </a>
      ))}
    </div>
  );
}
