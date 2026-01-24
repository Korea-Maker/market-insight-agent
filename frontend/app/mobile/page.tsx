/**
 * Mobile Chart Page
 * Dedicated mobile-optimized trading chart view
 */

import { MobileChartContainer } from '@/components/Chart/Mobile';

export const metadata = {
  title: 'Mobile Chart | QuantBoard',
  description: 'Mobile-optimized cryptocurrency trading chart',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
};

export default function MobilePage() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-background">
      <MobileChartContainer />
    </main>
  );
}
