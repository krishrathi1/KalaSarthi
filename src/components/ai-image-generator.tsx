"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Palette, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AI_IMAGE_CONFIG } from '@/lib/ai-image-config';
import { toast } from '@/hooks/use-toast';

interface ProductAnalysis {
    labels: string[];
    colors: string[];
    dominantColors: string[];
    confidence: number;
    productType: string;
    materials: string[];
    originalImageUrl?: string;
}

interface GeneratedImage {
    id: string;
    url: string;
    style: string;
    color: string;
    prompt: string;
    createdAt: Date;
}

export function AIImageGenerator() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setAnalysis(null);
            setGeneratedImages([]);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            const response = await fetch('/api/ai-image/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setAnalysis(data.analysis);
                toast({
                    title: "Analysis Complete",
                    description: "Product image analyzed successfully!",
                });
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Error analyzing image:', error);
            toast({
                title: "Analysis Failed",
                description: error instanceof Error ? error.message : 'Failed to analyze image',
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
            setProgress(0);
        }
    };

    const handleGenerateImages = async () => {
        if (!analysis || !selectedStyle || selectedColors.length === 0) return;

        setIsGenerating(true);
        setProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 500);

            const response = await fetch('/api/ai-image/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    originalImageUrl: analysis.originalImageUrl,
                    style: selectedStyle,
                    colors: selectedColors,
                }),
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();

            if (data.success) {
                setGeneratedImages(data.generatedImages);
                toast({
                    title: "Generation Complete",
                    description: `${data.count} images generated successfully in ${data.processingTimeMs}ms!`,
                });
            } else {
                // Handle specific error codes
                let errorMessage = data.error || 'Generation failed';

                if (data.code === 'QUOTA_EXCEEDED') {
                    errorMessage = 'API quota exceeded. Please try again later.';
                } else if (data.code === 'PERMISSION_DENIED') {
                    errorMessage = 'Insufficient permissions. Please check your configuration.';
                } else if (data.code === 'SAFETY_VIOLATION') {
                    errorMessage = 'Content blocked by safety filters. Please try different settings.';
                } else if (data.code === 'TIMEOUT') {
                    errorMessage = 'Request timed out. Please try again.';
                } else if (data.code === 'NETWORK_ERROR') {
                    errorMessage = 'Network error. Please check your connection.';
                }

                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error generating images:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
            setLastError(errorMessage);

            toast({
                title: "Generation Failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    const handleColorToggle = (color: string) => {
        setSelectedColors(prev =>
            prev.includes(color)
                ? prev.filter(c => c !== color)
                : [...prev, color]
        );
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setLastError(null);
        handleGenerateImages();
    };

    const handleDownload = (image: GeneratedImage) => {
        // Implement download functionality
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `generated-${image.style}-${image.color}.jpg`;
        link.click();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6" />
                        AI Image Generator
                    </CardTitle>
                    <CardDescription>
                        Upload your product image and generate variations in different colors and styles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
                            <TabsTrigger value="customize">Customize Style</TabsTrigger>
                            <TabsTrigger value="results">Generated Images</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <div className="space-y-2">
                                    <Label htmlFor="image-upload" className="text-lg font-medium">
                                        Upload Product Image
                                    </Label>
                                    <p className="text-sm text-gray-500">
                                        JPEG, PNG, or WebP up to 5MB
                                    </p>
                                    <Input
                                        ref={fileInputRef}
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                    >
                                        Choose File
                                    </Button>
                                </div>
                                {selectedFile && (
                                    <div className="mt-4">
                                        <p className="text-sm text-green-600">
                                            Selected: {selectedFile.name}
                                        </p>
                                        <Button
                                            onClick={handleAnalyzeImage}
                                            disabled={isAnalyzing}
                                            className="mt-2"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                'Analyze Image'
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {isAnalyzing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Analyzing image...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="w-full" />
                                </div>
                            )}

                            {analysis && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Analysis Results</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium">Product Type</Label>
                                            <Badge variant="secondary" className="ml-2">
                                                {analysis.productType}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Materials</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {analysis.materials.map((material, index) => (
                                                    <Badge key={index} variant="outline">
                                                        {material}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Detected Colors</Label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {analysis.dominantColors.map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-6 h-6 rounded-full border"
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Confidence</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Progress value={analysis.confidence * 100} className="flex-1" />
                                                <span className="text-sm text-gray-500">
                                                    {Math.round(analysis.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="customize" className="space-y-4">
                            {analysis ? (
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-sm font-medium">Select Style</Label>
                                        <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Choose a style" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AI_IMAGE_CONFIG.STYLE_OPTIONS.map((style) => (
                                                    <SelectItem key={style.id} value={style.id}>
                                                        <div>
                                                            <div className="font-medium">{style.name}</div>
                                                            <div className="text-sm text-gray-500">{style.description}</div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium">Select Colors</Label>
                                        <p className="text-sm text-gray-500 mt-1 mb-3">
                                            Choose up to {AI_IMAGE_CONFIG.MAX_GENERATIONS_PER_REQUEST} colors
                                        </p>
                                        <div className="grid grid-cols-4 gap-3">
                                            {AI_IMAGE_CONFIG.COLOR_VARIATIONS.map((color) => (
                                                <div
                                                    key={color.name}
                                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedColors.includes(color.name)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    onClick={() => handleColorToggle(color.name)}
                                                >
                                                    <div
                                                        className="w-full h-8 rounded mb-2"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    <p className="text-sm font-medium text-center">{color.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Button
                                            onClick={handleGenerateImages}
                                            disabled={!selectedStyle || selectedColors.length === 0 || isGenerating}
                                            className="w-full"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating Images...
                                                </>
                                            ) : (
                                                <>
                                                    <Palette className="h-4 w-4 mr-2" />
                                                    Generate Variations
                                                </>
                                            )}
                                        </Button>

                                        {lastError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                        <span className="text-sm text-red-700">{lastError}</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleRetry}
                                                        disabled={isGenerating}
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                    >
                                                        Retry
                                                    </Button>
                                                </div>
                                                {retryCount > 0 && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Retry attempt: {retryCount}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Please upload and analyze an image first
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="results" className="space-y-4">
                            {generatedImages.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {generatedImages.map((image) => (
                                        <Card key={image.id} className="overflow-hidden">
                                            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                                <img
                                                    src={image.url}
                                                    alt={`Generated ${image.style} ${image.color}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Badge variant="outline" className="mb-1">
                                                            {image.style}
                                                        </Badge>
                                                        <Badge variant="secondary" className="ml-1">
                                                            {image.color}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownload(image)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No generated images yet. Generate some variations to see them here.
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
