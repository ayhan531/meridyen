import { FAQ } from '@/lib/site-content';

export default function Faq({ items = FAQ }: { items?: typeof FAQ }) {
  return (
    <div className="faq">
      {items.map((x) => (<details key={x.q}><summary>{x.q}</summary><div>{x.a}</div></details>))}
    </div>
  );
}
