'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function PinGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const verified = sessionStorage.getItem('clearbook_pin_verified');
    if (verified === 'true') {
      setChecked(true);
    } else {
      router.replace('/pin');
    }
  }, [router, pathname]);

  if (!checked) {
    // Show nothing while checking / redirecting
    return null;
  }

  return <>{children}</>;
}
