"use client";

import { Languages } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StoryDisplayProps {
  result: any;
}

export function StoryDisplay({ result }: StoryDisplayProps) {
  return (
    <div className="space-y-4 pt-4">
      <h3 className="text-lg font-headline flex items-center gap-2">
        <Languages className="text-primary" /> Generated Content
      </h3>
      <Tabs defaultValue="english" className="w-full">
        <TabsList>
          <TabsTrigger value="english">English</TabsTrigger>
          <TabsTrigger value="spanish">Español</TabsTrigger>
          <TabsTrigger value="french">Français</TabsTrigger>
        </TabsList>
        <TabsContent value="english" className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-bold">Story</h4>
          <p className="text-sm">{result?.englishStory || 'No story available'}</p>
          <h4 className="font-bold">Caption</h4>
          <p className="text-sm italic">{result?.englishCaption || 'No caption available'}</p>
        </TabsContent>
        <TabsContent value="spanish" className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-bold">Historia</h4>
          <p className="text-sm">{result?.spanishStory || 'No story available'}</p>
          <h4 className="font-bold">Subtítulo</h4>
          <p className="text-sm italic">{result?.spanishCaption || 'No caption available'}</p>
        </TabsContent>
        <TabsContent value="french" className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-bold">Histoire</h4>
          <p className="text-sm">{result?.frenchStory || 'No story available'}</p>
          <h4 className="font-bold">Légende</h4>
          <p className="text-sm italic">{result?.frenchCaption || 'No caption available'}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}