'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<'loading' | 'resolved'>(
    'loading'
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthStatus('resolved');
    });

    return () => unsubscribe();
  }, []);

  if (authStatus === 'loading') {
    return null; // Next.js's loading.tsx will handle the UI
  }

  return <>{children}</>;
}
