import { SmartProductCreator } from "@/components/smart-product-creator";

export default function SmartProductCreatorPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <SmartProductCreator />
      </div>
    </div>
  );
}