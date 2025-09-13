import googleTrends from 'google-trends-api';

export interface GoogleTrendsData {
  keyword: string;
  searchVolume: number;
  trendIndex: number;
  relatedQueries: string[];
  rising: boolean;
  geo: string;
  timeRange: string;
}

export interface TrendsInterestOverTime {
  keyword: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

export class GoogleTrendsService {
  private defaultGeo = 'IN'; // Default to India
  private defaultTimeRange = 'today 3-m'; // Last 3 months

  /**
   * Get interest over time for keywords
   */
  async getInterestOverTime(keywords: string[], geo = this.defaultGeo, timeRange = this.defaultTimeRange): Promise<TrendsInterestOverTime[]> {
    try {
      const results: TrendsInterestOverTime[] = [];

      for (const keyword of keywords) {
        const response = await googleTrends.interestOverTime({
          keyword,
          geo,
          timeframe: timeRange,
          category: 0 // All categories
        });

        const data = JSON.parse(response);
        const timelineData = data.default.timelineData.map((item: any) => ({
          date: item.formattedTime,
          value: item.value[0]
        }));

        results.push({
          keyword,
          data: timelineData
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching Google Trends interest over time:', error);
      return [];
    }
  }

  /**
   * Get related queries for keywords
   */
  async getRelatedQueries(keywords: string[], geo = this.defaultGeo): Promise<Array<{ keyword: string; related: string[] }>> {
    try {
      const results: Array<{ keyword: string; related: string[] }> = [];

      for (const keyword of keywords) {
        const response = await googleTrends.relatedQueries({
          keyword,
          geo,
          timeframe: this.defaultTimeRange
        });

        const data = JSON.parse(response);
        const relatedQueries: string[] = [];

        // Extract rising and top queries
        if (data.default && data.default.rankedList) {
          data.default.rankedList.forEach((list: any) => {
            if (list.rankedKeyword) {
              list.rankedKeyword.forEach((item: any) => {
                if (item.query && !relatedQueries.includes(item.query)) {
                  relatedQueries.push(item.query);
                }
              });
            }
          });
        }

        results.push({
          keyword,
          related: relatedQueries.slice(0, 10) // Limit to top 10
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching Google Trends related queries:', error);
      return [];
    }
  }

  /**
   * Get trending searches in a region
   */
  async getTrendingSearches(geo = this.defaultGeo): Promise<string[]> {
    try {
      const response = await googleTrends.trendingSearches({
        geo,
        hl: 'en-US'
      });

      const data = JSON.parse(response);
      const trendingSearches: string[] = [];

      if (data.default && data.default.trendingSearchesDays) {
        data.default.trendingSearchesDays.forEach((day: any) => {
          if (day.trendingSearches) {
            day.trendingSearches.forEach((search: any) => {
              if (search.title && search.title.query) {
                trendingSearches.push(search.title.query);
              }
            });
          }
        });
      }

      return trendingSearches.slice(0, 20); // Return top 20 trending searches
    } catch (error) {
      console.error('Error fetching trending searches:', error);
      return [];
    }
  }

  /**
   * Get interest by region for keywords
   */
  async getInterestByRegion(keywords: string[], geo = this.defaultGeo): Promise<Array<{ keyword: string; regions: Array<{ name: string; value: number }> }>> {
    try {
      const results: Array<{ keyword: string; regions: Array<{ name: string; value: number }> }> = [];

      for (const keyword of keywords) {
        const response = await googleTrends.interestByRegion({
          keyword,
          geo,
          resolution: 'REGION'
        });

        const data = JSON.parse(response);
        const regions: Array<{ name: string; value: number }> = [];

        if (data.default && data.default.geoMapData) {
          data.default.geoMapData.forEach((region: any) => {
            if (region.geoName && region.value && region.value[0] > 0) {
              regions.push({
                name: region.geoName,
                value: region.value[0]
              });
            }
          });
        }

        // Sort by value descending and take top regions
        regions.sort((a, b) => b.value - a.value);

        results.push({
          keyword,
          regions: regions.slice(0, 10)
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching interest by region:', error);
      return [];
    }
  }

  /**
   * Generate keywords for artisan profession
   */
  generateKeywordsForProfession(profession: string): string[] {
    const professionLower = profession.toLowerCase();

    const keywordMap: { [key: string]: string[] } = {
      'weaver': [
        'handwoven sarees',
        'traditional weaving',
        'artisan textiles',
        'handloom fabrics',
        'woven wall hangings',
        'ethnic wear',
        'traditional clothing'
      ],
      'potter': [
        'handmade pottery',
        'ceramic art',
        'traditional pottery',
        'artisan ceramics',
        'pottery bowls',
        'earthenware',
        'clay crafts'
      ],
      'jeweler': [
        'handmade jewelry',
        'traditional jewelry',
        'artisan silverware',
        'handcrafted ornaments',
        'ethnic jewelry',
        'traditional necklace',
        'artisan earrings'
      ],
      'carpenter': [
        'handcrafted furniture',
        'wooden carvings',
        'traditional woodworking',
        'artisan woodwork',
        'handmade wooden items',
        'wooden crafts',
        'traditional furniture'
      ],
      'painter': [
        'traditional paintings',
        'handmade art',
        'cultural paintings',
        'artisan canvases',
        'folk art paintings',
        'traditional art',
        'cultural artwork'
      ],
      'metalworker': [
        'handcrafted metalwork',
        'traditional metal art',
        'artisan metal items',
        'handmade brassware',
        'metal sculptures',
        'traditional metal crafts',
        'artisan metalware'
      ],
      'textile artist': [
        'handmade textiles',
        'artisan fabrics',
        'traditional embroidery',
        'handcrafted garments',
        'textile art',
        'embroidered fabrics',
        'traditional textiles'
      ],
      'leatherworker': [
        'handcrafted leather',
        'traditional leatherwork',
        'artisan leather goods',
        'handmade bags',
        'leather accessories',
        'traditional leather crafts',
        'artisan leatherware'
      ]
    };

    // Find matching profession or use generic keywords
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (professionLower.includes(key)) {
        return keywords;
      }
    }

    // Generic keywords for unknown professions
    return [
      'handmade crafts',
      'traditional art',
      'artisan products',
      'handcrafted items',
      'cultural crafts',
      'ethnic crafts',
      'traditional handicrafts'
    ];
  }

  /**
   * Get comprehensive trend data for artisan profession
   */
  async getComprehensiveTrends(profession: string): Promise<{
    interestOverTime: TrendsInterestOverTime[];
    relatedQueries: Array<{ keyword: string; related: string[] }>;
    trendingSearches: string[];
    regionalInterest: Array<{ keyword: string; regions: Array<{ name: string; value: number }> }>;
  }> {
    const keywords = this.generateKeywordsForProfession(profession);

    const [interestOverTime, relatedQueries, trendingSearches, regionalInterest] = await Promise.allSettled([
      this.getInterestOverTime(keywords.slice(0, 5)), // Limit to 5 keywords for API quota
      this.getRelatedQueries(keywords.slice(0, 5)),
      this.getTrendingSearches(),
      this.getInterestByRegion(keywords.slice(0, 3)) // Limit to 3 keywords
    ]);

    return {
      interestOverTime: interestOverTime.status === 'fulfilled' ? interestOverTime.value : [],
      relatedQueries: relatedQueries.status === 'fulfilled' ? relatedQueries.value : [],
      trendingSearches: trendingSearches.status === 'fulfilled' ? trendingSearches.value : [],
      regionalInterest: regionalInterest.status === 'fulfilled' ? regionalInterest.value : []
    };
  }
}

export const googleTrendsService = new GoogleTrendsService();