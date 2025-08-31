"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Dimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
}

interface DimensionsFormProps {
  dimensions: Dimensions;
  onChange: (dimensions: Dimensions) => void;
}

export function DimensionsForm({ dimensions, onChange }: DimensionsFormProps) {
  const handleChange = (field: keyof Dimensions, value: string) => {
    onChange({
      ...dimensions,
      [field]: parseFloat(value) || 0
    });
  };

  return (
    <div>
      <Label>Dimensions (Optional)</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        <div>
          <Label htmlFor="length" className="text-sm">Length (cm)</Label>
          <Input
            id="length"
            type="number"
            min="0"
            step="0.1"
            value={dimensions.length}
            onChange={(e) => handleChange('length', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="width" className="text-sm">Width (cm)</Label>
          <Input
            id="width"
            type="number"
            min="0"
            step="0.1"
            value={dimensions.width}
            onChange={(e) => handleChange('width', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="height" className="text-sm">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            min="0"
            step="0.1"
            value={dimensions.height}
            onChange={(e) => handleChange('height', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="weight" className="text-sm">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            min="0"
            step="0.01"
            value={dimensions.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}