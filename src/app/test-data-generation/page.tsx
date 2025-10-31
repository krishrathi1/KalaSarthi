'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestDataGeneration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateData = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/generate-sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to generate data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate November 2024 Sales Data</CardTitle>
          <CardDescription>
            This will populate Firestore with realistic sales data for November 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateData} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating Data...' : 'Generate Sample Data'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">✅ Data Generated Successfully!</div>
                  <div>Total Events: {result.summary.totalEvents}</div>
                  <div>Total Revenue: ₹{result.summary.totalRevenue.toLocaleString('en-IN')}</div>
                  <div>Total Profit: ₹{result.summary.totalProfit.toLocaleString('en-IN')}</div>
                  <div>Total Units: {result.summary.totalUnits}</div>
                  <div>Average Order Value: ₹{Math.round(result.summary.averageOrderValue).toLocaleString('en-IN')}</div>
                  <div>Profit Margin: {result.summary.profitMargin.toFixed(1)}%</div>
                  
                  <div className="mt-4">
                    <div className="font-semibold">Category Breakdown:</div>
                    {result.summary.categoryBreakdown.map((cat: any) => (
                      <div key={cat.category}>
                        {cat.category}: {cat.events} sales, ₹{cat.revenue.toLocaleString('en-IN')} revenue
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}