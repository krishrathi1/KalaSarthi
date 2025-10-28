/**
 * Vector Utilities
 * Helper functions for vector operations and calculations
 */

export class VectorUtils {
  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  /**
   * Calculate Euclidean distance between two vectors
   */
  static euclideanDistance(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let sum = 0;
    for (let i = 0; i < vectorA.length; i++) {
      const diff = vectorA[i] - vectorB[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }
  
  /**
   * Normalize a vector to unit length
   */
  static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return vector.slice(); // Return copy of zero vector
    }
    
    return vector.map(val => val / magnitude);
  }
  
  /**
   * Calculate the magnitude (length) of a vector
   */
  static magnitude(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }
  
  /**
   * Add two vectors element-wise
   */
  static add(vectorA: number[], vectorB: number[]): number[] {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    return vectorA.map((val, i) => val + vectorB[i]);
  }
  
  /**
   * Subtract two vectors element-wise
   */
  static subtract(vectorA: number[], vectorB: number[]): number[] {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    return vectorA.map((val, i) => val - vectorB[i]);
  }
  
  /**
   * Multiply vector by scalar
   */
  static scale(vector: number[], scalar: number): number[] {
    return vector.map(val => val * scalar);
  }
  
  /**
   * Calculate weighted average of multiple vectors
   */
  static weightedAverage(vectors: Array<{ vector: number[]; weight: number }>): number[] {
    if (vectors.length === 0) {
      throw new Error('At least one vector is required');
    }
    
    const dimensions = vectors[0].vector.length;
    const result = new Array(dimensions).fill(0);
    let totalWeight = 0;
    
    for (const { vector, weight } of vectors) {
      if (vector.length !== dimensions) {
        throw new Error('All vectors must have the same dimensions');
      }
      
      for (let i = 0; i < dimensions; i++) {
        result[i] += vector[i] * weight;
      }
      totalWeight += weight;
    }
    
    // Normalize by total weight
    if (totalWeight > 0) {
      for (let i = 0; i < dimensions; i++) {
        result[i] /= totalWeight;
      }
    }
    
    return result;
  }
  
  /**
   * Check if a vector is valid (no NaN or infinite values)
   */
  static isValidVector(vector: number[]): boolean {
    return vector.every(val => isFinite(val) && !isNaN(val));
  }
  
  /**
   * Generate a random vector with specified dimensions
   */
  static randomVector(dimensions: number, magnitude: number = 1): number[] {
    const vector = Array.from({ length: dimensions }, () => Math.random() - 0.5);
    return this.scale(this.normalize(vector), magnitude);
  }
  
  /**
   * Calculate centroid of multiple vectors
   */
  static centroid(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error('At least one vector is required');
    }
    
    const dimensions = vectors[0].length;
    const result = new Array(dimensions).fill(0);
    
    for (const vector of vectors) {
      if (vector.length !== dimensions) {
        throw new Error('All vectors must have the same dimensions');
      }
      
      for (let i = 0; i < dimensions; i++) {
        result[i] += vector[i];
      }
    }
    
    // Average
    for (let i = 0; i < dimensions; i++) {
      result[i] /= vectors.length;
    }
    
    return result;
  }
  
  /**
   * Find the most similar vector from a list
   */
  static findMostSimilar(
    queryVector: number[],
    candidateVectors: Array<{ id: string; vector: number[] }>,
    metric: 'cosine' | 'euclidean' = 'cosine'
  ): { id: string; similarity: number } | null {
    if (candidateVectors.length === 0) {
      return null;
    }
    
    let bestMatch = candidateVectors[0];
    let bestScore = metric === 'cosine' 
      ? this.cosineSimilarity(queryVector, bestMatch.vector)
      : -this.euclideanDistance(queryVector, bestMatch.vector); // Negative for "higher is better"
    
    for (let i = 1; i < candidateVectors.length; i++) {
      const candidate = candidateVectors[i];
      const score = metric === 'cosine'
        ? this.cosineSimilarity(queryVector, candidate.vector)
        : -this.euclideanDistance(queryVector, candidate.vector);
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
      }
    }
    
    return {
      id: bestMatch.id,
      similarity: metric === 'cosine' ? bestScore : -bestScore
    };
  }
  
  /**
   * Create a hash of a vector for caching/comparison
   */
  static hashVector(vector: number[], precision: number = 6): string {
    const rounded = vector.map(val => parseFloat(val.toFixed(precision)));
    return Buffer.from(JSON.stringify(rounded)).toString('base64');
  }
  
  /**
   * Compress vector by reducing precision
   */
  static compressVector(vector: number[], precision: number = 6): number[] {
    return vector.map(val => parseFloat(val.toFixed(precision)));
  }
  
  /**
   * Calculate vector statistics
   */
  static getVectorStats(vector: number[]): {
    min: number;
    max: number;
    mean: number;
    std: number;
    magnitude: number;
  } {
    const min = Math.min(...vector);
    const max = Math.max(...vector);
    const mean = vector.reduce((sum, val) => sum + val, 0) / vector.length;
    
    const variance = vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vector.length;
    const std = Math.sqrt(variance);
    
    const magnitude = this.magnitude(vector);
    
    return { min, max, mean, std, magnitude };
  }
}