"use client";

import React, { useState } from 'react';
import { ChevronDown, User, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfessionCategory, PROFESSION_CATEGORIES } from '@/lib/types/simplified-trend-spotter';

interface ProfessionSelectorProps {
  selectedProfession: ProfessionCategory;
  onProfessionChange: (profession: ProfessionCategory) => void;
  className?: string;
  isSimpleMode?: boolean; // For artisan-friendly interface
}

// Realistic profession data with proper descriptions and examples
const PROFESSION_DATA: Record<ProfessionCategory, {
  label: string;
  description: string;
  examples: string[];
  icon: string;
  popularProducts: string[];
}> = {
  pottery: {
    label: 'Pottery & Ceramics',
    description: 'Clay work, ceramic items, earthenware',
    examples: ['Bowls', 'Vases', 'Plates', 'Planters'],
    icon: '🏺',
    popularProducts: ['Ceramic bowls ₹300-800', 'Clay vases ₹500-1200', 'Dinner sets ₹1500-3000']
  },
  woodworking: {
    label: 'Woodworking & Carpentry',
    description: 'Wooden furniture, carvings, handicrafts',
    examples: ['Furniture', 'Frames', 'Boxes', 'Utensils'],
    icon: '🪵',
    popularProducts: ['Wooden frames ₹200-600', 'Spice boxes ₹400-900', 'Cutting boards ₹300-700']
  },
  jewelry: {
    label: 'Jewelry Making',
    description: 'Traditional and modern jewelry',
    examples: ['Necklaces', 'Earrings', 'Bracelets', 'Rings'],
    icon: '💍',
    popularProducts: ['Silver earrings ₹500-2000', 'Beaded necklaces ₹300-1500', 'Bangles ₹200-800']
  },
  textiles: {
    label: 'Textiles & Fabrics',
    description: 'Handloom, weaving, fabric work',
    examples: ['Sarees', 'Scarves', 'Bags', 'Cushions'],
    icon: '🧵',
    popularProducts: ['Cotton sarees ₹800-2500', 'Handloom bags ₹300-800', 'Cushion covers ₹200-500']
  },
  metalwork: {
    label: 'Metalwork & Crafts',
    description: 'Brass, copper, iron handicrafts',
    examples: ['Lamps', 'Bowls', 'Decoratives', 'Utensils'],
    icon: '⚒️',
    popularProducts: ['Brass lamps ₹600-1800', 'Copper bowls ₹400-1000', 'Metal wall art ₹500-1500']
  },
  painting: {
    label: 'Painting & Art',
    description: 'Traditional and contemporary art',
    examples: ['Canvas Art', 'Madhubani', 'Warli', 'Miniatures'],
    icon: '🎨',
    popularProducts: ['Canvas paintings ₹800-3000', 'Art prints ₹200-800', 'Custom portraits ₹1000-5000']
  },
  weaving: {
    label: 'Weaving & Handloom',
    description: 'Traditional weaving, handloom products',
    examples: ['Fabrics', 'Rugs', 'Mats', 'Runners'],
    icon: '🕸️',
    popularProducts: ['Handloom fabrics ₹300-1200', 'Jute rugs ₹500-1500', 'Table runners ₹200-600']
  },
  leatherwork: {
    label: 'Leather Crafts',
    description: 'Leather bags, accessories, footwear',
    examples: ['Bags', 'Wallets', 'Belts', 'Shoes'],
    icon: '👜',
    popularProducts: ['Leather bags ₹800-2500', 'Wallets ₹300-800', 'Belts ₹400-1000']
  },
  sculpture: {
    label: 'Sculpture & Carving',
    description: 'Stone, wood, metal sculptures',
    examples: ['Statues', 'Figurines', 'Carvings', 'Decoratives'],
    icon: '🗿',
    popularProducts: ['Stone figurines ₹500-2000', 'Wood carvings ₹300-1500', 'Metal sculptures ₹800-3000']
  },
  embroidery: {
    label: 'Embroidery & Stitching',
    description: 'Hand embroidery, decorative stitching',
    examples: ['Clothing', 'Bags', 'Wall Hangings', 'Accessories'],
    icon: '🪡',
    popularProducts: ['Embroidered bags ₹400-1200', 'Wall hangings ₹300-900', 'Clothing ₹600-2000']
  },
  glasswork: {
    label: 'Glass & Crystal Work',
    description: 'Glass items, crystal crafts',
    examples: ['Vases', 'Decoratives', 'Lamps', 'Ornaments'],
    icon: '🔮',
    popularProducts: ['Glass vases ₹400-1200', 'Crystal items ₹600-2000', 'Glass lamps ₹800-2500']
  },
  ceramics: {
    label: 'Advanced Ceramics',
    description: 'Fine ceramics, porcelain work',
    examples: ['Fine China', 'Porcelain', 'Ceramic Art', 'Tiles'],
    icon: '🏺',
    popularProducts: ['Porcelain sets ₹1500-5000', 'Ceramic tiles ₹50-200/sq ft', 'Art pieces ₹800-3000']
  },
  handmade: {
    label: 'General Handmade Crafts',
    description: 'Mixed handicrafts and artisan work',
    examples: ['Various Crafts', 'Mixed Media', 'Decoratives', 'Gifts'],
    icon: '✋',
    popularProducts: ['Gift items ₹200-800', 'Decoratives ₹300-1200', 'Craft supplies ₹100-500']
  },
  crafts: {
    label: 'Traditional Crafts',
    description: 'Regional and traditional craft work',
    examples: ['Folk Art', 'Regional Crafts', 'Traditional Items', 'Cultural Art'],
    icon: '🎭',
    popularProducts: ['Folk art ₹400-1500', 'Traditional items ₹300-1000', 'Cultural crafts ₹500-2000']
  }
};

export function ProfessionSelector({ 
  selectedProfession, 
  onProfessionChange, 
  className = "",
  isSimpleMode = true 
}: ProfessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedData = PROFESSION_DATA[selectedProfession];

  // Filter professions based on search term
  const filteredProfessions = Object.entries(PROFESSION_DATA).filter(([key, data]) =>
    data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.examples.some(example => example.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProfessionSelect = (profession: ProfessionCategory) => {
    onProfessionChange(profession);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (isSimpleMode) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Current Selection Display */}
        <Card 
          className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10"
          role="region"
          aria-labelledby="current-profession"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="text-3xl" aria-hidden="true">{selectedData.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 
                  id="current-profession"
                  className="font-semibold text-lg sm:text-xl text-gray-900"
                >
                  {selectedData.label}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {selectedData.description}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 min-h-[44px] px-4 text-base font-medium"
                aria-expanded={isOpen}
                aria-controls="profession-selector-panel"
                aria-label={`Change profession from ${selectedData.label}`}
              >
                <User className="size-5" aria-hidden="true" />
                Change
                <ChevronDown 
                  className={`size-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                  aria-hidden="true"
                />
              </Button>
            </div>
            
            {/* Popular Products Preview */}
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-3">Popular products in your category:</p>
              <div className="flex flex-wrap gap-2">
                {selectedData.popularProducts.map((product, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-sm px-3 py-1"
                    aria-label={`Popular product: ${product}`}
                  >
                    {product}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profession Selection Modal */}
        {isOpen && (
          <Card 
            className="border-2 border-primary/30 shadow-lg"
            id="profession-selector-panel"
            role="dialog"
            aria-labelledby="profession-selector-title"
            aria-modal="false"
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Palette className="size-6 text-primary" aria-hidden="true" />
                <h3 
                  id="profession-selector-title"
                  className="font-semibold text-lg sm:text-xl"
                >
                  Choose Your Craft
                </h3>
              </div>

              {/* Search Box */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search for your craft (e.g., pottery, jewelry...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none text-base"
                />
              </div>

              {/* Profession Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredProfessions.map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => handleProfessionSelect(key as ProfessionCategory)}
                    className={`
                      p-4 text-left border-2 rounded-lg transition-all duration-200
                      hover:border-primary/50 hover:bg-primary/5
                      ${selectedProfession === key 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">{data.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {data.label}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {data.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {data.examples.slice(0, 3).map((example, index) => (
                            <span 
                              key={index}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* No Results */}
              {filteredProfessions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No crafts found matching "{searchTerm}"</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                  >
                    Show All Crafts
                  </Button>
                </div>
              )}

              {/* Close Button */}
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Compact mode for advanced users
  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedData.icon}</span>
          <span>{selectedData.label}</span>
        </div>
        <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(PROFESSION_DATA).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => handleProfessionSelect(key as ProfessionCategory)}
                  className={`
                    w-full p-2 text-left rounded hover:bg-gray-100 transition-colors
                    ${selectedProfession === key ? 'bg-primary/10' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{data.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{data.label}</div>
                      <div className="text-xs text-gray-600">{data.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Quick profession selector for mobile
export function QuickProfessionSelector({ 
  selectedProfession, 
  onProfessionChange,
  className = ""
}: Omit<ProfessionSelectorProps, 'isSimpleMode'>) {
  const commonProfessions: ProfessionCategory[] = [
    'pottery', 'woodworking', 'jewelry', 'textiles', 'painting', 'handmade'
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="font-medium text-sm text-gray-700">Quick Select:</h4>
      <div className="flex flex-wrap gap-2">
        {commonProfessions.map((profession) => {
          const data = PROFESSION_DATA[profession];
          return (
            <button
              key={profession}
              onClick={() => onProfessionChange(profession)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                ${selectedProfession === profession 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-gray-200 hover:border-primary/50'
                }
              `}
            >
              <span className="text-sm">{data.icon}</span>
              <span className="text-xs font-medium">{data.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Export profession data for use in other components
export { PROFESSION_DATA };