"use client";

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestUploadPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            console.log('File selected:', file.name, file.type, file.size);
        }
    };

    const handleClick = () => {
        console.log('Button clicked, fileInputRef:', fileInputRef.current);
        fileInputRef.current?.click();
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">File Upload Test</h1>

            <div className="space-y-4">
                <div>
                    <Label htmlFor="test-upload">Test File Upload</Label>
                    <Input
                        ref={fileInputRef}
                        id="test-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button onClick={handleClick} className="mt-2">
                        Choose File
                    </Button>
                </div>

                {selectedFile && (
                    <div className="p-4 border rounded-lg bg-green-50">
                        <h3 className="font-semibold text-green-800">File Selected:</h3>
                        <p><strong>Name:</strong> {selectedFile.name}</p>
                        <p><strong>Type:</strong> {selectedFile.type}</p>
                        <p><strong>Size:</strong> {selectedFile.size} bytes</p>
                    </div>
                )}

                {/* <div className="p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-semibold text-blue-800">Debug Info:</h3>
                    <p>File input ref: {fileInputRef.current ? 'Connected' : 'Not connected'}</p>
                    <p>Selected file: {selectedFile ? 'Yes' : 'No'}</p>
                </div> */}
            </div>
        </div>
    );
}
