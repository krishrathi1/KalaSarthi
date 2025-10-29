'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RotateCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cameraCapture, CapturedImage } from '@/lib/pwa/camera-capture';

interface MobileDocumentCaptureProps {
  onCapture: (image: CapturedImage) => void;
  onCancel?: () => void;
  className?: string;
}

export function MobileDocumentCapture({
  onCapture,
  onCancel,
  className = ''
}: MobileDocumentCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        cameraCapture.stopCamera();
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await cameraCapture.startCamera({
        facingMode: 'environment',
        width: 1920,
        height: 1080
      });

      setStream(mediaStream);
      setMode('camera');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Failed to access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const capturePhoto = async () => {
    try {
      const image = await cameraCapture.capturePhoto({ quality: 0.92 });
      setCapturedImage(image);
      setMode('preview');
      cameraCapture.stopCamera();
      setStream(null);
    } catch (err) {
      setError('Failed to capture photo');
      console.error('Capture error:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const image = await cameraCapture.captureFromFile(file, {
        quality: 0.92,
        width: 1920,
        height: 1080
      });
      setCapturedImage(image);
      setMode('preview');
    } catch (err) {
      setError('Failed to process image');
      console.error('File processing error:', err);
    }
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setMode('select');
  };

  const switchCamera = async () => {
    try {
      const newStream = await cameraCapture.switchCamera();
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  if (mode === 'select') {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Capture Document</h3>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <Button
              onClick={startCamera}
              className="h-24 flex flex-col items-center justify-center gap-2"
              variant="outline"
            >
              <Camera className="w-8 h-8" />
              <span>Take Photo</span>
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 flex flex-col items-center justify-center gap-2"
              variant="outline"
            >
              <Upload className="w-8 h-8" />
              <span>Upload from Gallery</span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {onCancel && (
            <Button onClick={onCancel} variant="ghost" className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (mode === 'camera') {
    return (
      <div className={`fixed inset-0 z-50 bg-black ${className}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <Button
              onClick={() => {
                cameraCapture.stopCamera();
                setStream(null);
                setMode('select');
              }}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              onClick={capturePhoto}
              size="icon"
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-200"
            >
              <div className="w-14 h-14 rounded-full border-4 border-black" />
            </Button>

            <Button
              onClick={switchCamera}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <RotateCw className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'preview' && capturedImage) {
    return (
      <div className={`fixed inset-0 z-50 bg-black ${className}`}>
        <img
          src={capturedImage.dataUrl}
          alt="Captured document"
          className="w-full h-full object-contain"
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between max-w-md mx-auto gap-4">
            <Button
              onClick={retake}
              variant="outline"
              className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Retake
            </Button>

            <Button
              onClick={confirmCapture}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
