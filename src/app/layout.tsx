'use client';

import './globals.css';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { ThemeProvider } from 'next-themes';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>StockMonitor</title>
                <meta name="description" content="Monitor your favorite stocks with real-time data and analytics" />
            </head>
            <body>
                <ThemeProvider 
                    attribute="class" 
                    defaultTheme="light" 
                    enableSystem={false}
                >
                    <ApolloProvider client={apolloClient}>
                        {children}
                    </ApolloProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}