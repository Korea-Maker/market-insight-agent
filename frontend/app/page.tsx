import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard as default page
  redirect('/dashboard');
}
