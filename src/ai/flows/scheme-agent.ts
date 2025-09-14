import { GovtScheme } from './govt-api-monitoring';

export interface ProcessedScheme extends GovtScheme {
  processedAt: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

export async function processSchemes({ newSchemes }: { newSchemes: GovtScheme[] }) {
  const processedSchemes: ProcessedScheme[] = newSchemes.map(scheme => ({
    ...scheme,
    processedAt: new Date().toISOString(),
    priority: 'medium' as const,
    tags: [scheme.category]
  }));

  return { processedSchemes };
}
