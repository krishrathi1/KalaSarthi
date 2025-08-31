// "use client";

// import { useState } from "react";
// import { Sparkles, Package } from "lucide-react";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useToast } from "@/hooks/use-toast";
// import { useAuth } from "@/context/auth-context";
// import { generateProductStory } from "@/lib/actions";
// import type { GenerateProductStoryOutput } from "@/ai/flows/generate-product-story";
// import { uploadToCloudinary } from '@/lib/cloudinary';
// import { ImageUpload } from "./story-generator/ImageUpload";
// import { StoryDisplay } from "./story-generator/StoryDisplay";
// import { ProductForm, type ProductFormData } from "./story-generator/ProductForm";

// export function StoryGenerator() {
//   const [productDescription, setProductDescription] = useState("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [imageDataUri, setImageDataUri] = useState<string | null>(null);
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<GenerateProductStoryOutput | null>(null);
//   const [showProductForm, setShowProductForm] = useState(false);
//   const [uploadingProduct, setUploadingProduct] = useState(false);

//   const { toast } = useToast();
//   const { userProfile } = useAuth();

//   const [productForm, setProductForm] = useState<ProductFormData>({
//     name: "",
//     description: "",
//     price: 0,
//     category: "",
//     materials: [],
//     colors: [],
//     dimensions: {
//       length: 0,
//       width: 0,
//       height: 0,
//       weight: 0
//     },
//     quantity: 1,
//     tags: []
//   });

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         const dataUri = reader.result as string;
//         setImagePreview(URL.createObjectURL(file));
//         setImageDataUri(dataUri);
//         setImageFile(file);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!imageDataUri || !productDescription) {
//       toast({
//         title: "Missing Information",
//         description: "Please upload a photo and provide a product description.",
//         variant: "destructive",
//       });
//       return;
//     }

//     setLoading(true);
//     setResult(null);

//     const response = await generateProductStory({
//       photoDataUri: imageDataUri,
//       productDescription,
//     });

//     if (response.success && response.data) {
//       setResult(response.data);
//       // Pre-fill product form with generated data
//       setProductForm(prev => ({
//         ...prev,
//         description: productDescription,
//         name: response.data?.englishCaption || ""
//       }));
//     } else {
//       toast({
//         title: "Generation Failed",
//         description: response.error,
//         variant: "destructive",
//       });
//     }

//     setLoading(false);
//   };

//   const uploadProductImages = async (): Promise<string[]> => {
//     if (!imageFile || !userProfile) return [];

//     try {
//       const result = await uploadToCloudinary(imageFile);
//       return [result.secure_url];
//     } catch (error) {
//       console.error('Error uploading image to Cloudinary:', error);
//       throw error;
//     }
//   };

//   const handleProductSubmit = async () => {
//     if (!userProfile) {
//       toast({
//         title: "Authentication Required",
//         description: "Please log in to create a product.",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!productForm.name || !productForm.description || !productForm.price || !productForm.category) {
//       toast({
//         title: "Missing Information",
//         description: "Please fill in all required fields.",
//         variant: "destructive",
//       });
//       return;
//     }

//     setUploadingProduct(true);

//     try {
//       // Upload images
//       const imageUrls = await uploadProductImages();

//       if (imageUrls.length === 0) {
//         throw new Error("Failed to upload product images");
//       }

//       // Prepare product data
//       const productData = {
//         artisanId: userProfile.uid,
//         name: productForm.name,
//         description: productForm.description,
//         price: productForm.price,
//         category: productForm.category,
//         images: imageUrls,
//         story: result ? {
//           englishStory: result.englishStory,
//           englishCaption: result.englishCaption,
//           spanishStory: result.spanishStory,
//           spanishCaption: result.spanishCaption,
//           frenchStory: result.frenchStory,
//           frenchCaption: result.frenchCaption,
//         } : undefined,
//         specifications: {
//           materials: productForm.materials,
//           colors: productForm.colors,
//           dimensions: productForm.dimensions
//         },
//         inventory: {
//           quantity: productForm.quantity,
//           isAvailable: true
//         },
//         tags: productForm.tags,
//         status: "draft" as const
//       };

//       // Submit to API
//       const response = await fetch('/api/products', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(productData),
//       });

//       const result_api = await response.json();

//       if (result_api.success) {
//         toast({
//           title: "Product Created",
//           description: "Your product has been created successfully!",
//         });

//         resetForm();
//       } else {
//         throw new Error(result_api.error || 'Failed to create product');
//       }
//     } catch (error) {
//       console.error('Error creating product:', error);
//       toast({
//         title: "Creation Failed",
//         description: error instanceof Error ? error.message : "Failed to create product",
//         variant: "destructive",
//       });
//     } finally {
//       setUploadingProduct(false);
//     }
//   };

//   const resetForm = () => {
//     setShowProductForm(false);
//     setProductForm({
//       name: "",
//       description: "",
//       price: 0,
//       category: "",
//       materials: [],
//       colors: [],
//       dimensions: { length: 0, width: 0, height: 0, weight: 0 },
//       quantity: 1,
//       tags: []
//     });
//     setResult(null);
//     setImagePreview(null);
//     setImageDataUri(null);
//     setImageFile(null);
//     setProductDescription("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
//   };

//   return (
//     <Card id="story" className="h-full">
//       <CardHeader>
//         <CardTitle className="font-headline flex items-center gap-2">
//           <Sparkles className="size-6 text-primary" />
//           Heritage Storytelling
//         </CardTitle>
//         <CardDescription>
//           Upload a photo and description to generate compelling product stories
//           in multiple languages.
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-6">
//         <div className="grid md:grid-cols-2 gap-6">
//           <ImageUpload
//             imagePreview={imagePreview}
//             onImageChange={handleImageChange}
//           />
//           <div className="space-y-2">
//             <Label htmlFor="product-description">Product Description</Label>
//             <Textarea
//               id="product-description"
//               placeholder="e.g., Handwoven Kanchipuram silk saree..."
//               value={productDescription}
//               onChange={(e) => setProductDescription(e.target.value)}
//               className="h-[150px] md:h-full"
//               rows={6}
//             />
//           </div>
//         </div>
//         <Button onClick={handleSubmit} disabled={loading || !imageDataUri}>
//           {loading ? "Generating..." : "Generate Story"}
//           <Sparkles className="ml-2" />
//         </Button>

//         {loading && (
//           <div className="space-y-4">
//             <Skeleton className="h-8 w-1/3" />
//             <Skeleton className="h-20 w-full" />
//             <Skeleton className="h-8 w-full" />
//           </div>
//         )}

//         {result && (
//           <>
//             <StoryDisplay result={result} />

//             {/* Product Upload Option */}
//             <div className="flex gap-3 pt-4">
//               <Button
//                 onClick={() => setShowProductForm(true)}
//                 className="flex items-center gap-2"
//                 variant="default"
//               >
//                 <Package className="w-4 h-4" />
//                 Create Product Listing
//               </Button>
//               <Button
//                 onClick={() => {
//                   setResult(null);
//                   setImagePreview(null);
//                   setImageDataUri(null);
//                   setImageFile(null);
//                   setProductDescription("A handwoven Kanchipuram silk saree with traditional peacock motifs and a golden zari border.");
//                 }}
//                 variant="outline"
//               >
//                 Generate New Story
//               </Button>
//             </div>
//           </>
//         )}

//         {/* Product Upload Form */}
//         {showProductForm && result && (
//           <ProductForm
//             productForm={productForm}
//             setProductForm={setProductForm}
//             result={result}
//             uploadingProduct={uploadingProduct}
//             onSubmit={handleProductSubmit}
//             onCancel={() => setShowProductForm(false)}
//           />
//         )}
//       </CardContent>
//     </Card>
//   );
// }
