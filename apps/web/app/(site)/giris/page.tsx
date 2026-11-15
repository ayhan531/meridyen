import type { Metadata } from 'next';
import '@/styles/auth.css';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Giriş yap — Kuzey Menkul Değerler',
  description: 'Kuzey Menkul Değerler hesabınıza müşteri numaranız ya da e-posta adresinizle giriş yapın.',
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
