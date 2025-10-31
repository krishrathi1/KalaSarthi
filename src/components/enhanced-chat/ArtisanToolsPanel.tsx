'use client';

/**
 * Artisan Tools Panel Component
 * Provides design generation tools and gallery management for artisans
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Wand2,
  Image,
  Send,
  Loader2,
  RefreshCw,
  Eye,
  Share2,
  Download,
  Edit3,
  Sparkles,
  Images,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  GeneratedDesign,
  ConversationContext,
  DesignGenerationRequest
} from '@/lib/services/DesignGenerator';

interface ArtisanToolsPanelProps {
  conversationContext: ConversationContext;
  artisanSpecialization: string;
  sessionId: string;
  artisanId: string;
  onDesignShared: (design: GeneratedDesign) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

interface DesignGalleryItem extends GeneratedDesign {
  isShared: boolean;
  sharedAt?: Date;
}

export default function ArtisanToolsPanel({
  conversationContext,
  artisanSpecialization,
  sessionId,
  artisanId,
  onDesignShared,
  isVisible,
  onToggleVisibility
}: ArtisanToolsPanelProps) {
  const [activeTab, setActiveTab] = useState('generator');
  const [customPrompt, setCustomPrompt] = useState('');
  const [autoPrompt, setAutoPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [designGallery, setDesignGallery] = useState<DesignGalleryItem[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<GeneratedDesign | null>(null);
  const [designSuggestions, setDesignSuggestions] = useState<string[]>([]);

  // Load design suggestions on mount
  useEffect(() => {
    loadDesignSuggestions();
  }, [artisanSpecialization]);

  // Auto-generate prompt when conversation context changes
  useEffect(() => {
    if (conversationContext.buyerRequirements.length > 0) {
      generateAutoPrompt();
    }
  }, [conversationContext]);

  const loadDesignSuggestions = async () => {
    try {
      const response = await fetch('/api/design/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialization: artisanSpecialization })
      });

      if (response.ok) {
        const data = await response.json();
        setDesignSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load design suggestions:', error);
    }
  };

  const generateAutoPrompt = async () => {
    if (isGeneratingPrompt) return;

    setIsGeneratingPrompt(true);
    try {
      const response = await fetch('/api/design/auto-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationContext,
          artisanSpecialization
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAutoPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Failed to generate auto prompt:', error);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const generateDesigns = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const request: DesignGenerationRequest = {
        prompt: prompt.trim(),
        artisanSpecialization,
        conversationContext,
        variations: 3
      };

      const response = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedDesigns(data.designs);
        setActiveTab('gallery');
      } else {
        throw new Error('Failed to generate designs');
      }
    } catch (error) {
      console.error('Design generation error:', error);
      // TODO: Show error toast
    } finally {
      setIsGenerating(false);
    }
  };

  const shareDesign = async (design: GeneratedDesign) => {
    try {
      const response = await fetch('/api/design/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          sessionId,
          artisanId
        })
      });

      if (response.ok) {
        // Add to gallery as shared
        const galleryItem: DesignGalleryItem = {
          ...design,
          isShared: true,
          sharedAt: new Date()
        };

        setDesignGallery(prev => [galleryItem, ...prev]);
        onDesignShared(design);

        // TODO: Show success toast
      }
    } catch (error) {
      console.error('Failed to share design:', error);
      // TODO: Show error toast
    }
  };

  const downloadDesign = (design: GeneratedDesign) => {
    // Create download link
    const link = document.createElement('a');
    link.href = design.imageUrl;
    link.download = `design_${design.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const DesignCard = ({ design, isInGallery = false }: {
    design: GeneratedDesign;
    isInGallery?: boolean;
  }) => (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="relative mb-3">
          <img
            src={design.imageUrl}
            alt={design.description}
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedDesign(design)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadDesign(design)}
            >
              <Download className="w-4 h-4" />
            </Button>
            {!isInGallery && (
              <Button
                size="sm"
                variant="default"
                onClick={() => shareDesign(design)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-600 line-clamp-2">
            {design.description}
          </p>

          <div className="flex flex-wrap gap-1">
            {design.specifications.materials.slice(0, 3).map((material, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {material}
              </Badge>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{design.specifications.estimatedTime}</span>
            <span>{design.specifications.difficultyLevel}</span>
          </div>

          {isInGallery && (design as DesignGalleryItem).isShared && (
            <Badge variant="secondary" className="text-xs">
              Shared {new Date((design as DesignGalleryItem).sharedAt!).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isVisible) {
    return (
      <Button
        onClick={onToggleVisibility}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50"
        size="sm"
      >
        <Palette className="w-4 h-4 mr-2" />
        Tools
      </Button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold">Artisan Tools</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
            <TabsTrigger value="generator" className="text-xs">
              <Wand2 className="w-4 h-4 mr-1" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs">
              <Image className="w-4 h-4 mr-1" />
              Designs
            </TabsTrigger>
            <TabsTrigger value="shared" className="text-xs">
              <Images className="w-4 h-4 mr-1" />
              Shared
            </TabsTrigger>
          </TabsList>

          {/* Design Generator Tab */}
          <TabsContent value="generator" className="flex-1 p-4 pt-2 space-y-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Auto-generated Prompt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI-Generated Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isGeneratingPrompt ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing conversation...
                      </div>
                    ) : autoPrompt ? (
                      <div className="space-y-2">
                        <p className="text-sm bg-blue-50 p-3 rounded-lg">
                          {autoPrompt}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => generateDesigns(autoPrompt)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Wand2 className="w-4 h-4 mr-2" />
                            )}
                            Generate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCustomPrompt(autoPrompt)}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Continue the conversation to get AI-generated prompts
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateAutoPrompt}
                      disabled={isGeneratingPrompt}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Prompt
                    </Button>
                  </CardContent>
                </Card>

                {/* Custom Prompt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Custom Prompt</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Describe the design you want to create..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={4}
                      className="text-sm"
                    />
                    <Button
                      onClick={() => generateDesigns(customPrompt)}
                      disabled={!customPrompt.trim() || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Generate Designs
                    </Button>
                  </CardContent>
                </Card>

                {/* Design Suggestions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Quick Ideas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {designSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setCustomPrompt(suggestion)}
                          className="w-full text-left text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Context Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversation Context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {conversationContext.buyerRequirements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Requirements:</p>
                        <div className="flex flex-wrap gap-1">
                          {conversationContext.buyerRequirements.slice(0, 3).map((req, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {conversationContext.discussedMaterials.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Materials:</p>
                        <div className="flex flex-wrap gap-1">
                          {conversationContext.discussedMaterials.map((material, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {conversationContext.mentionedColors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Colors:</p>
                        <div className="flex flex-wrap gap-1">
                          {conversationContext.mentionedColors.map((color, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {color}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Generated Designs Tab */}
          <TabsContent value="gallery" className="flex-1 p-4 pt-2">
            <ScrollArea className="h-full">
              {generatedDesigns.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {generatedDesigns.map((design) => (
                    <DesignCard key={design.id} design={design} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Image className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No designs generated yet</p>
                  <p className="text-xs text-gray-400">
                    Use the generator tab to create designs
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Shared Designs Tab */}
          <TabsContent value="shared" className="flex-1 p-4 pt-2">
            <ScrollArea className="h-full">
              {designGallery.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {designGallery.map((design) => (
                    <DesignCard key={design.id} design={design} isInGallery />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Images className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No shared designs yet</p>
                  <p className="text-xs text-gray-400">
                    Share designs from the gallery to see them here
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Design Preview Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Design Preview</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDesign(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={selectedDesign.imageUrl}
                alt={selectedDesign.description}
                className="w-full rounded-lg"
              />

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedDesign.description}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Specifications</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Dimensions:</span>
                      <p className="text-gray-600">{selectedDesign.specifications.dimensions}</p>
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>
                      <p className="text-gray-600">{selectedDesign.specifications.estimatedTime}</p>
                    </div>
                    <div>
                      <span className="font-medium">Difficulty:</span>
                      <p className="text-gray-600 capitalize">{selectedDesign.specifications.difficultyLevel}</p>
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span>
                      <p className="text-gray-600">
                        ₹{selectedDesign.metadata.estimatedCost.min} - ₹{selectedDesign.metadata.estimatedCost.max}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Materials</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDesign.specifications.materials.map((material, index) => (
                      <Badge key={index} variant="outline">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Techniques</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDesign.specifications.techniques.map((technique, index) => (
                      <Badge key={index} variant="secondary">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={() => shareDesign(selectedDesign)}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share in Chat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadDesign(selectedDesign)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}