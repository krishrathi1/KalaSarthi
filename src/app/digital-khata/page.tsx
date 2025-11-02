'use client';

import { useState } from 'react';
import { ProductInventory } from '@/components/ProductInventory';
import { ProductSalesDetail } from '@/components/ProductSalesDetail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, BarChart3, TrendingUp } from 'lucide-react';

export default function DigitalKhataPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const artisanId = 'artisan_001';

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setActiveTab('product-detail');
  };

  const handleBackToInventory = () => {
    setSelectedProductId(null);
    setActiveTab('inventory');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-full">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Digital Khata
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Manage your inventory and track sales performance
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 min-w-[400px] bg-white/80 backdrop-blur-sm border shadow-sm">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Inventory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="product-detail" 
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                disabled={!selectedProductId}
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Details</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="w-full">
            <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 sm:h-20 sm:w-20 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Sales Overview Coming Soon</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  View comprehensive sales analytics and insights
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="w-full">
            <ProductInventory 
              artisanId={artisanId} 
              onProductClick={handleProductClick}
            />
          </TabsContent>

          <TabsContent value="product-detail" className="w-full">
            {selectedProductId ? (
              <ProductSalesDetail 
                productId={selectedProductId}
                artisanId={artisanId}
                onBack={handleBackToInventory}
              />
            ) : (
              <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="text-center py-12">
                  <Package className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Select a product from inventory to view details
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
