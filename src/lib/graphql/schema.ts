// Updated GraphQL schema - Add Benzinga testing queries while keeping existing ones

export const typeDefs = `
  type Summary {
    id: String!
    timestamp: String!
    text: String!
    headlines: [String!]!
    image: String
    source: String
    url: String
    sourceLogoUrl: String
  }

  type Stock {
    ticker: String!
    price: Float!
    change: Float!
    changePercent: Float!
    name: String!
    logo: String!
    summaries: [Summary!]!
  }

  # NEW: For comparing news sources
  type NewsComparison {
    ticker: String!
    price: Float!
    change: Float!
    changePercent: Float!
    finnhubNews: [Summary!]!
    benzingaNews: [Summary!]!
    comparison: ComparisonStats!
  }

  type ComparisonStats {
    finnhubCount: Int!
    benzingaCount: Int!
    timestamp: String!
  }

  # NEW: For API health testing
  type BenzingaHealth {
    status: String!
    articlesReturned: Int
    hasApiKey: Boolean!
    timestamp: String!
    sampleHeadline: String
    error: String
  }

  type Query {
    # Existing queries (unchanged - use Finnhub)
    stock(ticker: String!): Stock!
    stocks(tickers: [String!]!): [Stock!]!
    
    # NEW: Benzinga testing queries
    stockWithBenzingaNews(ticker: String!): Stock!
    compareNews(ticker: String!): NewsComparison!
    benzingaHealth: BenzingaHealth!
  }

  type Mutation {
    # Existing mutation (unchanged)
    refreshStock(ticker: String!): Stock!
  }
`;

// Keep your existing export if you have one, or use this:
export default typeDefs;