import { LoginForm } from '@/components/Auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4 relative z-20">
      <LoginForm />
    </div>
  );
}
