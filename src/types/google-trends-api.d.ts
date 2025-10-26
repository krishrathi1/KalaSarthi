declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string;
    geo?: string;
    timeframe?: string;
    category?: number;
    property?: string;
  }

  interface RelatedQueriesOptions {
    keyword: string;
    geo?: string;
    timeframe?: string;
    category?: number;
  }

  interface TrendingSearchesOptions {
    geo?: string;
    hl?: string;
    category?: number;
  }

  interface InterestByRegionOptions {
    keyword: string;
    geo?: string;
    resolution?: string;
    category?: number;
  }

  const googleTrends: {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>;
    relatedQueries(options: RelatedQueriesOptions): Promise<string>;
    trendingSearches(options: TrendingSearchesOptions): Promise<string>;
    interestByRegion(options: InterestByRegionOptions): Promise<string>;
  };

  export default googleTrends;
}
