'use client';

import { useState } from 'react';
import { DigitalKhata } from '@/components/DigitalKhata';
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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Digital Khata</h1>
        <p className="text-muted-foreground mt-1">
          Manage your inventory and track sales performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Sales Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Product Inventory</span>
            <span className="sm:hidden">Inventory</span>
          </TabsTrigger>
          <TabsTrigger 
            value="product-detail" 
            className="flex items-center gap-2"
            disabled={!selectedProductId}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Product Details</span>
            <span className="sm:hidden">Details</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DigitalKhata artisanId={artisanId} />
        </TabsContent>

        <TabsContent value="inventory">
          <ProductInventory 
            artisanId={artisanId} 
            onProductClick={handleProductClick}
          />
        </TabsContent>

        <TabsContent value="product-detail">
          {selectedProductId ? (
            <ProductSalesDetail 
              productId={selectedProductId}
              artisanId={artisanId}
              onBack={handleBackToInventory}
            />
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select a product from inventory to view details
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
