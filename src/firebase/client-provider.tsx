
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    const initialized = initializeFirebase();
    setServices(initialized);
  }, []);

  // Return background to avoid white flash in dark mode during initialization
  if (!services) return <div className="min-h-screen bg-background" />;

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      firestore={services.firestore}
      auth={services.auth}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
