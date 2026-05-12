// Root layout — Server Component (no 'use client').
// Keeping this as a server component lets Next.js stream the HTML shell
// immediately and defer JS hydration to the Providers boundary below.

import './globals.css';
import { Providers } from '@/components/Providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'StockMonitor',
    description: 'Monitor your favorite stocks with real-time data and analytics',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}