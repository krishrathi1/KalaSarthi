
'use client';
import {Package} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';

const marketplaces = [
  {
    name: 'Amazon Karigar',
    logo: 'https://placehold.co/40x40.png',
    dataAiHint: 'amazon logo',
  },
  {
    name: 'Flipkart Samarth',
    logo: 'https://placehold.co/40x40.png',
    dataAiHint: 'flipkart logo',
  },
  {
    name: 'Etsy',
    logo: 'https://placehold.co/40x40.png',
    dataAiHint: 'etsy logo',
  },
];

export function MultiMarketplace() {
  return (
    <Card id="multi-marketplace">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Package className="size-6 text-primary" />
          Multi-Marketplace Management
        </CardTitle>
        <CardDescription>
          Sync your products across multiple marketplaces with one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {marketplaces.map(marketplace => (
            <div
              key={marketplace.name}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={marketplace.logo}
                  alt={marketplace.name}
                  className="size-10"
                  data-ai-hint={marketplace.dataAiHint}
                />
                <span className="font-medium">{marketplace.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`switch-${marketplace.name.toLowerCase()}`}>
                  Sync
                </Label>
                <Switch id={`switch-${marketplace.name.toLowerCase()}`} />
              </div>
            </div>
          ))}
        </div>
        <Button>Sync All Products</Button>
      </CardContent>
    </Card>
  );
}
