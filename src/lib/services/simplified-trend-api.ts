/**
 * Simplified Trend Spotter API Service
 * Handles API integration with automatic fallback to mock data
 */

import {
  TrendingProduct,
  MarketInsight,
  TrendingDataResponse,
  ProfessionCategory,
  ConnectivityStatus,
  MockDataConfig,
  DEFAULT_PRICE_RANGES,
  PROFESSION_CATEGORIES
} from '@/lib/types/simplified-trend-spotter';

// Import Etsy API service
import { etsyAPI } from './etsy-api';

// Comprehensive mock data integrated from trending services

/**
 * Comprehensive mock trending data for different professions
 */
const COMPREHENSIVE_MOCK_DATA = {
  pottery: [
    {
      id: 'trend-ceramic-bowls-2024',
      title: 'Handmade Ceramic Bowls with Natural Glazes - Set of 4',
      category: 'pottery',
      trendScore: 87,
      growthRate: 23,
      trendType: 'hot' as const,
      description: 'Ceramic bowls with natural glazes are experiencing high demand, especially those with earthy tones and organic shapes.',
      keywords: ['pottery', 'ceramic', 'bowls', 'handmade', 'natural', 'glaze'],
      price: 650,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handmade+ceramic+bowls',
      imageUrl: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Ceramic+Bowls'
    },
    {
      id: 'trend-pottery-planters-2024',
      title: 'Terracotta Planters with Drainage Systems - Medium Size',
      category: 'pottery',
      trendScore: 72,
      growthRate: 18,
      trendType: 'rising' as const,
      description: 'Indoor gardening trend is driving demand for functional pottery planters with proper drainage.',
      keywords: ['pottery', 'planters', 'terracotta', 'gardening', 'indoor'],
      price: 450,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=terracotta%20planters&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Terracotta+Planter'
    },
    {
      id: 'trend-ceramic-dinnerware-2024',
      title: 'Traditional Blue Pottery Dinner Set - 12 Pieces',
      category: 'pottery',
      trendScore: 79,
      growthRate: 15,
      trendType: 'seasonal' as const,
      description: 'Traditional blue pottery dinner sets are popular for festive occasions and gifting.',
      keywords: ['pottery', 'dinnerware', 'blue', 'traditional', 'festive'],
      price: 1200,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=blue+pottery+dinner+set',
      imageUrl: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Blue+Pottery+Set'
    },
    {
      id: 'trend-ceramic-vases-2024',
      title: 'Handcrafted Ceramic Vases - Modern Minimalist Design',
      category: 'pottery',
      trendScore: 84,
      growthRate: 20,
      trendType: 'hot' as const,
      description: 'Modern minimalist ceramic vases are trending for contemporary home decor.',
      keywords: ['pottery', 'vases', 'ceramic', 'minimalist', 'modern'],
      price: 580,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=ceramic+vases+handmade',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Ceramic+Vases'
    },
    {
      id: 'trend-pottery-mugs-2024',
      title: 'Artisan Coffee Mugs - Hand-thrown Stoneware',
      category: 'pottery',
      trendScore: 76,
      growthRate: 17,
      trendType: 'rising' as const,
      description: 'Hand-thrown stoneware mugs are popular among coffee enthusiasts.',
      keywords: ['pottery', 'mugs', 'coffee', 'stoneware', 'handthrown'],
      price: 320,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=handmade%20ceramic%20mugs&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Coffee+Mugs'
    },
    {
      id: 'trend-pottery-lamps-2024',
      title: 'Ceramic Table Lamps - Handpainted Traditional',
      category: 'pottery',
      trendScore: 71,
      growthRate: 14,
      trendType: 'stable' as const,
      description: 'Handpainted ceramic table lamps add traditional charm to modern homes.',
      keywords: ['pottery', 'lamps', 'ceramic', 'handpainted', 'traditional'],
      price: 950,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=ceramic%20table%20lamps&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Ceramic+Lamps'
    }
  ],
  woodworking: [
    {
      id: 'trend-cutting-boards-2024',
      title: 'Artisan Wooden Cutting Boards with Live Edge - Teak Wood',
      category: 'woodworking',
      trendScore: 72,
      growthRate: 15,
      trendType: 'rising' as const,
      description: 'Live edge wooden cutting boards are trending as people seek unique, functional kitchen accessories.',
      keywords: ['woodworking', 'cutting', 'boards', 'kitchen', 'artisan', 'live edge'],
      price: 890,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=wooden+cutting+board+live+edge',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Wooden+Cutting+Board'
    },
    {
      id: 'trend-wooden-spice-boxes-2024',
      title: 'Traditional Wooden Spice Boxes with 7 Compartments - Sheesham',
      category: 'woodworking',
      trendScore: 68,
      growthRate: 12,
      trendType: 'stable' as const,
      description: 'Traditional wooden spice boxes are popular for kitchen organization and authentic cooking.',
      keywords: ['woodworking', 'spice', 'boxes', 'kitchen', 'traditional'],
      price: 750,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=wooden+spice+box+sheesham',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Wooden+Spice+Box'
    },
    {
      id: 'trend-wooden-photo-frames-2024',
      title: 'Handcrafted Wooden Photo Frames - Vintage Style',
      category: 'woodworking',
      trendScore: 65,
      growthRate: 8,
      trendType: 'stable' as const,
      description: 'Vintage-style wooden photo frames are popular for home decor and gifting.',
      keywords: ['woodworking', 'photo', 'frames', 'vintage', 'decor'],
      price: 320,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=wooden%20photo%20frames&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Photo+Frames'
    },
    {
      id: 'trend-wooden-bowls-2024',
      title: 'Handturned Wooden Bowls - Mango Wood',
      category: 'woodworking',
      trendScore: 78,
      growthRate: 19,
      trendType: 'rising' as const,
      description: 'Handturned wooden bowls made from sustainable mango wood are gaining popularity.',
      keywords: ['woodworking', 'bowls', 'handturned', 'mango', 'sustainable'],
      price: 650,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=handturned%20wooden%20bowls',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Wooden+Bowls'
    },
    {
      id: 'trend-wooden-furniture-2024',
      title: 'Handcrafted Wooden Stools - Rustic Design',
      category: 'woodworking',
      trendScore: 73,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Rustic wooden stools are trending for farmhouse and minimalist home decor.',
      keywords: ['woodworking', 'stools', 'furniture', 'rustic', 'farmhouse'],
      price: 1200,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handmade+wooden+stools',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Wooden+Stools'
    },
    {
      id: 'trend-wooden-toys-2024',
      title: 'Educational Wooden Toys - Montessori Style',
      category: 'woodworking',
      trendScore: 81,
      growthRate: 22,
      trendType: 'hot' as const,
      description: 'Montessori-style wooden toys are in high demand among conscious parents.',
      keywords: ['woodworking', 'toys', 'educational', 'montessori', 'children'],
      price: 480,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=wooden%20educational%20toys&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Wooden+Toys'
    }
  ],
  jewelry: [
    {
      id: 'trend-silver-jewelry-2024',
      title: 'Minimalist Silver Ring Set - Stackable Design',
      category: 'jewelry',
      trendScore: 85,
      growthRate: 28,
      trendType: 'hot' as const,
      description: 'Clean, minimalist silver jewelry continues to be popular, especially stackable rings and delicate necklaces.',
      keywords: ['jewelry', 'silver', 'minimalist', 'design', 'accessories'],
      price: 1250,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=minimalist%20silver%20ring%20set',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Silver+Rings'
    },
    {
      id: 'trend-oxidized-jewelry-2024',
      title: 'Traditional Oxidized Silver Jhumka Earrings',
      category: 'jewelry',
      trendScore: 79,
      growthRate: 22,
      trendType: 'rising' as const,
      description: 'Oxidized silver jewelry with traditional designs is trending, especially jhumkas and chandbali styles.',
      keywords: ['jewelry', 'oxidized', 'silver', 'traditional', 'earrings'],
      price: 980,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=oxidized%20silver%20jhumka%20earrings&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Jhumka+Earrings'
    },
    {
      id: 'trend-beaded-necklaces-2024',
      title: 'Handmade Beaded Necklaces - Multi-Color',
      category: 'jewelry',
      trendScore: 73,
      growthRate: 18,
      trendType: 'rising' as const,
      description: 'Colorful beaded necklaces are popular for casual wear and bohemian style.',
      keywords: ['jewelry', 'beaded', 'necklaces', 'handmade', 'colorful'],
      price: 650,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=beaded%20necklaces&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Beaded+Necklaces'
    },
    {
      id: 'trend-brass-jewelry-2024',
      title: 'Handcrafted Brass Bangles - Traditional Design',
      category: 'jewelry',
      trendScore: 77,
      growthRate: 19,
      trendType: 'rising' as const,
      description: 'Traditional brass bangles are making a comeback in contemporary fashion.',
      keywords: ['jewelry', 'brass', 'bangles', 'traditional', 'handcrafted'],
      price: 420,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handmade+brass+bangles',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Brass+Bangles'
    },
    {
      id: 'trend-gemstone-jewelry-2024',
      title: 'Natural Gemstone Pendants - Healing Crystals',
      category: 'jewelry',
      trendScore: 82,
      growthRate: 25,
      trendType: 'hot' as const,
      description: 'Natural gemstone jewelry with healing properties is trending among wellness enthusiasts.',
      keywords: ['jewelry', 'gemstone', 'pendants', 'healing', 'crystals'],
      price: 890,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=natural%20gemstone%20pendants',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Gemstone+Pendants'
    },
    {
      id: 'trend-thread-jewelry-2024',
      title: 'Colorful Thread Bracelets - Friendship Style',
      category: 'jewelry',
      trendScore: 69,
      growthRate: 13,
      trendType: 'stable' as const,
      description: 'Handmade thread bracelets are popular for casual wear and gifting.',
      keywords: ['jewelry', 'thread', 'bracelets', 'friendship', 'colorful'],
      price: 180,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=thread%20bracelets%20handmade&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Thread+Bracelets'
    }
  ],
  textiles: [
    {
      id: 'trend-handloom-bags-2024',
      title: 'Handloom Cotton Tote Bags - Eco-Friendly',
      category: 'textiles',
      trendScore: 74,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Sustainable handloom bags are trending as people move away from plastic bags.',
      keywords: ['textiles', 'handloom', 'bags', 'cotton', 'sustainable'],
      price: 420,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handloom%20cotton%20tote%20bags',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Handloom+Bags'
    },
    {
      id: 'trend-block-print-scarves-2024',
      title: 'Block Print Cotton Scarves - Rajasthani Style',
      category: 'textiles',
      trendScore: 66,
      growthRate: 8,
      trendType: 'seasonal' as const,
      description: 'Traditional block print scarves are popular during festival seasons and as gifts.',
      keywords: ['textiles', 'block', 'print', 'scarves', 'cotton'],
      price: 350,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=cotton%20scarves&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Cotton+Scarves'
    },
    {
      id: 'trend-handwoven-sarees-2024',
      title: 'Handwoven Cotton Sarees - Traditional Patterns',
      category: 'textiles',
      trendScore: 81,
      growthRate: 20,
      trendType: 'hot' as const,
      description: 'Handwoven cotton sarees with traditional patterns are in high demand for festivals.',
      keywords: ['textiles', 'handwoven', 'sarees', 'cotton', 'traditional'],
      price: 1800,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=handwoven%20cotton%20sarees&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Cotton+Sarees'
    },
    {
      id: 'trend-embroidered-cushions-2024',
      title: 'Hand Embroidered Cushion Covers - Floral Design',
      category: 'textiles',
      trendScore: 75,
      growthRate: 17,
      trendType: 'rising' as const,
      description: 'Hand embroidered cushion covers with floral designs are trending for home decor.',
      keywords: ['textiles', 'embroidered', 'cushions', 'floral', 'home decor'],
      price: 480,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=hand+embroidered+cushion+covers',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Embroidered+Cushions'
    },
    {
      id: 'trend-khadi-fabric-2024',
      title: 'Pure Khadi Fabric - Handspun Cotton',
      category: 'textiles',
      trendScore: 78,
      growthRate: 21,
      trendType: 'rising' as const,
      description: 'Pure khadi fabric is gaining popularity for sustainable fashion and home textiles.',
      keywords: ['textiles', 'khadi', 'fabric', 'handspun', 'sustainable'],
      price: 320,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=pure%20khadi%20fabric',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Khadi+Fabric'
    },
    {
      id: 'trend-quilted-bedspreads-2024',
      title: 'Hand Quilted Bedspreads - Vintage Patterns',
      category: 'textiles',
      trendScore: 72,
      growthRate: 14,
      trendType: 'stable' as const,
      description: 'Hand quilted bedspreads with vintage patterns are popular for bedroom decor.',
      keywords: ['textiles', 'quilted', 'bedspreads', 'vintage', 'bedroom'],
      price: 2200,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=hand%20quilted%20bedspreads&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Quilted+Bedspreads'
    }
  ],
  handmade: [
    {
      id: 'trend-handmade-candles-2024',
      title: 'Handmade Scented Candles - Soy Wax',
      category: 'handmade',
      trendScore: 76,
      growthRate: 14,
      trendType: 'rising' as const,
      description: 'Handmade scented candles are popular for home decor and aromatherapy.',
      keywords: ['handmade', 'candles', 'scented', 'soy', 'aromatherapy'],
      price: 450,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=handmade%20scented%20candles%20soy%20wax',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Scented+Candles'
    },
    {
      id: 'trend-macrame-wall-hangings-2024',
      title: 'Macrame Wall Hangings - Boho Style',
      category: 'handmade',
      trendScore: 69,
      growthRate: 11,
      trendType: 'stable' as const,
      description: 'Macrame wall hangings continue to be popular for bohemian home decor.',
      keywords: ['handmade', 'macrame', 'wall', 'hangings', 'boho'],
      price: 680,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=macrame%20wall%20hangings',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Macrame+Hangings'
    },
    {
      id: 'trend-handmade-soaps-2024',
      title: 'Natural Handmade Soaps - Organic Ingredients',
      category: 'handmade',
      trendScore: 83,
      growthRate: 24,
      trendType: 'hot' as const,
      description: 'Natural handmade soaps with organic ingredients are trending in the wellness market.',
      keywords: ['handmade', 'soaps', 'natural', 'organic', 'wellness'],
      price: 280,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=handmade%20natural%20soaps&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Natural+Soaps'
    },
    {
      id: 'trend-dreamcatchers-2024',
      title: 'Handcrafted Dreamcatchers - Traditional Design',
      category: 'handmade',
      trendScore: 71,
      growthRate: 15,
      trendType: 'stable' as const,
      description: 'Traditional dreamcatchers are popular for bedroom decor and spiritual wellness.',
      keywords: ['handmade', 'dreamcatchers', 'traditional', 'spiritual', 'bedroom'],
      price: 380,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=handmade%20dreamcatchers&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Dreamcatchers'
    },
    {
      id: 'trend-handmade-notebooks-2024',
      title: 'Handbound Journals - Recycled Paper',
      category: 'handmade',
      trendScore: 74,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Handbound journals made from recycled paper are popular among eco-conscious consumers.',
      keywords: ['handmade', 'journals', 'notebooks', 'recycled', 'eco-friendly'],
      price: 420,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=handbound%20journals%20recycled',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Handbound+Journals'
    }
  ],
  metalwork: [
    {
      id: 'trend-brass-lamps-2024',
      title: 'Traditional Brass Table Lamps - Antique Finish',
      category: 'metalwork',
      trendScore: 78,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Brass lamps with antique finish are popular for traditional home decor.',
      keywords: ['metalwork', 'brass', 'lamps', 'antique', 'traditional'],
      price: 1200,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=brass%20table%20lamps%20antique',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Brass+Lamps'
    },
    {
      id: 'trend-copper-vessels-2024',
      title: 'Handcrafted Copper Water Bottles - Ayurvedic',
      category: 'metalwork',
      trendScore: 85,
      growthRate: 23,
      trendType: 'hot' as const,
      description: 'Copper water bottles are trending due to their health benefits and traditional appeal.',
      keywords: ['metalwork', 'copper', 'bottles', 'ayurvedic', 'health'],
      price: 680,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=copper%20water%20bottles%20handmade&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Copper+Bottles'
    },
    {
      id: 'trend-iron-decor-2024',
      title: 'Wrought Iron Wall Art - Decorative Panels',
      category: 'metalwork',
      trendScore: 73,
      growthRate: 17,
      trendType: 'rising' as const,
      description: 'Wrought iron decorative panels are popular for modern and traditional home decor.',
      keywords: ['metalwork', 'iron', 'wall art', 'decorative', 'panels'],
      price: 1580,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=wrought%20iron%20wall%20art',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Iron+Wall+Art'
    }
  ],
  leatherwork: [
    {
      id: 'trend-leather-bags-2024',
      title: 'Handcrafted Leather Messenger Bags - Vintage Brown',
      category: 'leatherwork',
      trendScore: 71,
      growthRate: 13,
      trendType: 'stable' as const,
      description: 'Vintage-style leather messenger bags are popular among professionals.',
      keywords: ['leatherwork', 'bags', 'messenger', 'vintage', 'professional'],
      price: 2200,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=handcrafted%20leather%20messenger%20bags',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Leather+Bags'
    },
    {
      id: 'trend-leather-wallets-2024',
      title: 'Handstitched Leather Wallets - Minimalist Design',
      category: 'leatherwork',
      trendScore: 79,
      growthRate: 18,
      trendType: 'rising' as const,
      description: 'Minimalist leather wallets with hand-stitching are popular among young professionals.',
      keywords: ['leatherwork', 'wallets', 'handstitched', 'minimalist', 'professional'],
      price: 890,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handmade+leather+wallets',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Leather+Wallets'
    },
    {
      id: 'trend-leather-belts-2024',
      title: 'Genuine Leather Belts - Hand-tooled Designs',
      category: 'leatherwork',
      trendScore: 74,
      growthRate: 15,
      trendType: 'stable' as const,
      description: 'Hand-tooled leather belts with traditional designs are making a comeback.',
      keywords: ['leatherwork', 'belts', 'hand-tooled', 'traditional', 'genuine'],
      price: 1200,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=genuine%20leather%20belts%20handmade&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Leather+Belts'
    }
  ],
  crafts: [
    {
      id: 'trend-paper-crafts-2024',
      title: 'Handmade Paper Greeting Cards - Festival Collection',
      category: 'crafts',
      trendScore: 64,
      growthRate: 9,
      trendType: 'seasonal' as const,
      description: 'Handmade paper greeting cards are popular during festival seasons.',
      keywords: ['crafts', 'paper', 'greeting', 'cards', 'festival'],
      price: 180,
      platform: 'Meesho',
      url: 'https://www.meesho.com/search?q=greeting%20cards&searchType=manual&searchIdentifier=text_search',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Greeting+Cards'
    },
    {
      id: 'trend-origami-art-2024',
      title: 'Framed Origami Art - Japanese Paper Folding',
      category: 'crafts',
      trendScore: 72,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Framed origami art pieces are trending as unique wall decor.',
      keywords: ['crafts', 'origami', 'art', 'japanese', 'paper folding'],
      price: 450,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=framed%20origami%20art',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Origami+Art'
    },
    {
      id: 'trend-resin-crafts-2024',
      title: 'Handmade Resin Keychains - Custom Designs',
      category: 'crafts',
      trendScore: 78,
      growthRate: 20,
      trendType: 'hot' as const,
      description: 'Custom resin keychains with embedded flowers and designs are very popular.',
      keywords: ['crafts', 'resin', 'keychains', 'custom', 'flowers'],
      price: 220,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handmade+resin+keychains',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Resin+Keychains'
    },
    {
      id: 'trend-clay-miniatures-2024',
      title: 'Polymer Clay Miniatures - Food Collection',
      category: 'crafts',
      trendScore: 75,
      growthRate: 18,
      trendType: 'rising' as const,
      description: 'Miniature food items made from polymer clay are popular collectibles.',
      keywords: ['crafts', 'clay', 'miniatures', 'polymer', 'food'],
      price: 320,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=polymer%20clay%20miniatures&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Clay+Miniatures'
    }
  ],
  weaving: [
    {
      id: 'trend-woven-baskets-2024',
      title: 'Handwoven Bamboo Baskets - Storage Solutions',
      category: 'weaving',
      trendScore: 76,
      growthRate: 17,
      trendType: 'rising' as const,
      description: 'Handwoven bamboo baskets are trending for eco-friendly storage solutions.',
      keywords: ['weaving', 'bamboo', 'baskets', 'storage', 'eco-friendly'],
      price: 580,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=handwoven+bamboo+baskets',
      imageUrl: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Bamboo+Baskets'
    },
    {
      id: 'trend-woven-placemats-2024',
      title: 'Jute Placemats - Handwoven Table Decor',
      category: 'weaving',
      trendScore: 71,
      growthRate: 14,
      trendType: 'stable' as const,
      description: 'Handwoven jute placemats are popular for sustainable dining table decor.',
      keywords: ['weaving', 'jute', 'placemats', 'table', 'sustainable'],
      price: 280,
      platform: 'Flipkart',
      url: 'https://www.flipkart.com/search?q=jute%20placemats%20handwoven&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off',
      imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Jute+Placemats'
    }
  ],
  embroidery: [
    {
      id: 'trend-embroidered-bags-2024',
      title: 'Hand Embroidered Tote Bags - Floral Patterns',
      category: 'embroidery',
      trendScore: 80,
      growthRate: 21,
      trendType: 'hot' as const,
      description: 'Hand embroidered tote bags with floral patterns are trending for everyday use.',
      keywords: ['embroidery', 'bags', 'tote', 'floral', 'patterns'],
      price: 650,
      platform: 'Etsy',
      url: 'https://www.etsy.com/in-en/search?q=hand%20embroidered%20tote%20bags',
      imageUrl: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Embroidered+Bags'
    },
    {
      id: 'trend-embroidered-wall-art-2024',
      title: 'Framed Embroidery Art - Modern Hoop Art',
      category: 'embroidery',
      trendScore: 74,
      growthRate: 16,
      trendType: 'rising' as const,
      description: 'Modern embroidery hoop art is popular for contemporary wall decor.',
      keywords: ['embroidery', 'wall art', 'hoop', 'modern', 'framed'],
      price: 480,
      platform: 'Amazon',
      url: 'https://www.amazon.in/s?k=embroidery+hoop+wall+art',
      imageUrl: 'https://via.placeholder.com/400x400/06b6d4/ffffff?text=Embroidery+Art'
    }
  ]
};

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 10000, // 10 seconds
  retryAttempts: 2,
  retryDelay: 1000, // 1 second
};

// API Endpoints
const ENDPOINTS = {
  trending: '/trending',
  trendSpotter: '/trend-spotter',
  viralProducts: '/viral-products',
  personalized: '/trending/personalized',
} as const;

/**
 * Enhanced fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries = API_CONFIG.retryAttempts
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && !controller.signal.aborted) {
      console.warn(`API request failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Check internet connectivity
 */
function checkConnectivity(): boolean {
  return navigator.onLine;
}

/**
 * Generate comprehensive mock data for fallback
 * Enhanced with data from trending services
 */
function generateMockTrendingData(config: MockDataConfig): {
  products: TrendingProduct[];
  insights: MarketInsight[];
} {
  // Try to use comprehensive trending mock data first
  const professionData = COMPREHENSIVE_MOCK_DATA[config.profession as keyof typeof COMPREHENSIVE_MOCK_DATA];
  
  if (professionData && professionData.length > 0) {
    // Use comprehensive mock data
    const selectedTrends = professionData.slice(0, config.productCount || 6);
    
    const products: TrendingProduct[] = selectedTrends.map((trend, index) => ({
      id: trend.id,
      title: trend.title,
      price: trend.price,
      rating: 4.0 + Math.random() * 1.0,
      reviewCount: Math.floor(50 + Math.random() * 500),
      platform: trend.platform,
      url: (trend as any).url || generateProductUrl(trend.platform, config.profession, index),
      imageUrl: trend.imageUrl,
      category: trend.category,
      trendType: trend.trendType,
      trendScore: trend.trendScore,
      growthRate: trend.growthRate,
      trendingReason: trend.description,
      isRealTime: false,
      lastUpdated: new Date(),
      keywords: trend.keywords
    }));

    // Generate one comprehensive insight to avoid duplicates
    const topProduct = products[0];
    const insights: MarketInsight[] = [
      {
        category: config.profession,
        opportunity: `${topProduct.title.split(' ').slice(0, 3).join(' ')} products are showing strong market interest. ${topProduct.trendingReason}`,
        recommendation: `Focus on creating ${config.profession} items similar to "${topProduct.title}". ${getActionableRecommendation(config.profession, 0)}`,
        confidence: 88, // High Opportunity - fixed to ensure uniqueness
        actionItems: generateActionItems(config.profession),
        competitionLevel: getCompetitionLevel(config.profession),
        marketSize: getMarketSize(config.profession),
        seasonality: getSeasonality(config.profession)
      }
    ];

    return { products, insights };
  }

  // Fallback to original simple mock data generation
  const { profession, productCount = 6, priceRange } = config;
  const professionInfo = PROFESSION_CATEGORIES[profession];
  const defaultPriceRange = DEFAULT_PRICE_RANGES[profession];
  const actualPriceRange = priceRange || defaultPriceRange;

  // Generate realistic product data
  const products: TrendingProduct[] = [];
  const platforms = ['Amazon', 'Flipkart', 'Etsy', 'Meesho', 'IndiaMart'];
  const trendTypes: Array<TrendingProduct['trendType']> = ['hot', 'rising', 'seasonal', 'stable'];
  
  for (let i = 0; i < productCount; i++) {
    const platform = platforms[i % platforms.length];
    const trendType = trendTypes[i % trendTypes.length];
    const basePrice = actualPriceRange.min + 
      Math.random() * (actualPriceRange.max - actualPriceRange.min);
    const price = Math.round(basePrice / 50) * 50; // Round to nearest 50

    products.push({
      id: `mock-${profession}-${i + 1}`,
      title: generateProductTitle(profession, i),
      price: price,
      rating: 3.8 + Math.random() * 1.2, // 3.8 to 5.0
      reviewCount: Math.floor(50 + Math.random() * 500),
      platform: platform,
      url: generateProductUrl(platform, profession, i),
      imageUrl: `/images/mock/${profession}-${i + 1}.jpg`,
      category: profession,
      trendType: trendType,
      trendScore: Math.floor(60 + Math.random() * 40), // 60 to 100
      growthRate: trendType === 'hot' ? 20 + Math.random() * 30 : 
                  trendType === 'rising' ? 10 + Math.random() * 20 :
                  trendType === 'seasonal' ? 5 + Math.random() * 15 : 
                  Math.random() * 10,
      trendingReason: generateTrendingReason(trendType, profession),
      isRealTime: false,
      lastUpdated: new Date(Date.now() - Math.random() * 3600000), // Within last hour
      keywords: generateKeywords(profession, i)
    });
  }

  // Generate market insights
  const insights: MarketInsight[] = [
    {
      category: profession,
      opportunity: generateMarketOpportunity(profession),
      recommendation: generateRecommendation(profession),
      confidence: 85, // High Opportunity - fixed to avoid duplicates
      actionItems: generateActionItems(profession),
      marketSize: getMarketSize(profession),
      competitionLevel: getCompetitionLevel(profession),
      seasonality: getSeasonality(profession)
    }
  ];

  return { products, insights };
}

/**
 * Generate realistic product titles
 */
function generateProductTitle(profession: ProfessionCategory, index: number): string {
  const templates = {
    pottery: [
      'Handmade Ceramic Bowl - Traditional Design',
      'Artisan Clay Vase with Natural Glaze',
      'Traditional Pottery Set - Kitchen Essentials',
      'Handcrafted Ceramic Planters',
      'Vintage Style Clay Dinnerware',
      'Rustic Ceramic Serving Bowls'
    ],
    woodworking: [
      'Handcrafted Wooden Cutting Board',
      'Artisan Wood Jewelry Box',
      'Traditional Wooden Spice Rack',
      'Handmade Oak Photo Frame',
      'Rustic Wood Wall Shelf',
      'Custom Wooden Kitchen Utensils'
    ],
    jewelry: [
      'Handmade Silver Earrings - Traditional Design',
      'Artisan Gold-Plated Necklace',
      'Traditional Kundan Jewelry Set',
      'Handcrafted Beaded Bracelet',
      'Vintage Style Ring Collection',
      'Ethnic Silver Pendant'
    ],
    textiles: [
      'Handwoven Cotton Fabric - Traditional Print',
      'Artisan Block Print Bedsheet',
      'Traditional Embroidered Cushion Cover',
      'Handmade Silk Scarf',
      'Ethnic Print Table Runner',
      'Handloom Cotton Saree'
    ],
    // Add more profession-specific templates as needed
  };

  const professionTemplates = templates[profession as keyof typeof templates] || [
    `Handmade ${profession} Product - Premium Quality`,
    `Traditional ${profession} Set - Artisan Made`,
    `Authentic ${profession} Collection`,
    `Handcrafted ${profession} Items`,
    `Artisan ${profession} Accessories`,
    `Custom ${profession} Products`
  ];

  return professionTemplates[index % professionTemplates.length];
}

/**
 * Generate realistic product URLs
 */
function generateProductUrl(platform: string, profession: string, index: number): string {
  const baseUrls = {
    Amazon: 'https://www.amazon.in',
    Flipkart: 'https://www.flipkart.com',
    Etsy: 'https://www.etsy.com/in-en',
    Meesho: 'https://www.meesho.com',
    IndiaMart: 'https://www.indiamart.com'
  };

  // Generate more realistic product IDs
  const productIds = {
    Amazon: `B0${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    Flipkart: `itm${Math.random().toString(36).substring(2, 12)}`,
    Etsy: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    Meesho: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    IndiaMart: `${Math.floor(Math.random() * 90000000) + 10000000}`
  };

  const baseUrl = baseUrls[platform as keyof typeof baseUrls] || 'https://example.com';
  const productId = productIds[platform as keyof typeof productIds] || `${profession}-${index + 1}`;
  
  // Generate platform-specific search URL patterns
  const searchTerm = `handmade%20${profession}`;
  
  switch (platform) {
    case 'Amazon':
      return `${baseUrl}/s?k=${searchTerm}`;
    case 'Flipkart':
      return `${baseUrl}/search?q=${searchTerm}&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off`;
    case 'Etsy':
      return `${baseUrl}/search?q=${searchTerm.replace(/%20/g, '%20')}`;
    case 'Meesho':
      return `${baseUrl}/search?q=${searchTerm.replace(/%20/g, '%20')}&searchType=manual&searchIdentifier=text_search`;
    case 'IndiaMart':
      return `${baseUrl}/search.mp?ss=${searchTerm}`;
    default:
      return `${baseUrl}/search?q=${searchTerm}`;
  }
}

/**
 * Generate trending reasons based on trend type
 */
function generateTrendingReason(trendType: TrendingProduct['trendType'], profession: string): string {
  const reasons = {
    hot: [
      `Viral on social media - high demand for authentic ${profession}`,
      `Featured by influencers - sudden spike in ${profession} interest`,
      `Festival season boost - traditional ${profession} in high demand`
    ],
    rising: [
      `Growing interest in handmade ${profession}`,
      `Increasing appreciation for traditional ${profession} crafts`,
      `Rising demand for sustainable ${profession} products`
    ],
    seasonal: [
      `Festival season favorite - ${profession} gifts trending`,
      `Wedding season demand for traditional ${profession}`,
      `Holiday gifting trend for handmade ${profession}`
    ],
    stable: [
      `Consistent demand for quality ${profession}`,
      `Steady market for authentic ${profession} products`,
      `Regular customer base for traditional ${profession}`
    ],
    cooling: [
      `Seasonal decline in ${profession} demand`,
      `Market saturation for this ${profession} style`,
      `Trend shifting to different ${profession} designs`
    ]
  };

  const typeReasons = reasons[trendType];
  return typeReasons[Math.floor(Math.random() * typeReasons.length)];
}

/**
 * Generate relevant keywords
 */
function generateKeywords(profession: ProfessionCategory, index: number): string[] {
  const baseKeywords = PROFESSION_CATEGORIES[profession]?.keywords || [];
  const additionalKeywords = ['handmade', 'traditional', 'artisan', 'authentic', 'craft'];
  
  return [...baseKeywords, ...additionalKeywords.slice(0, 2)];
}

/**
 * Generate market opportunity text
 */
function generateMarketOpportunity(profession: ProfessionCategory): string {
  const opportunities = {
    pottery: 'High demand for authentic handmade pottery products, especially during festival seasons',
    woodworking: 'Growing market for sustainable wooden products and custom furniture',
    jewelry: 'Strong demand for traditional and contemporary handmade jewelry',
    textiles: 'Increasing interest in handloom and traditional textile products',
  };

  return opportunities[profession as keyof typeof opportunities] || 
    `Growing market opportunity for authentic ${profession} products`;
}

/**
 * Generate recommendations
 */
function generateRecommendation(profession: ProfessionCategory): string {
  const recommendations = {
    pottery: 'Focus on traditional glazing techniques and emphasize handmade authenticity',
    woodworking: 'Highlight sustainable materials and custom craftsmanship',
    jewelry: 'Combine traditional designs with contemporary appeal',
    textiles: 'Emphasize handloom techniques and natural dyes',
  };

  return recommendations[profession as keyof typeof recommendations] || 
    `Focus on traditional techniques and quality materials for ${profession}`;
}

/**
 * Generate actionable items
 */
function generateActionItems(profession: ProfessionCategory): string[] {
  const baseItems = [
    'Highlight traditional craftsmanship in product descriptions',
    'Use high-quality product photography',
    'Emphasize authenticity and handmade nature',
    'Price competitively within market range'
  ];

  const professionSpecific = {
    pottery: ['Showcase glazing process', 'Highlight clay quality'],
    woodworking: ['Show wood grain details', 'Mention wood type and source'],
    jewelry: ['Display craftsmanship close-ups', 'Mention metal purity'],
    textiles: ['Show weaving process', 'Highlight natural dyes'],
  };

  const specific = professionSpecific[profession as keyof typeof professionSpecific] || [];
  return [...baseItems.slice(0, 3), ...specific];
}

/**
 * Get actionable recommendation based on profession and index
 */
function getActionableRecommendation(profession: ProfessionCategory, index: number): string {
  const recommendations = {
    pottery: [
      'Consider creating seasonal variations for festivals',
      'Focus on natural glazing techniques for premium pricing',
      'Create matching sets for higher sales value',
      'Emphasize traditional pottery methods in marketing'
    ],
    woodworking: [
      'Highlight the wood type and source in descriptions',
      'Offer custom engraving options for personalization',
      'Create functional items that solve everyday problems',
      'Show the crafting process in product photos'
    ],
    jewelry: [
      'Mention metal purity and traditional techniques',
      'Create matching sets for coordinated looks',
      'Focus on lightweight designs for daily wear',
      'Offer customization for special occasions'
    ],
    textiles: [
      'Emphasize handloom process and natural dyes',
      'Create seasonal collections for festivals',
      'Highlight regional weaving traditions',
      'Offer fabric care instructions for longevity'
    ],
    handmade: [
      'Tell the story behind each handmade piece',
      'Focus on unique, one-of-a-kind aspects',
      'Create gift-ready packaging and presentation',
      'Emphasize sustainable and eco-friendly materials'
    ]
  };

  const professionRecs = recommendations[profession as keyof typeof recommendations] || recommendations.handmade;
  return professionRecs[index % professionRecs.length];
}

/**
 * Get market size estimate
 */
function getMarketSize(profession: ProfessionCategory): string {
  const sizes = {
    pottery: 'Medium (₹25L+ annually)',
    woodworking: 'Large (₹50L+ annually)',
    jewelry: 'Very Large (₹100L+ annually)',
    textiles: 'Large (₹75L+ annually)',
  };

  return sizes[profession as keyof typeof sizes] || 'Medium (₹20L+ annually)';
}

/**
 * Get competition level
 */
function getCompetitionLevel(profession: ProfessionCategory): 'low' | 'medium' | 'high' {
  const levels = {
    pottery: 'medium' as const,
    woodworking: 'medium' as const,
    jewelry: 'high' as const,
    textiles: 'medium' as const,
  };

  return levels[profession as keyof typeof levels] || 'medium';
}

/**
 * Get seasonality information
 */
function getSeasonality(profession: ProfessionCategory): string {
  const seasonality = {
    pottery: 'Peak during Diwali and wedding seasons',
    woodworking: 'Steady year-round with slight increase in winter',
    jewelry: 'High during festivals and wedding seasons',
    textiles: 'Peak during festival and wedding seasons',
  };

  return seasonality[profession as keyof typeof seasonality] || 'Steady demand year-round';
}

/**
 * Main API service class
 */
export class SimplifiedTrendAPI {
  private static instance: SimplifiedTrendAPI;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  static getInstance(): SimplifiedTrendAPI {
    if (!SimplifiedTrendAPI.instance) {
      SimplifiedTrendAPI.instance = new SimplifiedTrendAPI();
    }
    return SimplifiedTrendAPI.instance;
  }

  /**
   * Get trending data with API fallback
   */
  async getTrendingData(
    profession: ProfessionCategory,
    options: {
      maxProducts?: number;
      includeInsights?: boolean;
      forceRefresh?: boolean;
    } = {}
  ): Promise<TrendingDataResponse> {
    const { maxProducts = 6, includeInsights = true, forceRefresh = false } = options;
    const cacheKey = `trending-${profession}-${maxProducts}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: {
            products: cached.products,
            insights: cached.insights,
            metadata: {
              totalCount: cached.products.length,
              lastUpdated: new Date(cached.timestamp),
              dataSource: 'cache',
              profession
            }
          }
        };
      }
    }

    // Check connectivity
    const isOnline = checkConnectivity();
    
    if (isOnline) {
      try {
        // Try API first
        const apiData = await this.fetchFromAPI(profession, maxProducts, includeInsights);
        
        // Cache successful API response
        this.setCache(cacheKey, apiData);
        
        return {
          success: true,
          data: {
            products: apiData.products,
            insights: apiData.insights,
            metadata: {
              totalCount: apiData.products.length,
              lastUpdated: new Date(),
              dataSource: 'api',
              profession
            }
          }
        };
      } catch (error) {
        console.warn('API request failed, falling back to mock data:', error);
      }
    }

    // Fallback to mock data
    const mockData = this.generateMockData(profession, maxProducts, includeInsights);
    
    // Cache mock data with shorter duration
    this.setCache(cacheKey, mockData, this.CACHE_DURATION / 2);
    
    return {
      success: true,
      data: {
        products: mockData.products,
        insights: mockData.insights,
        metadata: {
          totalCount: mockData.products.length,
          lastUpdated: new Date(),
          dataSource: 'mock',
          profession
        }
      }
    };
  }

  /**
   * Fetch data from API endpoints
   */
  private async fetchFromAPI(
    profession: ProfessionCategory,
    maxProducts: number,
    includeInsights: boolean
  ): Promise<{ products: TrendingProduct[]; insights: MarketInsight[] }> {
    // Try Etsy API first if configured
    if (etsyAPI.isConfigured()) {
      try {
        console.log(`Fetching trending ${profession} products from Etsy API...`);
        const etsyProducts = await etsyAPI.getTrendingProducts(profession, maxProducts);
        
        if (etsyProducts.length > 0) {
          // Generate insights based on Etsy data
          const insights = includeInsights ? this.generateInsightsFromProducts(etsyProducts, profession) : [];
          
          console.log(`Successfully fetched ${etsyProducts.length} products from Etsy API`);
          return {
            products: etsyProducts,
            insights
          };
        }
      } catch (error) {
        console.warn('Etsy API request failed, trying fallback APIs:', error);
      }
    }

    // Fallback to other APIs (trend-spotter endpoint)
    try {
      const url = `${API_CONFIG.baseUrl}${ENDPOINTS.trendSpotter}`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'anonymous',
          profession,
          maxProducts,
          includeInsights
        })
      });

      const data = await response.json();

      if (data.success && data.workflow?.results?.trends) {
        // Convert trend-spotter API response to our format
        const products = data.workflow.results.trends.slice(0, maxProducts).map((trend: any) => ({
          id: trend.id || `api-${Date.now()}-${Math.random()}`,
          title: trend.title || 'Trending Product',
          price: trend.price || 500,
          rating: trend.rating || 4.0,
          reviewCount: trend.reviewCount || 100,
          platform: trend.platform || 'Various',
          url: trend.url || '#',
          imageUrl: trend.imageUrl || '',
          category: profession,
          trendType: trend.trendType || 'rising',
          trendScore: trend.trendScore || 70,
          growthRate: trend.growthRate || 15,
          trendingReason: trend.description || `Trending ${profession} product`,
          isRealTime: true,
          lastUpdated: new Date(),
          keywords: trend.keywords || []
        }));

        const insights = includeInsights ? this.generateInsightsFromProducts(products, profession) : [];

        return { products, insights };
      }
    } catch (error) {
      console.warn('Trend-spotter API request failed:', error);
    }

    // If all APIs fail, throw error to trigger mock data fallback
    throw new Error('All API endpoints failed');
  }

  /**
   * Generate insights from real product data
   */
  private generateInsightsFromProducts(
    products: TrendingProduct[],
    profession: ProfessionCategory
  ): MarketInsight[] {
    if (products.length === 0) return [];

    const topProduct = products[0];
    const avgTrendScore = Math.round(products.reduce((sum, p) => sum + p.trendScore, 0) / products.length);
    const avgPrice = Math.round(products.reduce((sum, p) => sum + (typeof p.price === 'number' ? p.price : 500), 0) / products.length);

    return [{
      category: profession,
      opportunity: `${topProduct.title.split(' ').slice(0, 3).join(' ')} products are showing ${avgTrendScore}% market interest on Etsy. Real customer data shows strong demand for authentic ${profession} items.`,
      recommendation: `Based on current Etsy trends, focus on creating ${profession} items similar to "${topProduct.title}". Average successful price point is ₹${avgPrice}.`,
      confidence: avgTrendScore,
      actionItems: [
        `Study successful Etsy listings in ${profession} category`,
        `Price your items around ₹${avgPrice} based on current market data`,
        `Use keywords like: ${products[0].keywords?.slice(0, 3).join(', ')}`,
        `Focus on high-quality product photography like trending items`
      ],
      competitionLevel: this.assessCompetitionLevel(products.length),
      marketSize: `Active (${products.length}+ trending items on Etsy)`,
      seasonality: 'Based on real-time Etsy marketplace data'
    }];
  }

  /**
   * Assess competition level based on number of trending products
   */
  private assessCompetitionLevel(productCount: number): 'low' | 'medium' | 'high' {
    if (productCount < 3) return 'low';
    if (productCount < 8) return 'medium';
    return 'high';
  }

  /**
   * Generate mock data
   */
  private generateMockData(
    profession: ProfessionCategory,
    maxProducts: number,
    includeInsights: boolean
  ): { products: TrendingProduct[]; insights: MarketInsight[] } {
    const config: MockDataConfig = {
      profession,
      productCount: maxProducts,
      includeInsights,
      includeImages: true
    };

    const mockData = generateMockTrendingData(config);
    
    // Respect includeInsights flag
    return {
      products: mockData.products,
      insights: includeInsights ? mockData.insights : []
    };
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, duration = this.CACHE_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    setTimeout(() => {
      this.cache.delete(key);
    }, duration);
  }

  /**
   * Get connectivity status
   */
  getConnectivityStatus(): ConnectivityStatus {
    return {
      isOnline: checkConnectivity(),
      lastUpdated: new Date(),
      dataSource: checkConnectivity() ? 'api' : 'mock'
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Preload data for better performance
   */
  async preloadData(professions: ProfessionCategory[]): Promise<void> {
    const promises = professions.map(profession => 
      this.getTrendingData(profession, { maxProducts: 4, includeInsights: false })
    );

    try {
      await Promise.allSettled(promises);
      console.log('Data preloaded for professions:', professions);
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }
}

// Export singleton instance
export const trendAPI = SimplifiedTrendAPI.getInstance();

// Export utility functions for testing
export {
  generateMockTrendingData,
  checkConnectivity,
  fetchWithRetry
};