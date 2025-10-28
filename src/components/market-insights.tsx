"use client";

import React, { useState } from 'react';
import { Lightbulb, TrendingUp, DollarSign, Users, Calendar, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarketInsight, ProfessionCategory, PROFESSION_CATEGORIES } from '@/lib/types/simplified-trend-spotter';

interface MarketInsightsProps {
  insights: MarketInsight[];
  profession: ProfessionCategory;
  className?: string;
  isSimpleMode?: boolean;
}

// Add default data for other professions
const DEFAULT_INSIGHTS = {
  opportunities: [
    'Handmade products market growing steadily',
    'Authentic crafts in high demand',
    'Festival seasons boost sales significantly',
    'Online platforms expanding artisan reach'
  ],
  recommendations: [
    'Focus on quality and authenticity',
    'Use traditional techniques and materials',
    'Create seasonal collections',
    'Highlight handmade process'
  ],
  actionItems: [
    'Take high-quality product photos',
    'Write clear, simple product descriptions',
    'Price competitively within market range',
    'Create festival-themed collections'
  ],
  marketTips: [
    'Quality materials make a difference',
    'Traditional techniques add value',
    'Seasonal items have higher demand',
    'Customer reviews are very important'
  ],
  seasonalAdvice: [
    'Festival season: Traditional and decorative items',
    'Wedding season: Gift items and ceremonial pieces',
    'Daily use: Functional and practical items',
    'Special occasions: Premium and customized pieces'
  ],
  pricingGuidance: [
    'Small items: ₹100-500',
    'Medium items: ₹300-1000',
    'Large items: ₹800-2500',
    'Premium pieces: ₹1000-5000'
  ]
};

// Realistic market insights data for Indian artisans
const MARKET_INSIGHTS_DATA: Record<ProfessionCategory, {
  opportunities: string[];
  recommendations: string[];
  actionItems: string[];
  marketTips: string[];
  seasonalAdvice: string[];
  pricingGuidance: string[];
}> = {
  pottery: {
    opportunities: [
      'During festivals like Diwali and Dussehra, people buy 40% more pottery items for decorations',
      'Wedding planners are looking for beautiful pottery pieces - this market is growing 25% every year',
      'Your pottery photos are getting lots of likes on Instagram and Facebook - home decor is trending',
      'People from other countries want to buy authentic Indian pottery - export opportunities are growing'
    ],
    recommendations: [
      'Learn traditional glazing methods - customers happily pay 30% more for authentic glazed pottery',
      'Make matching sets like dinner plates with bowls - families prefer buying complete sets',
      'Use natural earth colors like brown, terracotta, and green - these look great in photos',
      'Offer to write names or messages on pottery - personalized items sell for 50% more money'
    ],
    actionItems: [
      'Take high-quality photos showing clay texture and glazing',
      'Write product descriptions mentioning "handmade" and "traditional"',
      'Price ceramic bowls between ₹300-800 for best sales',
      'Create festival-themed pottery for seasonal sales boost'
    ],
    marketTips: [
      'Ceramic dinnerware sets sell better than individual pieces',
      'Blue and green glazes are most popular colors',
      'Kitchen pottery (bowls, plates) has highest demand',
      'Customers prefer medium-sized items (6-8 inch diameter)'
    ],
    seasonalAdvice: [
      'Diwali season: Focus on diyas, decorative bowls, rangoli plates',
      'Wedding season: Create matching dinner sets, serving bowls',
      'Monsoon: Indoor planters and decorative vases trend',
      'Summer: Water storage pots and cooling items in demand'
    ],
    pricingGuidance: [
      'Small bowls (4-6 inch): ₹200-400',
      'Medium vases (8-10 inch): ₹500-800',
      'Dinner sets (6 pieces): ₹1200-2000',
      'Large decorative items: ₹800-1500'
    ]
  },
  woodworking: {
    opportunities: [
      'City people want eco-friendly furniture - this market is growing 35% every year',
      'During festivals, people love giving custom wooden gifts instead of plastic items',
      'Kitchen items like cutting boards and wooden spoons are in high demand right now',
      'Urban families are decorating homes with wooden items - it looks natural and warm'
    ],
    recommendations: [
      'Use good quality wood like teak or rosewood - customers can feel the difference and pay more',
      'Make useful items like storage boxes and organizers - people buy things they can actually use',
      'Offer different finishes - some like natural wood, others prefer stained or painted',
      'Create matching kitchen sets - when people like one spoon, they want the whole set'
    ],
    actionItems: [
      'Show wood grain clearly in product photos',
      'Mention wood type and source in descriptions',
      'Price cutting boards ₹300-700 for competitive advantage',
      'Create seasonal items - wooden diyas for Diwali'
    ],
    marketTips: [
      'Kitchen items sell faster than decorative pieces',
      'Teak and sheesham wood preferred by customers',
      'Smooth finish is essential - customers check for splinters',
      'Medium-sized items (8-12 inch) most popular'
    ],
    seasonalAdvice: [
      'Diwali: Wooden diyas, rangoli stencils, decorative boxes',
      'Wedding season: Jewelry boxes, photo frames, gift items',
      'Monsoon: Indoor furniture, storage solutions',
      'Summer: Kitchen items, serving trays, outdoor furniture'
    ],
    pricingGuidance: [
      'Cutting boards: ₹300-700',
      'Spice boxes: ₹400-900',
      'Photo frames: ₹200-500',
      'Jewelry boxes: ₹500-1200'
    ]
  },
  jewelry: {
    opportunities: [
      'During wedding season, families buy 45% more traditional jewelry for ceremonies',
      'Young girls and working women love silver jewelry - it goes with both Indian and western clothes',
      'People want jewelry with their names or special designs - custom jewelry sales grew 60% this year',
      'Mix of traditional and modern designs is very popular - like temple jewelry with contemporary style'
    ],
    recommendations: [
      'Combine old traditional patterns with modern shapes - this appeals to all age groups',
      'Always use pure silver (92.5%) - customers check the purity stamp before buying',
      'Make light-weight earrings and chains for daily wear - heavy jewelry is only for special occasions',
      'Create matching sets like earrings with necklace - customers prefer coordinated jewelry'
    ],
    actionItems: [
      'Display jewelry on models or mannequins in photos',
      'Mention silver purity (92.5% sterling) in descriptions',
      'Price silver earrings ₹500-2000 for mass market appeal',
      'Create festival collections - Diwali, Karva Chauth themes'
    ],
    marketTips: [
      'Lightweight earrings sell better than heavy ones',
      'Silver oxidized finish very popular currently',
      'Matching sets have 40% higher sales than individual pieces',
      'Simple designs outsell complex ones 3:1'
    ],
    seasonalAdvice: [
      'Wedding season: Bridal sets, heavy necklaces, traditional designs',
      'Festival season: Temple jewelry, traditional earrings',
      'Daily wear: Simple, lightweight, affordable pieces',
      'Gifting season: Matching sets, gift boxes included'
    ],
    pricingGuidance: [
      'Simple earrings: ₹300-800',
      'Silver necklaces: ₹800-2500',
      'Bracelets/bangles: ₹400-1200',
      'Complete sets: ₹1500-4000'
    ]
  },
  textiles: {
    opportunities: [
      'Handloom products demand increased 50% post-COVID',
      'Sustainable fashion driving textile sales',
      'Home textiles (cushions, curtains) trending',
      'Regional prints gaining national popularity'
    ],
    recommendations: [
      'Highlight handloom process in product descriptions',
      'Use natural dyes - eco-conscious customers pay more',
      'Create home decor items - cushions, table runners',
      'Offer fabric by meter for custom tailoring'
    ],
    actionItems: [
      'Show weaving process in product photos/videos',
      'Mention thread count and fabric quality',
      'Price cotton sarees ₹800-2500 for middle-class market',
      'Create festival collections with traditional motifs'
    ],
    marketTips: [
      'Cotton fabrics sell better than synthetic blends',
      'Block prints and hand embroidery add 40% value',
      'Home textiles have higher margins than clothing',
      'Natural colors preferred over bright artificial dyes'
    ],
    seasonalAdvice: [
      'Festival season: Traditional sarees, dupattas with ethnic prints',
      'Wedding season: Heavy silk fabrics, embroidered pieces',
      'Summer: Light cotton, breathable fabrics',
      'Winter: Warm shawls, blankets, heavy fabrics'
    ],
    pricingGuidance: [
      'Cotton sarees: ₹800-2500',
      'Handloom bags: ₹300-800',
      'Cushion covers: ₹200-500',
      'Table runners: ₹300-700'
    ]
  },
  metalwork: {
    opportunities: [
      'Brass home decor items trending 30% growth',
      'Traditional metal crafts popular in urban markets',
      'Copper utensils demand rising due to health awareness',
      'Metal wall art and sculptures gaining popularity'
    ],
    recommendations: [
      'Focus on brass and copper - traditional metals preferred',
      'Create functional items - lamps, bowls, utensils',
      'Offer antique finish - customers love vintage look',
      'Make items that are both decorative and functional'
    ],
    actionItems: [
      'Show metal shine and finish quality in photos',
      'Mention metal purity and traditional techniques',
      'Price brass lamps ₹600-1800 for competitive market',
      'Create Diwali special collections - diyas, rangoli items'
    ],
    marketTips: [
      'Brass items sell better than other metals',
      'Functional items have higher demand than purely decorative',
      'Antique/oxidized finish preferred over shiny finish',
      'Medium-sized items (6-10 inch) most popular'
    ],
    seasonalAdvice: [
      'Diwali: Brass diyas, decorative lamps, rangoli accessories',
      'Wedding season: Traditional brass items, gift sets',
      'Daily use: Kitchen utensils, storage containers',
      'Decor season: Wall hangings, sculptures, showpieces'
    ],
    pricingGuidance: [
      'Brass lamps: ₹600-1800',
      'Copper bowls: ₹400-1000',
      'Metal wall art: ₹500-1500',
      'Utensil sets: ₹800-2000'
    ]
  },
  handmade: {
    opportunities: [
      'General handmade products market growing 40% annually',
      'Gift items and decoratives in high demand',
      'Eco-friendly products trending among urban customers',
      'Unique, one-of-a-kind items command premium prices'
    ],
    recommendations: [
      'Emphasize uniqueness and handmade authenticity',
      'Create gift-ready packaging and presentation',
      'Focus on functional items with decorative appeal',
      'Use sustainable materials and processes'
    ],
    actionItems: [
      'Highlight handmade process in product descriptions',
      'Show before/after or making process in photos',
      'Price gift items ₹200-800 for mass market appeal',
      'Create festival and occasion-specific collections'
    ],
    marketTips: [
      'Gift items sell better during festival seasons',
      'Customers prefer items with stories behind them',
      'Packaging and presentation add significant value',
      'Small to medium-sized items have broader appeal'
    ],
    seasonalAdvice: [
      'Festival season: Decorative items, gift sets, traditional crafts',
      'Wedding season: Personalized gifts, decorative pieces',
      'Daily use: Functional items, home accessories',
      'Gifting occasions: Ready-to-gift items with packaging'
    ],
    pricingGuidance: [
      'Small gift items: ₹100-400',
      'Decorative pieces: ₹300-1000',
      'Functional items: ₹200-800',
      'Premium handmade: ₹500-2000'
    ]
  },
  ceramics: DEFAULT_INSIGHTS,
  glasswork: DEFAULT_INSIGHTS,
  leatherwork: DEFAULT_INSIGHTS,
  painting: DEFAULT_INSIGHTS,
  sculpture: DEFAULT_INSIGHTS,
  weaving: DEFAULT_INSIGHTS,
  embroidery: DEFAULT_INSIGHTS,
  crafts: DEFAULT_INSIGHTS
};

export function MarketInsights({ 
  insights, 
  profession, 
  className = "",
  isSimpleMode = true 
}: MarketInsightsProps) {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'tips' | 'pricing' | 'seasonal'>('opportunities');
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  // Helper function to get trend score color and label
  const getTrendScoreDisplay = (confidence: number) => {
    if (confidence >= 80) {
      return { 
        color: 'text-green-600', 
        bgColor: 'bg-green-100', 
        label: 'High Opportunity', 
        icon: '🔥',
        description: 'Very promising market trend'
      };
    } else if (confidence >= 60) {
      return { 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100', 
        label: 'Good Potential', 
        icon: '📈',
        description: 'Solid market opportunity'
      };
    } else {
      return { 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100', 
        label: 'Worth Exploring', 
        icon: '💡',
        description: 'Emerging market trend'
      };
    }
  };

  // Get profession-specific data or use defaults
  const professionData = MARKET_INSIGHTS_DATA[profession] || DEFAULT_INSIGHTS;

  const tabs = [
    { 
      id: 'opportunities' as const, 
      label: 'Market Opportunities', 
      icon: TrendingUp, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    { 
      id: 'tips' as const, 
      label: 'Success Tips', 
      icon: Lightbulb, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    { 
      id: 'pricing' as const, 
      label: 'Pricing Guide', 
      icon: DollarSign, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    { 
      id: 'seasonal' as const, 
      label: 'Seasonal Trends', 
      icon: Calendar, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const getContentForTab = (tabId: typeof activeTab) => {
    switch (tabId) {
      case 'opportunities':
        return professionData.opportunities;
      case 'tips':
        return professionData.marketTips;
      case 'pricing':
        return professionData.pricingGuidance;
      case 'seasonal':
        return professionData.seasonalAdvice;
      default:
        return [];
    }
  };

  if (isSimpleMode) {
    return (
      <div className={`space-y-8 ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-100 to-yellow-100" aria-hidden="true">
            <Lightbulb className="size-7 text-orange-600" />
          </div>
          <div>
            <h2 
              id="market-insights-heading"
              className="font-semibold text-xl sm:text-2xl text-gray-900"
            >
              Market Insights for {PROFESSION_CATEGORIES[profession]?.label || profession}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mt-1">
              Practical advice to grow your craft business
            </p>
          </div>
        </div>

        {/* Tab Navigation - Simple and visual */}
        <div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          role="tablist"
          aria-label="Market insights categories"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={`
                  p-4 sm:p-5 rounded-lg border-2 transition-all duration-200 text-center
                  min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-4 focus:ring-primary/20
                  ${isActive 
                    ? `${tab.bgColor} ${tab.borderColor} ${tab.color}` 
                    : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                  }
                `}
                aria-label={`View ${tab.label.toLowerCase()}`}
              >
                <Icon className={`size-7 mx-auto mb-3 ${isActive ? tab.color : 'text-gray-400'}`} aria-hidden="true" />
                <div className="text-sm sm:text-base font-medium">
                  {tab.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Display */}
        <Card 
          className={`${tabs.find(t => t.id === activeTab)?.bgColor} border-2 ${tabs.find(t => t.id === activeTab)?.borderColor}`}
          role="tabpanel"
          id={`${activeTab}-panel`}
          aria-labelledby={`${activeTab}-tab`}
        >
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Lightbulb, {
                className: `size-6 ${tabs.find(t => t.id === activeTab)?.color}`,
                'aria-hidden': 'true'
              })}
              {tabs.find(t => t.id === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {getContentForTab(activeTab).map((item, index) => (
              <div
                key={index}
                className="bg-white/70 p-5 rounded-lg border border-white/50 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 mt-1"
                    aria-hidden="true"
                  >
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base sm:text-lg text-gray-800 leading-relaxed">
                      {item}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI-Generated Insights from API */}
        {insights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                <Info className="size-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  What's Trending Right Now
                </h3>
                <p className="text-sm text-gray-600">
                  Fresh insights based on current market data
                </p>
              </div>
              <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200">
                Live Analysis
              </Badge>
            </div>
            
            {insights.map((insight, index) => {
              const trendDisplay = getTrendScoreDisplay(insight.confidence);
              
              return (
                <Card key={index} className={`border-2 ${trendDisplay.bgColor} border-opacity-50 shadow-sm hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {/* Trend Score Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{trendDisplay.icon}</span>
                          <div>
                            <div className={`font-semibold ${trendDisplay.color}`}>
                              {trendDisplay.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {trendDisplay.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${trendDisplay.color}`}>
                            {insight.confidence}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Market Score
                          </div>
                        </div>
                      </div>

                      {/* Market Opportunity - More conversational */}
                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="size-4 text-green-600" />
                          Why This Matters for Your {profession}
                        </h4>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {insight.opportunity}
                        </p>
                      </div>
                      
                      {/* Recommendation - Simple language */}
                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Lightbulb className="size-4 text-yellow-600" />
                          What You Should Do
                        </h4>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {insight.recommendation}
                        </p>
                      </div>

                      {/* Action Items - Very practical */}
                      {insight.actionItems.length > 0 && (
                        <div className="bg-white/70 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <ChevronRight className="size-4 text-blue-600" />
                            Your Next Steps
                          </h4>
                          <div className="space-y-3">
                            {insight.actionItems.map((action, actionIndex) => (
                              <div key={actionIndex} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">{actionIndex + 1}</span>
                                </div>
                                <span className="text-sm text-gray-800 leading-relaxed">
                                  {action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Market Indicators */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${trendDisplay.bgColor} ${trendDisplay.color.replace('text-', 'border-')} border-2`}></div>
                            <span className="text-xs text-gray-600">
                              Trend Strength: {insight.confidence >= 80 ? 'Strong' : insight.confidence >= 60 ? 'Moderate' : 'Emerging'}
                            </span>
                          </div>
                          {insight.competitionLevel && (
                            <div className="flex items-center gap-2">
                              <Users className="size-3 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                Competition: {insight.competitionLevel}
                              </span>
                            </div>
                          )}
                        </div>
                        {insight.marketSize && (
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                            Market: {insight.marketSize}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Compact mode for advanced users
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Market Insights</h3>
        <Badge variant="outline" className="text-xs">
          {profession}
        </Badge>
      </div>

      {/* Compact insights display */}
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const trendDisplay = getTrendScoreDisplay(insight.confidence);
          
          return (
            <Card key={index} className={`border-l-4 ${trendDisplay.color.replace('text-', 'border-l-')}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{trendDisplay.icon}</span>
                      <Badge className={`text-xs ${trendDisplay.bgColor} ${trendDisplay.color} border-0`}>
                        {trendDisplay.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-800 mb-2">
                      {insight.opportunity}
                    </p>
                    <p className="text-xs text-gray-600">
                      {insight.recommendation}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${trendDisplay.color}`}>
                      {insight.confidence}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Score
                    </div>
                  </div>
                </div>
                
                {expandedInsight === index && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="space-y-2">
                      {insight.actionItems.map((action, actionIndex) => (
                        <div key={actionIndex} className="flex items-start gap-2">
                          <ChevronRight className="size-3 text-primary mt-1 flex-shrink-0" />
                          <span className="text-xs text-gray-700">
                            {action}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Additional indicators in compact mode */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t">
                      {insight.competitionLevel && (
                        <div className="flex items-center gap-1">
                          <Users className="size-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {insight.competitionLevel} competition
                          </span>
                        </div>
                      )}
                      {insight.marketSize && (
                        <Badge variant="outline" className="text-xs">
                          {insight.marketSize}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedInsight(expandedInsight === index ? null : index)}
                  className="mt-2 text-xs"
                >
                  {expandedInsight === index ? 'Show Less' : 'Show Details'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}