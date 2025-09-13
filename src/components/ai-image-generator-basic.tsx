"use client";

import React, { useState, useRef } from 'react';

export function AIImageGeneratorBasic() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState('');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log('File selected:', file.name);
            setSelectedFile(file);
            setAnalysis(null);
            setGeneratedImages([]);
            setError(null);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            console.log('Starting image analysis...');

            const formData = new FormData();
            formData.append('image', selectedFile);

            const response = await fetch('/api/ai-image/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            console.log('Analysis response:', data);

            if (data.success) {
                setAnalysis(data.analysis);
                alert('Image analyzed successfully!');
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Error analyzing image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
            setError(errorMessage);
            alert('Analysis failed: ' + errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateImages = async () => {
        if (!selectedFile || !selectedStyle || selectedColors.length === 0) return;

        setIsGenerating(true);
        setError(null);

        try {
            console.log('Starting image generation...');

            // First try the API
            try {
                const response = await fetch('/api/ai-image/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        originalImageUrl: analysis?.originalImageUrl || 'data:image/jpeg;base64,test',
                        style: selectedStyle,
                        colors: selectedColors,
                    }),
                });

                const data = await response.json();
                console.log('API Generation response:', data);

                if (data.success) {
                    setGeneratedImages(data.generatedImages);
                    alert(`${data.count} images generated successfully!`);
                    return;
                }
            } catch (apiError) {
                console.log('API failed, using client-side generation:', apiError);
            }

            // Fallback to client-side color variations
            console.log('Creating client-side color variations...');
            const generatedImages = await generateClientSideVariations(selectedFile, selectedStyle, selectedColors);
            console.log('Generated variations:', generatedImages);
            setGeneratedImages(generatedImages);
            alert(`${generatedImages.length} color variations created!`);

        } catch (error) {
            console.error('Error generating images:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
            setError(errorMessage);
            alert('Generation failed: ' + errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateClientSideVariations = async (file: File, style: string, colors: string[]): Promise<any[]> => {
        const variations: any[] = [];

        console.log(`Creating variations for colors: ${colors.join(', ')} with style: ${style}`);

        for (const color of colors) {
            try {
                console.log(`Creating ${color} variation...`);
                const variationUrl = await createColorVariation(file, color, style);
                console.log(`Successfully created ${color} variation:`, variationUrl.substring(0, 100) + '...');

                const variation = {
                    id: `variation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    url: variationUrl,
                    style,
                    color,
                    prompt: `Color variation of your product in ${color} ${style} style`,
                    createdAt: new Date(),
                };
                variations.push(variation);
            } catch (error) {
                console.error(`Error creating ${color} variation:`, error);
                // Create a fallback variation
                const fallbackVariation = {
                    id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    url: `https://via.placeholder.com/512x512/cccccc/666666?text=${color}+${style}`,
                    style,
                    color,
                    prompt: `Fallback ${color} ${style} variation`,
                    createdAt: new Date(),
                };
                variations.push(fallbackVariation);
            }
        }

        console.log(`Created ${variations.length} variations total`);
        return variations;
    };

    const createColorVariation = (file: File, color: string, style: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Set canvas size to match image
                canvas.width = img.width;
                canvas.height = img.height;

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Apply color filter before drawing
                const filter = getColorFilter(color, style);
                ctx.filter = filter;

                // Draw the image with the filter applied
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Reset filter
                ctx.filter = 'none';

                // Convert to data URL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                console.log(`Created ${color} ${style} variation:`, dataUrl.substring(0, 50) + '...');
                resolve(dataUrl);
            };

            img.onerror = () => {
                console.error('Failed to load image for color variation');
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(file);
        });
    };

    const getColorFilter = (color: string, style: string): string => {
        const colorFilters: { [key: string]: string } = {
            'Red': 'hue-rotate(0deg) saturate(2.0) brightness(1.2)',
            'Blue': 'hue-rotate(240deg) saturate(2.0) brightness(1.0)',
            'Green': 'hue-rotate(120deg) saturate(2.0) brightness(1.1)',
            'Yellow': 'hue-rotate(60deg) saturate(2.0) brightness(1.3)',
            'Purple': 'hue-rotate(300deg) saturate(2.0) brightness(0.9)',
            'Orange': 'hue-rotate(30deg) saturate(2.0) brightness(1.2)',
            'Pink': 'hue-rotate(320deg) saturate(1.8) brightness(1.4)',
            'Brown': 'hue-rotate(25deg) saturate(1.5) brightness(0.8)'
        };

        const styleFilters: { [key: string]: string } = {
            'vibrant': 'saturate(1.8) contrast(1.3)',
            'pastel': 'saturate(0.6) brightness(1.3)',
            'monochrome': 'grayscale(1) contrast(1.2)',
            'vintage': 'sepia(0.9) contrast(1.2) brightness(0.8)',
            'modern': 'contrast(1.2) brightness(1.1)',
            'traditional': 'sepia(0.4) contrast(1.1)'
        };

        const colorFilter = colorFilters[color] || '';
        const styleFilter = styleFilters[style] || '';

        const combinedFilter = `${colorFilter} ${styleFilter}`.trim();
        console.log(`Applied filter for ${color} ${style}:`, combinedFilter);
        return combinedFilter;
    };

    const handleColorToggle = (color: string) => {
        setSelectedColors(prev =>
            prev.includes(color)
                ? prev.filter(c => c !== color)
                : [...prev, color]
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-4">AI Image Generator</h1>
                <p className="text-gray-600 mb-6">Upload your product image and generate variations in different colors and styles</p>

                {/* File Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium">Upload Product Image</h2>
                        <p className="text-sm text-gray-500">JPEG, PNG, or WebP up to 5MB</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => {
                                console.log('Choose file clicked');
                                fileInputRef.current?.click();
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Choose File
                        </button>
                    </div>

                    {selectedFile && (
                        <div className="mt-4">
                            <p className="text-sm text-green-600">Selected: {selectedFile.name}</p>
                            <button
                                onClick={handleAnalyzeImage}
                                disabled={isAnalyzing}
                                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Original Uploaded Image Display */}
                {selectedFile && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-medium mb-4">Original Image</h3>
                        <div className="flex justify-center">
                            <div className="w-64 h-64 border rounded-lg overflow-hidden bg-white">
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Uploaded product"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            This is your uploaded image that will be used to generate variants
                        </p>
                    </div>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-medium mb-2">Analysis Results</h3>
                        <p><strong>Product Type:</strong> {analysis.productType}</p>
                        <p><strong>Confidence:</strong> {Math.round(analysis.confidence * 100)}%</p>
                        <p><strong>Materials:</strong> {analysis.materials.join(', ')}</p>
                    </div>
                )}

                {/* Style and Color Selection */}
                {analysis && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Style</label>
                            <select
                                value={selectedStyle}
                                onChange={(e) => setSelectedStyle(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">Choose a style</option>
                                <option value="vibrant">Vibrant Colors</option>
                                <option value="pastel">Pastel Tones</option>
                                <option value="monochrome">Monochrome</option>
                                <option value="vintage">Vintage Style</option>
                                <option value="modern">Modern Minimalist</option>
                                <option value="traditional">Traditional</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Select Colors (up to 5)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown'].map((color) => (
                                    <label key={color} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedColors.includes(color)}
                                            onChange={() => handleColorToggle(color)}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{color}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateImages}
                            disabled={!selectedStyle || selectedColors.length === 0 || isGenerating}
                            className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating Images...' : 'Generate Variations'}
                        </button>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Generated Images */}
                {generatedImages.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Product Color Variations</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Color variations of your product in different styles - perfect for showcasing your products to customers
                        </p>

                        {/* Original vs Generated Comparison */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                            {/* Original Image */}
                            <div className="lg:col-span-1">
                                <div className="border-2 border-blue-500 rounded-lg overflow-hidden">
                                    <div className="bg-blue-50 p-2 text-center">
                                        <span className="text-sm font-medium text-blue-700">Original</span>
                                    </div>
                                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                        <img
                                            src={URL.createObjectURL(selectedFile!)}
                                            alt="Original product"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Generated Images */}
                            <div className="lg:col-span-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {generatedImages.map((image, index) => (
                                        <div key={index} className="border rounded-lg overflow-hidden">
                                            <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                                                {imageLoadingStates[image.id] && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                    </div>
                                                )}
                                                <img
                                                    src={image.url}
                                                    alt={`Generated ${image.style} ${image.color}`}
                                                    className="w-full h-full object-cover"
                                                    onLoadStart={() => {
                                                        setImageLoadingStates(prev => ({ ...prev, [image.id]: true }));
                                                    }}
                                                    onLoad={() => {
                                                        console.log('Image loaded successfully:', image.url);
                                                        setImageLoadingStates(prev => ({ ...prev, [image.id]: false }));
                                                    }}
                                                    onError={(e) => {
                                                        console.error('Image failed to load:', image.url);
                                                        e.currentTarget.src = `https://via.placeholder.com/512x512/cccccc/666666?text=${image.style}+${image.color}`;
                                                        setImageLoadingStates(prev => ({ ...prev, [image.id]: false }));
                                                    }}
                                                />
                                            </div>
                                            <div className="p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded mr-1">
                                                            {image.style}
                                                        </span>
                                                        <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                                                            {image.color}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = image.url;
                                                            link.download = `generated-${image.style}-${image.color}.jpg`;
                                                            link.click();
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 text-xs"
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
