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
        <html lang="en" suppressHydrationWarning> {/* ADD THIS */}
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