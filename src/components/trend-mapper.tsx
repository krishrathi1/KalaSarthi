"use client";

import { useState, useEffect } from "react";
import { Palette, TrendingUp, Star, ShoppingCart, ExternalLink, Heart, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { analyzeTrends } from "@/lib/actions";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatPrice } from "@/lib/format-utils";
import { ProductStatsModal } from "./product-stats-modal";

interface ScrapedProduct {
  title: string;
  price: string;
  rating: string;
  reviews: number;
  platform: string;
  url: string;
  imageUrl?: string;
  category?: string;
  averagePrice?: number;
  totalReviews?: number;
  priceRange?: {
    min: number;
    max: number;
    average: number;
  };
}

interface TrendData {
  keyword: string;
  searchVolume: number;
  products: ScrapedProduct[];
  trending: boolean;
  demandScore: number;
}

export function TrendMapper() {
  const { userProfile, isArtisan } = useAuth();
  const [artisanProfession, setArtisanProfession] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'profession' | 'categories' | 'analysis'>('profession');
  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [analysis, setAnalysis] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ScrapedProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Debug: Log when trend data changes
  useEffect(() => {
    console.log('🔄 Trend data changed:', trendData);
    if (trendData.length > 0) {
      console.log('📊 First trend:', trendData[0]);
      if (trendData[0].products) {
        console.log('🛍️ First trend products:', trendData[0].products);
      }
    }
  }, [trendData]);

  // Function to parse and enhance analysis text
  const renderEnhancedAnalysis = (text: string) => {
    const lines = text.split('\n');
    const sections: JSX.Element[] = [];
    let currentSection: string[] = [];
    let sectionType = 'general';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.toLowerCase().includes('what makes your work special')) {
        // Save previous section if any
        if (currentSection.length > 0) {
          sections.push(
            <div key={`section-${sections.length}`} className="mb-4">
              {currentSection.map((para, idx) => (
                <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {para}
                </p>
              ))}
            </div>
          );
          currentSection = [];
        }

        // Start special section
        sectionType = 'special';
        const specialPoints: string[] = [];

        // Collect bullet points
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('•')) {
            specialPoints.push(nextLine.substring(1).trim());
          } else if (nextLine === '' || nextLine.toLowerCase().includes('market opportunity')) {
            break;
          }
        }

        sections.push(
          <div key="special-section" className="mb-6 p-6 bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-blue-50/50 rounded-xl border border-pink-100/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100">
                <Heart className="size-5 text-pink-600" />
              </div>
              <h4 className="font-semibold text-lg text-gray-800">
                What Makes Your Work Special
              </h4>
            </div>
            <div className="space-y-3">
              {specialPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

        // Skip the bullet points we already processed
        i += specialPoints.length;
        sectionType = 'general';
        continue;
      }

      if (line.toLowerCase().includes('market opportunity')) {
        // Save previous section if any
        if (currentSection.length > 0) {
          sections.push(
            <div key={`section-${sections.length}`} className="mb-4">
              {currentSection.map((para, idx) => (
                <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {para}
                </p>
              ))}
            </div>
          );
        }

        // Start market opportunity section
        const opportunityText = line.replace(/^Market Opportunity:/i, '').trim();
        sections.push(
          <div key="opportunity-section" className="mb-6 p-6 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 rounded-xl border border-green-100/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100">
                <TrendingUp className="size-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-lg text-gray-800">
                Market Opportunity
              </h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {opportunityText}
            </p>
          </div>
        );

        currentSection = [];
        continue;
      }

      // Add line to current section
      if (line !== '') {
        currentSection.push(line);
      } else if (currentSection.length > 0) {
        // Empty line - save current section
        sections.push(
          <div key={`section-${sections.length}`} className="mb-4">
            {currentSection.map((para, idx) => (
              <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-2">
                {para}
              </p>
            ))}
          </div>
        );
        currentSection = [];
      }
    }

    // Add remaining section if any
    if (currentSection.length > 0) {
      sections.push(
        <div key={`section-${sections.length}`} className="mb-4">
          {currentSection.map((para, idx) => (
            <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-2">
              {para}
            </p>
          ))}
        </div>
      );
    }

    return sections;
  };

  useEffect(() => {
    if (userProfile?.artisticProfession) {
      setArtisanProfession(userProfile.artisticProfession);
    }
  }, [userProfile]);

  // Get product categories based on artistic profession
  const getProductCategories = (profession: string) => {
    const professionLower = profession.toLowerCase();

    const categoryMap: { [key: string]: string[] } = {
      weaver: ['Sarees', 'Dupattas', 'Wall Hangings', 'Table Runners', 'Cushion Covers', 'Scarves', 'Bedspreads'],
      silk: ['Silk Sarees', 'Silk Dupattas', 'Silk Scarves', 'Silk Wall Art', 'Silk Cushion Covers', 'Silk Stoles'],
      potter: ['Ceramic Bowls', 'Pottery Sets', 'Vases', 'Ceramic Plates', 'Teapots', 'Ceramic Figurines'],
      ceramic: ['Ceramic Planters', 'Ceramic Bowls', 'Ceramic Tiles', 'Decorative Ceramics', 'Ceramic Vases'],
      jeweler: ['Silver Earrings', 'Traditional Necklaces', 'Bracelets', 'Gold-plated Rings', 'Maang Tikkas', 'Jewelry Sets'],
      metalwork: ['Brass Door Handles', 'Metal Lanterns', 'Metal Wall Art', 'Metal Bowls', 'Decorative Metal Sculptures'],
      woodworking: ['Wooden Chairs', 'Wooden Spice Boxes', 'Wooden Wall Shelves', 'Wooden Cutting Boards', 'Wooden Jewelry Boxes', 'Wooden Photo Frames', 'Wooden Key Holders'],
      carpenter: ['Custom Wooden Furniture', 'Wooden Tables', 'Wooden Cabinets', 'Wooden Rocking Chairs', 'Wooden Bookshelves'],
      woodwork: ['Wooden Carvings', 'Wooden Inlay Boxes', 'Wooden Toys', 'Wooden Photo Frames', 'Decorative Wooden Panels'],
      painter: ['Acrylic Paintings', 'Madhubani Art', 'Canvas Art', 'Miniature Paintings', 'Warli Art', 'Traditional Paintings'],
      artist: ['Contemporary Art Prints', 'Handmade Art Journals', 'Traditional Block Print Fabric', 'Art Sketch Sets', 'Decorative Wall Art']
    };

    return categoryMap[professionLower] || ['Handmade Crafts', 'Traditional Art', 'Artisan Products'];
  };

  const handleProfessionSubmit = () => {
    if (!artisanProfession.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your artistic profession",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('categories');
  };

  const handleCategorySubmit = async () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No Categories Selected",
        description: "Please select at least one product category",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Starting trend analysis...');
    setLoading(true);
    setCurrentStep('analysis');
    setTrendData([]);
    setAnalysis("");
    setRecommendations([]);

    try {
      console.log('📡 Calling analyzeTrends API...');
      const response = await analyzeTrends(artisanProfession, 20, userProfile, selectedCategories);

      console.log('📦 Raw API Response:', response);
      console.log('✅ Response success:', response.success);
      console.log('📊 Response trends length:', response.trends?.length);
      console.log('📊 First trend sample:', response.trends?.[0]);

      if (response.trends && response.trends[0] && response.trends[0].products) {
        console.log('🛍️ First product sample:', response.trends[0].products[0]);
        console.log('💰 First product price:', response.trends[0].products[0].price);
        console.log('🖼️ First product image:', response.trends[0].products[0].imageUrl);
        console.log('🔗 First product URL:', response.trends[0].products[0].url);
      }

      if (response.success) {
        console.log('✅ Setting trend data...');
        const trendsToSet = response.trends || [];
        console.log('📈 Trends to set:', trendsToSet);

        setTrendData(trendsToSet);
        setAnalysis(response.analysis || "");
        setRecommendations(response.recommendations || []);

        console.log('✅ Data set successfully!');
      } else {
        console.error('❌ API returned error:', response.error);
        toast({
          title: "Analysis Failed",
          description: response.error || "Failed to analyze trends",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Trend analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred while analyzing trends",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleBackToProfession = () => {
    setCurrentStep('profession');
    setSelectedCategories([]);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleProductClick = (product: ScrapedProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  if (!isArtisan) {
    return (
      <Card id="trends" className="h-full">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Palette className="size-6 text-primary" />
            Trend Spotter
          </CardTitle>
          <CardDescription>
            This feature is available for artisans to discover trending products in their craft category.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id="trends" className="h-full shadow-lg border-0 bg-gradient-to-br from-card via-card to-card/95">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="size-6 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-xl">
              Trend Spotter ✅
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered market insights for artisans (Updated: {new Date().toLocaleTimeString()})
            </p>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          Discover trending products across 7+ platforms including Amazon, Flipkart, Meesho, IndiaMart, eBay, Etsy, and Nykaa using AI-powered web scraping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="artisan-profession" className="text-sm font-medium text-foreground">
            Your Artistic Profession
          </Label>
          <Textarea
            id="artisan-profession"
            value={artisanProfession}
            onChange={(e) => setArtisanProfession(e.target.value)}
            placeholder="e.g., Weaver, Potter, Carpenter, Jeweler, Painter..."
            rows={3}
            className="resize-none border-2 focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            Enter your craft specialty to get personalized market insights
          </p>
        </div>
        <Button
          onClick={handleProfessionSubmit}
          disabled={loading || !artisanProfession.trim()}
          className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4" />
            Next: Select Categories
          </div>
        </Button>

        {currentStep === 'categories' && (
          <div className="space-y-6 pt-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                <Palette className="size-4 text-primary" />
                <span className="text-sm font-medium text-primary">Step 2: Select Product Categories</span>
              </div>
              <h3 className="font-headline text-xl text-gray-800 mb-2">Choose Categories for {artisanProfession}</h3>
              <p className="text-sm text-muted-foreground">Select the types of products you'd like to analyze in the market</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getProductCategories(artisanProfession).map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${selectedCategories.includes(category)
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-muted hover:border-primary/50 hover:bg-primary/5'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedCategories.includes(category)
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                      }`}>
                      {selectedCategories.includes(category) && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{category}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBackToProfession}
                variant="outline"
                className="flex-1"
              >
                ← Back
              </Button>
              <Button
                onClick={handleCategorySubmit}
                disabled={selectedCategories.length === 0}
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  Analyze Trends
                </div>
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'analysis' && (
          <div className="space-y-6 pt-6">
            {loading ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                    <TrendingUp className="size-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Analyzing Market Trends...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">This may take a few moments</p>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2].map((j) => (
                          <Skeleton key={j} className="h-24 w-full rounded-xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
                    <TrendingUp className="size-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Analysis Complete!</span>
                  </div>
                  <h3 className="font-headline text-xl text-gray-800 mb-2">Market Insights for {artisanProfession}</h3>
                  <p className="text-sm text-muted-foreground">
                    Debug: Found {trendData.length} trends with {trendData.reduce((total, trend) => total + (trend.products?.length || 0), 0)} total products
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trendData.slice(0, 4).map((trend, trendIndex) => {
                    console.log(`📊 Rendering trend ${trendIndex}:`, trend);
                    return (
                      <div key={trendIndex} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-base text-primary">{trend.keyword}</h4>
                          <Badge variant={trend.trending ? "default" : "secondary"} className="text-xs font-medium">
                            {trend.trending ? "🔥 Current Trend" : "📈 Growing"}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {trend.products.slice(0, 4).map((product, productIndex) => {
                            console.log(`🛍️ Rendering product ${productIndex}:`, product);
                            return (
                              <div
                                key={productIndex}
                                className="group p-5 border rounded-xl bg-gradient-to-br from-card via-card/95 to-card/80 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-primary/20 cursor-pointer"
                                onClick={() => handleProductClick(product)}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-20 h-20 relative flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-sm">
                                    {(() => {
                                      console.log('Product image URL:', product.imageUrl);
                                      if (product.imageUrl && product.imageUrl.trim() !== '') {
                                        return (
                                          <Image
                                            src={product.imageUrl}
                                            alt={product.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                              console.log('Image failed to load:', product.imageUrl);
                                              // Fallback to placeholder on error
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center';
                                                fallback.innerHTML = '<span class="text-2xl opacity-60">🖼️</span>';
                                                parent.appendChild(fallback);
                                              }
                                            }}
                                            onLoad={() => {
                                              console.log('Image loaded successfully:', product.imageUrl);
                                            }}
                                            unoptimized={true} // Allow external images
                                          />
                                        );
                                      } else {
                                        console.log('No image URL for product:', product.title);
                                        return (
                                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                            <span className="text-3xl opacity-60">🖼️</span>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-3">
                                    <h5 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight">
                                      {product.title}
                                    </h5>

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-full">
                                        <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">{product.rating}</span>
                                      </span>
                                      <span className="text-muted-foreground/80">({product.reviews} reviews)</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      <span className="font-bold text-xl text-primary">
                                        {(() => {
                                          console.log('Processing price:', product.price);
                                          // Handle different price formats and ensure proper rupee symbol
                                          let priceText = product.price;

                                          // If price is already a number, format it
                                          if (typeof priceText === 'number') {
                                            return formatPrice(priceText);
                                          }

                                          // If price is a string with rupee symbol, use as is
                                          if (typeof priceText === 'string' && (priceText.includes('₹') || priceText.includes('Rs') || priceText.includes('INR'))) {
                                            return priceText;
                                          }

                                          // Extract numeric value and format with proper rupee symbol
                                          const numericPrice = parseFloat(priceText.toString().replace(/[^\d.]/g, '')) || 0;
                                          if (numericPrice > 0) {
                                            return formatPrice(numericPrice);
                                          }

                                          // Fallback: add rupee symbol to original text
                                          return `₹${priceText}`;
                                        })()}
                                      </span>
                                      <Badge variant="outline" className="text-xs px-3 py-1.5 font-medium border-primary/20 text-primary bg-primary/5">
                                        {product.platform}
                                      </Badge>
                                    </div>

                                    <div className="text-xs text-muted-foreground/90 font-medium bg-muted/30 px-3 py-2 rounded-lg border-l-2 border-primary/30">
                                      Popular choice among customers
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center pt-6">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full border border-primary/20">
                    <span className="text-sm font-medium text-primary">
                      These products are trending because customers appreciate authentic craftsmanship like yours!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ProductStatsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        similarProducts={selectedProduct ? trendData.flatMap(trend =>
          trend.products.filter(p =>
            p.title !== selectedProduct.title &&
            p.category === selectedProduct.category
          )
        ) : []}
      />
    </Card>
  );
}
