import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NOVA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
