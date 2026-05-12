import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { NextRequest, NextResponse } from 'next/server';

// Build the schema and Yoga handler once at module level (not per-request).
// This avoids rebuilding makeExecutableSchema on every cold start invocation.
const schema = makeExecutableSchema({ typeDefs, resolvers });

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: async ({ request }) => ({
    req: request,
  }),
});

// Add a short CDN cache so Vercel Edge doesn't forward every Apollo poll to
// Finnhub. 60s max-age matches the open-market polling interval; SWR allows
// serving a slightly stale response while revalidating in the background.
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

export async function GET(request: NextRequest) {
  const response = await handleRequest(request, {});
  const next = new NextResponse(response.body, response);
  next.headers.set('Cache-Control', CACHE_CONTROL);
  return next;
}

export async function POST(request: NextRequest) {
  const response = await handleRequest(request, {});
  const next = new NextResponse(response.body, response);
  next.headers.set('Cache-Control', CACHE_CONTROL);
  return next;
}