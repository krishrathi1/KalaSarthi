
'use client';

import { Calculator } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PriceEngine() {
  return (
    <Card id="price-engine">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Calculator className="size-6 text-primary" />
          Fair Price Suggestion Engine
        </CardTitle>
        <CardDescription>
          Suggests fair prices for your products using your cost inputs and market analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="material-cost">Material Cost (₹)</Label>
            <Input id="material-cost" type="number" placeholder="e.g., 1500" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor-hours">Labor Hours</Label>
            <Input id="labor-hours" type="number" placeholder="e.g., 20" />
          </div>
        </div>
        <Button>Suggest Fair Price</Button>
        <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="font-headline text-lg">Suggested Price</p>
            <p className="text-3xl font-bold text-primary">₹3,500</p>
            <p className="text-xs text-muted-foreground mt-1">This price is a suggestion based on market trends for similar items and your input costs. It ensures you make a fair profit.</p>
        </div>
      </CardContent>
    </Card>
  );
}
