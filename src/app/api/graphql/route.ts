import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { NextRequest } from 'next/server';

// Define Next.js App Router route context interface
interface RouteContext {
  params: Promise<Record<string, string | string[]>>;
}

// Define the schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Create Yoga instance
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: async ({ request }) => ({
    req: request, // Rename to req for consistency in resolvers
  }),
});

// Export GET handler
export async function GET(request: NextRequest) {
  return handleRequest(request, {});
}

// Export POST handler
export async function POST(request: NextRequest) {
  return handleRequest(request, {});
}