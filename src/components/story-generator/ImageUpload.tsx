"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUpload({ imagePreview, onImageChange }: ImageUploadProps) {
  return (
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
          onChange={onImageChange}
        />
      </div>
    </div>
  );
}