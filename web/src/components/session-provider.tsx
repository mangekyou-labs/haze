'use client';

import { SessionProvider } from 'next-auth/react';
import AnalyticsSessionReset from './analytics-session-reset';

export default function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsSessionReset />
      {children}
    </SessionProvider>
  );
}
