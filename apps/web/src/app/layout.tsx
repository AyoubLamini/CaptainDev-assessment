import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { LogoutButton } from '../components/LogoutButton';
import './globals.css';

export const metadata: Metadata = {
  title: 'NOVA Admin',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAuthenticated = (cookieStore.has('__Host-session') || cookieStore.has('nova_session'));
  const isPlatformAdmin = cookieStore.get('isPlatformAdmin')?.value === 'true';

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 flex flex-col">
        {isAuthenticated && (
          <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-blue-600">NOVA</span>
                </div>
                <div className="ml-6 flex space-x-4 sm:space-x-8 overflow-x-auto">
                  {isPlatformAdmin ? (
                    <Link 
                      href="/platform/organizations"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Organizations
                    </Link>
                  ) : (
                    <>
                      <Link 
                        href="/companies"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Companies
                      </Link>
                      <Link 
                        href="/collaborators"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Collaborators
                      </Link>
                      <Link 
                        href="/search"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Search
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <LogoutButton />
              </div>
            </div>
            </div>
          </nav>
        )}
        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
