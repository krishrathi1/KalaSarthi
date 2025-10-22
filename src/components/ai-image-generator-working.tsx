"use client";

import React, { useState } from 'react';

function AIImageGeneratorWorking() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState('vibrant');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [variationPrompt, setVariationPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
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
        if (!selectedFile || !variationPrompt.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            console.log('Starting AI image generation...');

            // Create AI-generated variations
            const variations = await generateAIVariations(selectedFile, variationPrompt, selectedStyle, selectedColors);
            console.log('Generated variations:', variations);
            setGeneratedImages(variations);
            alert(`${variations.length} AI-generated variations created!`);

        } catch (error) {
            console.error('Error generating images:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
            setError(errorMessage);
            alert('Generation failed: ' + errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateAIVariations = async (file: File, prompt: string, style: string, colors: string[]): Promise<any[]> => {
        const variations: any[] = [];

        // Ensure we have valid values
        const validStyle = style || 'vibrant';
        const validColors = colors.length > 0 ? colors : ['Red']; // Default to Red if no colors selected

        console.log('Generating variations with:', { style: validStyle, colors: validColors, prompt });

        // Generate variations based on the prompt and selected colors
        for (const color of validColors) {
            try {
                const variation = await generateAIVariation(file, prompt, validStyle, color);
                variations.push(variation);
            } catch (error) {
                console.error(`Error creating ${color} variation:`, error);
            }
        }

        return variations;
    };

    const generateAIVariation = async (file: File, prompt: string, style: string, color: string): Promise<any> => {
        // Ensure we have valid values
        const validStyle = style || 'vibrant';
        const validColor = color || 'Red';

        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', prompt);
        formData.append('style', validStyle);
        formData.append('color', validColor);

        console.log('Sending request with:', { style: validStyle, color: validColor, prompt });

        const response = await fetch('/api/ai-image/generate', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log('API Response:', data);

        if (!data.success) {
            console.error('API Error:', data);
            throw new Error(data.error || 'Failed to generate variation');
        }

        // Show demo mode message if applicable
        if (data.demoMode) {
            console.log('Demo mode active:', data.message);
        }

        // CRITICAL FIX: Use the filter from generatedImages in the API response
        const apiGeneratedImage = data.generatedImages?.[0];
        const filter = apiGeneratedImage?.filter || 'none';

        console.log('🎨 Filter from API:', filter);

        return {
            id: apiGeneratedImage?.id || `variation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: data.imageUrl,
            style: validStyle,
            color: validColor,
            prompt: apiGeneratedImage?.prompt || `${prompt} in ${validColor} ${validStyle} style`,
            createdAt: new Date(),
            demoMode: data.demoMode || false,
            message: data.message,
            filter: filter, // THIS IS THE FIX - Get filter from API response
            model: apiGeneratedImage?.model || 'unknown'
        };
    };

    const handleColorToggle = (color: string) => {
        setSelectedColors(prev =>
            prev.includes(color)
                ? prev.filter(c => c !== color)
                : [...prev, color]
        );
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">AI Product Variation Generator</h1>
                <p className="text-gray-600 mb-6 text-center">Upload your product image and describe the variations you want to see</p>

                {/* File Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-medium">Upload Your Product Image</h2>
                        <p className="text-sm text-gray-500">JPEG, PNG, or WebP up to 5MB</p>

                        {/* File upload area */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg font-medium cursor-pointer border-2 border-blue-500 hover:border-blue-600 transition-colors inline-block"
                                >
                                    Choose File
                                </label>
                            </div>
                            <p className="text-xs text-gray-400">Click the blue button above to select an image</p>
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800">File Selected Successfully!</p>
                                    <p className="text-xs text-green-600">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Original Image Display */}
                {selectedFile && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h3 className="text-xl font-medium mb-4 text-center">Your Product</h3>
                        <div className="flex justify-center">
                            <div className="w-80 h-80 border-2 border-blue-500 rounded-lg overflow-hidden bg-white shadow-md">
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Uploaded product"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-600 mt-2">
                            This is your product that will be used to generate color variations
                        </p>
                    </div>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                        <h3 className="text-lg font-medium mb-2">Analysis Results</h3>
                        <p><strong>Product Type:</strong> {analysis.productType}</p>
                        <p><strong>Confidence:</strong> {Math.round(analysis.confidence * 100)}%</p>
                        <p><strong>Materials:</strong> {analysis.materials.join(', ')}</p>
                    </div>
                )}

                {/* Variation Prompt and Settings */}
                {selectedFile && (
                    <div className="space-y-6 mb-6">
                        <div>
                            <label className="block text-lg font-medium mb-3">Describe the variations you want to see</label>
                            <textarea
                                value={variationPrompt}
                                onChange={(e) => setVariationPrompt(e.target.value)}
                                placeholder="e.g., 'Create variations with different colors like blue, red, and green', or 'Show this product in different materials like wood, metal, and ceramic'"
                                className="w-full p-4 border rounded-lg text-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                Be specific about what variations you want - colors, materials, patterns, sizes, etc.
                            </p>
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-3">Select Style</label>
                            <select
                                value={selectedStyle}
                                onChange={(e) => setSelectedStyle(e.target.value)}
                                className="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="vibrant">Vibrant Colors (Default)</option>
                                <option value="pastel">Pastel Tones</option>
                                <option value="monochrome">Monochrome</option>
                                <option value="vintage">Vintage Style</option>
                                <option value="modern">Modern Minimalist</option>
                                <option value="traditional">Traditional</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-3">Select Colors (Choose at least one)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown'].map((color) => (
                                    <label key={color} className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedColors.includes(color)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 hover:bg-gray-50'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedColors.includes(color)}
                                            onChange={() => handleColorToggle(color)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium">{color}</span>
                                    </label>
                                ))}
                            </div>
                            {selectedColors.length === 0 && (
                                <p className="text-sm text-amber-600 mt-2">⚠️ Please select at least one color</p>
                            )}
                        </div>

                        <button
                            onClick={handleGenerateImages}
                            disabled={!variationPrompt.trim() || selectedColors.length === 0 || isGenerating}
                            className="w-full px-6 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors shadow-md"
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating AI Variations...
                                </span>
                            ) : 'Generate AI Variations'}
                        </button>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-red-700 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Generated Images */}
                {generatedImages.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-center">AI-Generated Variations</h3>

                        {/* Demo Mode Notice */}
                        {generatedImages[0]?.demoMode && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="w-6 h-6 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800">Demo Mode Active</p>
                                        <p className="text-xs text-yellow-600 mt-1">
                                            AI services are not configured. Showing CSS-filtered variations.
                                            To enable real AI generation, configure GEMINI_API_KEY or HUGGINGFACE_API_KEY.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-center text-gray-600 mb-6">
                            Your product with the color variations you requested
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {generatedImages.map((image, index) => {
                                console.log(`🎨 Image ${index} - Color: ${image.color}, Filter:`, image.filter);

                                return (
                                    <div key={image.id || index} className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-white">
                                        <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={image.url}
                                                alt={`${image.color} ${image.style} variation`}
                                                className="w-full h-full object-cover"
                                                style={{
                                                    filter: image.filter || 'none',
                                                    transition: 'filter 0.3s ease'
                                                }}
                                                onLoad={() => {
                                                    console.log(`✅ Image ${index} loaded with filter:`, image.filter);
                                                }}
                                            />
                                        </div>
                                        <div className="p-4 bg-white">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                                                        {image.style}
                                                    </span>
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                                        {image.color}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-xs text-gray-500">
                                                    {image.model || 'AI Generated'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = image.url;
                                                        link.download = `product-${image.style}-${image.color}.jpg`;
                                                        link.click();
                                                    }}
                                                    className="text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors"
                                                >
                                                    ⬇ Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export { AIImageGeneratorWorking };
export default AIImageGeneratorWorking;