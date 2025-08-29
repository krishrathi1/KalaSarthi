"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCulturalTrendSuggestions } from "@/lib/actions";
import { Skeleton } from "./ui/skeleton";

export function TrendMapper() {
  const [craftDescription, setCraftDescription] = useState(
    "Kalamkari is a type of hand-painted or block-printed cotton textile produced in Isfahan, Iran, and in the Indian states of Andhra Pradesh and Telangana. Only natural dyes are used in Kalamkari, which involves twenty-three steps."
  );
  const [currentTrends, setCurrentTrends] = useState(
    "Minimalist home decor, sustainable and eco-friendly products, geometric patterns, and bohemian-style wall hangings."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);

    const response = await getCulturalTrendSuggestions({ craftDescription, currentTrends });

    if (response.success && response.data) {
      setResult(response.data.suggestions);
    } else {
      toast({
        title: "Suggestion Failed",
        description: response.error,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Card id="trends" className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Palette className="size-6 text-primary" />
          Cultural Trend Mapper
        </CardTitle>
        <CardDescription>
          Get AI-powered ideas to adapt traditional crafts to modern tastes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="craft-description">Craft Description</Label>
          <Textarea
            id="craft-description"
            value={craftDescription}
            onChange={(e) => setCraftDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current-trends">Current Market Trends</Label>
          <Textarea
            id="current-trends"
            value={currentTrends}
            onChange={(e) => setCurrentTrends(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Analyzing..." : "Get Suggestions"}
        </Button>

        {loading && (
            <div className="space-y-2 pt-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-20 w-full" />
            </div>
        )}

        {result && (
          <div className="space-y-2 pt-4">
            <h3 className="font-headline text-lg">Suggestions</h3>
            <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
              {result}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
