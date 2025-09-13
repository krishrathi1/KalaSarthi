interface CachedResponse {
  response: string;
  language: string;
  timestamp: number;
  audioUrl?: string;
}

export class FastResponseCache {
  private static instance: FastResponseCache;
  private cache: Map<string, CachedResponse> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): FastResponseCache {
    if (!FastResponseCache.instance) {
      FastResponseCache.instance = new FastResponseCache();
    }
    return FastResponseCache.instance;
  }

  private generateKey(message: string, language: string): string {
    return `${language}:${message.toLowerCase().trim()}`;
  }

  public get(message: string, language: string): CachedResponse | null {
    const key = this.generateKey(message, language);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('🎯 Cache hit for:', message.substring(0, 50));
      return cached;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  public set(message: string, language: string, response: string, audioUrl?: string): void {
    const key = this.generateKey(message, language);
    this.cache.set(key, {
      response,
      language,
      timestamp: Date.now(),
      audioUrl
    });
    console.log('💾 Cached response for:', message.substring(0, 50));
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
