"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { matchBuyersWithArtisans } from "@/lib/actions";
import { Skeleton } from "./ui/skeleton";

const artisanProducts = [
  "Handwoven Kanchipuram silk saree by Ramu, featuring peacock motifs and golden zari border.",
  "Hand-painted Kalamkari wall hanging by Ramesh Rao, depicting scenes from the Ramayana using natural dyes.",
  "Blue pottery vase from Jaipur by Sunita Kumar, with intricate floral designs in cobalt blue.",
  "Dhokra brass statue of a tribal dancer by a collective in Bastar, using the lost-wax casting technique.",
];

export function Matchmaking() {
  const [buyerPreferences, setBuyerPreferences] = useState(
    "I'm an interior designer from Mumbai looking for unique, handcrafted wall decor with traditional Indian stories for a luxury hotel project."
  );
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[] | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    setMatches(null);

    const response = await matchBuyersWithArtisans({
      buyerProfile: {
        id: "buyer-1",
        name: "Interior Designer",
        location: "Mumbai",
        preferences: {
          categories: ["wall decor", "traditional crafts"],
          priceRange: { min: 1000, max: 50000 },
          styles: ["traditional", "handcrafted"],
          occasions: ["hotel decoration", "luxury interior"]
        },
        budget: "high",
        experience: "expert",
        interests: ["traditional", "handcrafted", "wall decor"]
      },
      artisanProfiles: artisanProducts.map((product, index) => ({
        id: `artisan-${index}`,
        name: `Artisan ${index + 1}`,
        profession: "Handicraft Artist",
        specialties: ["traditional crafts"],
        location: "Various",
        rating: 4.5,
        experience: 10,
        priceRange: { min: 1000, max: 50000 },
        availability: "available",
        portfolio: [product],
        certifications: ["Traditional Craft Certification"],
        languages: ["Hindi", "English"]
      }))
    });

    if (response.success && response.data) {
      setMatches(response.data.matches);
    } else {
      toast({
        title: "Matchmaking Failed",
        description: response.error,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Card id="matchmaking" className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Users className="size-6 text-primary" />
          Artisan Connect
        </CardTitle>
        <CardDescription>
          Connect with the right artisans based on your needs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="buyer-preferences">Buyer Preferences</Label>
          <Textarea
            id="buyer-preferences"
            value={buyerPreferences}
            onChange={(e) => setBuyerPreferences(e.target.value)}
            rows={4}
          />
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Searching..." : "Find Matches"}
        </Button>

        {loading && (
            <div className="space-y-2 pt-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-16 w-full" />
            </div>
        )}

        {matches && (
          <div className="space-y-2 pt-4">
            <h3 className="font-headline text-lg">Potential Matches</h3>
            {matches.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 p-4 bg-muted/50 rounded-lg text-sm">
                {matches.map((match, index) => (
                  <li key={index}>{match}</li>
                ))}
              </ul>
            ) : (
                <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">No direct matches found based on the preferences.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
