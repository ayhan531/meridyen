import type { Metadata } from 'next';
import '@/styles/auth.css';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Hesap aç — Kuzey Menkul Değerler',
  description: "Kuzey Menkul Değerler'de birkaç dakikada ücretsiz hesap açın.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
