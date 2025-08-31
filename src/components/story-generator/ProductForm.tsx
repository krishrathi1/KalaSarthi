"use client";

import { Package, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagManager } from "./TagManager";
import { DimensionsForm } from "./DimensionsForm";
// import type { GenerateProductStoryOutput } from "@/ai/flows/generate-product-story";

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  materials: string[];
  colors: string[];
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  quantity: number;
  tags: string[];
}

interface ProductFormProps {
  productForm: ProductFormData;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  result:String;
  uploadingProduct: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ProductForm({
  productForm,
  setProductForm,
  result,
  uploadingProduct,
  onSubmit,
  onCancel
}: ProductFormProps) {
  const addMaterial = (material: string) => {
    setProductForm(prev => ({
      ...prev,
      materials: [...prev.materials, material]
    }));
  };

  const removeMaterial = (materialToRemove: string) => {
    setProductForm(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material !== materialToRemove)
    }));
  };

  const addColor = (color: string) => {
    setProductForm(prev => ({
      ...prev,
      colors: [...prev.colors, color]
    }));
  };

  const removeColor = (colorToRemove: string) => {
    setProductForm(prev => ({
      ...prev,
      colors: prev.colors.filter(color => color !== colorToRemove)
    }));
  };

  const addTag = (tag: string) => {
    setProductForm(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
  };

  const removeTag = (tagToRemove: string) => {
    setProductForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Create Product Listing
        </CardTitle>
        <CardDescription>
          Complete the details below to create your product listing with the generated story.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>

            <div>
              <Label htmlFor="product-price">Price (₹) *</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter price"
              />
            </div>

            <div>
              <Label htmlFor="product-category">Category *</Label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="textiles">Textiles & Fabrics</SelectItem>
                  <SelectItem value="jewelry">Jewelry</SelectItem>
                  <SelectItem value="pottery">Pottery & Ceramics</SelectItem>
                  <SelectItem value="woodwork">Woodwork</SelectItem>
                  <SelectItem value="metalwork">Metalwork</SelectItem>
                  <SelectItem value="leather">Leather Goods</SelectItem>
                  <SelectItem value="paintings">Paintings & Art</SelectItem>
                  <SelectItem value="sculptures">Sculptures</SelectItem>
                  <SelectItem value="home-decor">Home Decor</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="product-quantity">Quantity Available</Label>
              <Input
                id="product-quantity"
                type="number"
                min="1"
                value={productForm.quantity}
                onChange={(e) => setProductForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                placeholder="Enter quantity"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="product-desc">Product Description *</Label>
              <Textarea
                id="product-desc"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed product description"
                rows={4}
              />
            </div>

            <TagManager
              label="Materials"
              items={productForm.materials}
              onAdd={addMaterial}
              onRemove={removeMaterial}
              placeholder="Add material"
            />

            <TagManager
              label="Colors"
              items={productForm.colors}
              onAdd={addColor}
              onRemove={removeColor}
              placeholder="Add color"
            />
          </div>
        </div>

        <DimensionsForm
          dimensions={productForm.dimensions}
          onChange={(dimensions) => setProductForm(prev => ({ ...prev, dimensions }))}
        />

        <TagManager
          label="Tags"
          items={productForm.tags}
          onAdd={addTag}
          onRemove={removeTag}
          placeholder="Add tag"
        />

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onSubmit}
            disabled={uploadingProduct}
            className="flex items-center gap-2"
          >
            {uploadingProduct ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Creating Product...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Create Product
              </>
            )}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={uploadingProduct}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}