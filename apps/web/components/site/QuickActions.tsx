import { Ico } from './icons';

const Q: [string, string, string][] = [
  ['user', 'Hesap aç', '/kayit'], ['wallet', 'Para yatır', '/destek#yatirma'], ['chart', 'Emir ver', '/destek#emir'],
  ['list', 'Maliyet hesapla', '/araclar#maliyet'], ['swap', 'Döviz çevir', '/araclar#doviz'], ['info', 'Yardım al', '/destek'],
];

export default function QuickActions() {
  return (
    <div className="quick" role="list">
      {Q.map(([i, t, h]) => (<a key={t} role="listitem" href={h}><span><Ico n={i} size={24} /></span><b>{t}</b></a>))}
    </div>
  );
}
