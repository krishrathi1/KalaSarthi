"use client";

import React, { useRef, useState } from 'react';

export default function SimpleAITestPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            console.log('File selected:', file.name, file.type, file.size);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setResult('');

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            console.log('Sending request to API...');
            const response = await fetch('/api/ai-image/analyze', {
                method: 'POST',
                body: formData,
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                setResult(`Analysis successful! Product type: ${data.analysis.productType}`);
            } else {
                setResult(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error analyzing image:', error);
            setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Simple AI Image Test</h1>

            <div className="space-y-4">
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                        Upload Product Image
                    </label>
                    <input
                        ref={fileInputRef}
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {selectedFile && (
                    <div className="p-4 border rounded-lg bg-green-50">
                        <h3 className="font-semibold text-green-800">File Selected:</h3>
                        <p><strong>Name:</strong> {selectedFile.name}</p>
                        <p><strong>Type:</strong> {selectedFile.type}</p>
                        <p><strong>Size:</strong> {selectedFile.size} bytes</p>
                        <button
                            onClick={handleAnalyzeImage}
                            disabled={isAnalyzing}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                        </button>
                    </div>
                )}

                {result && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                        <h3 className="font-semibold text-blue-800">Result:</h3>
                        <p>{result}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
