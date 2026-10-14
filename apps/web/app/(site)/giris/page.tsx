import type { Metadata } from 'next';
import '@/styles/auth.css';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Giriş yap — Meridyen Yatırım',
  description: 'Meridyen Yatırım hesabınıza müşteri numaranız ya da e-posta adresinizle giriş yapın.',
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
