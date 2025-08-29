
'use client';

import { useState } from 'react';
import { IndianRupee, BarChart, Upload, TrendingUp, Banknote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ArthSaarthi() {
  const [salesDataFile, setSalesDataFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSalesDataFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!salesDataFile) {
      toast({
        title: "No file selected",
        description: "Please upload your sales data file.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);

    // Placeholder for AI analysis logic
    setTimeout(() => {
      setResult({
        analysis: "Based on your sales data, we've observed a 25% increase in demand for handwoven sarees in the last quarter. Your consistent monthly revenue of over ₹50,000 shows strong business health.",
        prediction: "We predict a continued upward trend in sales, especially during the upcoming festive season, with a projected growth of 15-20%.",
        eligibleSchemes: [
          {
            name: "Pradhan Mantri MUDRA Yojana (PMMY)",
            details: "Eligible for a 'Kishor' loan of up to ₹5,00,000 for purchasing new looms and raw materials.",
            confidence: "High"
          },
           {
            name: "Stand-Up India Scheme",
            details: "Eligible for a loan between ₹10 lakh and ₹1 crore for setting up a new workshop or expanding your existing one.",
            confidence: "Medium"
          }
        ]
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <Card id="arth-saarthi" className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <IndianRupee className="size-6 text-primary" />
          Arth-Saarthi (Financial Charioteer)
        </CardTitle>
        <CardDescription>
          Analyze sales, predict trends, and find government loan schemes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sales-data">Upload Sales Data (.csv)</Label>
          <div className="flex gap-2">
            <Input id="sales-data" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !salesDataFile}>
          <BarChart className="mr-2" />
          {loading ? 'Analyzing Data...' : 'Analyze and Predict'}
        </Button>

        {loading && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {result && (
          <div className="space-y-6 pt-4">
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle className="font-headline">AI Analysis & Prediction</AlertTitle>
              <AlertDescription className="space-y-2">
                <p><strong>Analysis:</strong> {result.analysis}</p>
                <p><strong>Prediction:</strong> {result.prediction}</p>
              </AlertDescription>
            </Alert>
            
            <div>
              <h3 className="font-headline text-lg flex items-center gap-2">
                <Banknote className="text-primary"/>
                Eligible Micro-Loan Schemes
              </h3>
              <div className="mt-2 space-y-4">
                {result.eligibleSchemes.map((scheme: any, index: number) => (
                   <Card key={index} className="bg-muted/50">
                     <CardHeader>
                        <CardTitle className="text-base font-semibold">{scheme.name}</CardTitle>
                        <CardDescription>Confidence: <span className={scheme.confidence === 'High' ? 'text-green-600' : 'text-amber-600'}>{scheme.confidence}</span></CardDescription>
                     </CardHeader>
                     <CardContent>
                       <p className="text-sm">{scheme.details}</p>
                     </CardContent>
                   </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
          <p className="text-xs text-muted-foreground">This is an AI-powered prediction. Please consult with a financial advisor for final decisions.</p>
      </CardFooter>
    </Card>
  );
}
