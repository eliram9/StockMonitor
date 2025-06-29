// Apollo Client setup for connecting to our GraphQL API

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Create HTTP link to our GraphQL endpoint
const httpLink = createHttpLink({
    uri: '/api/graphql', // This points to our GraphQL API
});

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(), // Caches queries for better performance
    defaultOptions: {
        watchQuery: {
            errorPolicy: 'all', // Show partial data even if there are errors
        },
        query: {
            errorPolicy: 'all',
        },
    },
});