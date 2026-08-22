import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ToastProvider } from '../components/Toast';
import { AppShell } from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'NOVA',
  description: 'NOVA Platform — SaaS Administration',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.has('__Host-session') || cookieStore.has('nova_session');
  const isPlatformAdmin = cookieStore.get('isPlatformAdmin')?.value === 'true';

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          {isAuthenticated ? (
            <AppShell isPlatformAdmin={isPlatformAdmin}>
              {children}
            </AppShell>
          ) : (
            <main>{children}</main>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
