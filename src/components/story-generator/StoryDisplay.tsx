// "use client";

// import { Languages } from "lucide-react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// // import type { GenerateProductStoryOutput } from "@/ai/flows/generate-product-story";

// interface StoryDisplayProps {
//   result: GenerateProductStoryOutput;
// }

// export function StoryDisplay({ result }: StoryDisplayProps) {
//   return (
//     <div className="space-y-4 pt-4">
//       <h3 className="text-lg font-headline flex items-center gap-2">
//         <Languages className="text-primary" /> Generated Content
//       </h3>
//       <Tabs defaultValue="english" className="w-full">
//         <TabsList>
//           <TabsTrigger value="english">English</TabsTrigger>
//           <TabsTrigger value="spanish">Español</TabsTrigger>
//           <TabsTrigger value="french">Français</TabsTrigger>
//         </TabsList>
//         <TabsContent value="english" className="space-y-4 p-4 bg-muted/50 rounded-lg">
//           <h4 className="font-bold">Story</h4>
//           <p className="text-sm">{result.englishStory}</p>
//           <h4 className="font-bold">Caption</h4>
//           <p className="text-sm italic">{result.englishCaption}</p>
//         </TabsContent>
//         <TabsContent value="spanish" className="space-y-4 p-4 bg-muted/50 rounded-lg">
//           <h4 className="font-bold">Historia</h4>
//           <p className="text-sm">{result.spanishStory}</p>
//           <h4 className="font-bold">Subtítulo</h4>
//           <p className="text-sm italic">{result.spanishCaption}</p>
//         </TabsContent>
//         <TabsContent value="french" className="space-y-4 p-4 bg-muted/50 rounded-lg">
//           <h4 className="font-bold">Histoire</h4>
//           <p className="text-sm">{result.frenchStory}</p>
//           <h4 className="font-bold">Légende</h4>
//           <p className="text-sm italic">{result.frenchCaption}</p>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }