'use client';
import { useSky } from './hooks';

export default function SkyImage({ id }: { id?: string }) {
  const k = useSky();
  return <img id={id} alt="" src={`/img/sky/${k}.jpg`} />;
}
