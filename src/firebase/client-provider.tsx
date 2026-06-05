'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Inisialisasi secara sinkron di level client untuk menghindari flicker state null
  const services = useMemo(() => initializeFirebase(), []);

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
