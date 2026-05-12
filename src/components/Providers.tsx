'use client';

// Thin client boundary that owns ApolloProvider and ThemeProvider.
// Keeping this wrapper isolated means layout.tsx can remain a Server Component,
// allowing Next.js to stream the HTML shell before any JS hydrates.

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <ApolloProvider client={apolloClient}>
                {children}
            </ApolloProvider>
        </ThemeProvider>
    );
}
