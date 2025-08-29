"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Upload, Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateProductStory } from "@/lib/actions";
import type { GenerateProductStoryOutput } from "@/ai/flows/generate-product-story";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StoryGenerator() {
  const [productDescription, setProductDescription] = useState("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateProductStoryOutput | null>(null);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(URL.createObjectURL(file));
        setImageDataUri(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!imageDataUri || !productDescription) {
      toast({
        title: "Missing Information",
        description: "Please upload a photo and provide a product description.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const response = await generateProductStory({
      photoDataUri: imageDataUri,
      productDescription,
    });

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      toast({
        title: "Generation Failed",
        description: response.error,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Card id="story" className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          Heritage Storytelling
        </CardTitle>
        <CardDescription>
          Upload a photo and description to generate compelling product stories
          in multiple languages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="product-image">Product Photo</Label>
            <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  layout="fill"
                  objectFit="contain"
                />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <Upload className="mx-auto size-8" />
                  <p>Upload an image</p>
                </div>
              )}
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImageChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">Product Description</Label>
            <Textarea
              id="product-description"
              placeholder="e.g., Handwoven Kanchipuram silk saree..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="h-[150px] md:h-full"
              rows={6}
            />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !imageDataUri}>
          {loading ? "Generating..." : "Generate Story"}
          <Sparkles className="ml-2" />
        </Button>
        
        {loading && (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        )}

        {result && (
          <div className="space-y-4 pt-4">
             <h3 className="text-lg font-headline flex items-center gap-2">
                <Languages className="text-primary"/> Generated Content
            </h3>
            <Tabs defaultValue="english" className="w-full">
              <TabsList>
                <TabsTrigger value="english">English</TabsTrigger>
                <TabsTrigger value="spanish">Español</TabsTrigger>
                <TabsTrigger value="french">Français</TabsTrigger>
              </TabsList>
              <TabsContent value="english" className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-bold">Story</h4>
                <p className="text-sm">{result.englishStory}</p>
                <h4 className="font-bold">Caption</h4>
                <p className="text-sm italic">{result.englishCaption}</p>
              </TabsContent>
              <TabsContent value="spanish" className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-bold">Historia</h4>
                <p className="text-sm">{result.spanishStory}</p>
                <h4 className="font-bold">Subtítulo</h4>
                <p className="text-sm italic">{result.spanishCaption}</p>
              </TabsContent>
              <TabsContent value="french" className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-bold">Histoire</h4>
                <p className="text-sm">{result.frenchStory}</p>
                <h4 className="font-bold">Légende</h4>
                <p className="text-sm italic">{result.frenchCaption}</p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
