/**
 * Indian Arts and Crafts Knowledge Data
 * Curated information about traditional Indian crafts
 */

import { KnowledgeDocument } from '../types/knowledge-base';

export const craftsKnowledge: Omit<KnowledgeDocument, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>[] = [
  // Pottery Knowledge
  {
    content: `Pottery is one of India's oldest crafts, dating back to the Indus Valley Civilization (3300-1300 BCE). 
Traditional pottery techniques vary by region, with each area developing unique styles and methods.

History: Indian pottery has evolved over 5000 years, with distinct regional traditions. The craft was essential for daily life, creating vessels for cooking, storage, and religious ceremonies.

Regions: Major pottery centers include Khurja (Uttar Pradesh), Jaipur (Rajasthan), Manipur, Assam, and Tamil Nadu.

Techniques: Hand-building, wheel throwing, coiling, slab construction, terracotta work, blue pottery, black pottery.

Materials: Clay (earthenware, stoneware), natural pigments, glazes, wood for firing.

Products: Pots, vases, decorative items, tiles, figurines, kitchenware, religious idols.

Market Demand: High demand for decorative pottery and traditional terracotta items. Growing interest in sustainable, handmade products.`,
    metadata: {
      category: 'craft_info',
      craftType: 'pottery',
      language: 'en',
      source: 'Traditional Crafts Database',
      region: 'Pan-India',
      tags: ['pottery', 'ceramics', 'terracotta', 'traditional'],
      lastUpdated: new Date()
    }
  },

  // Weaving Knowledge
  {
    content: `Weaving is a fundamental textile craft in India, producing some of the world's finest fabrics including silk, cotton, and wool textiles.

History: Indian weaving traditions date back over 4000 years. Each region developed distinctive weaving styles, patterns, and techniques that reflect local culture and resources.

Regions: Varanasi (Banarasi silk), Kanchipuram (silk sarees), Chanderi (Madhya Pradesh), Pochampally (Telangana), Assam (Muga silk), Kashmir (Pashmina).

Techniques: Handloom weaving, jacquard weaving, ikat, brocade, jamdani, patola, dhurrie weaving.

Materials: Cotton, silk, wool, jute, natural dyes, metallic threads (zari).

Products: Sarees, dress materials, shawls, stoles, home furnishings, carpets, durries.

Market Demand: Strong domestic and international demand. Handloom textiles are valued for quality and sustainability. Price range: ₹2,000 - ₹50,000+ depending on complexity.`,
    metadata: {
      category: 'craft_info',
      craftType: 'weaving',
      language: 'en',
      source: 'Handloom Council of India',
      region: 'Pan-India',
      tags: ['weaving', 'textiles', 'handloom', 'silk', 'cotton'],
      lastUpdated: new Date()
    }
  },

  // Metalwork Knowledge
  {
    content: `Indian metalwork encompasses a wide range of techniques including casting, forging, engraving, and inlay work, producing both functional and decorative items.

History: Metal craftsmanship in India dates back to the Bronze Age. Indian metallurgists were renowned for their skill, creating the famous Iron Pillar of Delhi and intricate bronze sculptures.

Regions: Moradabad (brass work), Thanjavur (bronze), Bidriware (Karnataka), Dhokra (tribal regions), Jaipur (enameling).

Techniques: Lost-wax casting (Dhokra), repoussé, chasing, engraving, damascening, enameling (meenakari), inlay work.

Materials: Brass, bronze, copper, silver, gold, zinc alloy, precious stones for inlay.

Products: Utensils, decorative items, jewelry, sculptures, religious artifacts, furniture fittings.

Market Demand: Growing demand for handcrafted metal items. Export market strong. Price range: ₹500 - ₹100,000+ based on size and intricacy.`,
    metadata: {
      category: 'craft_info',
      craftType: 'metalwork',
      language: 'en',
      source: 'Metal Crafts Association',
      region: 'Pan-India',
      tags: ['metalwork', 'brass', 'bronze', 'dhokra', 'bidriware'],
      lastUpdated: new Date()
    }
  },

  // Woodcarving Knowledge
  {
    content: `Woodcarving is a traditional Indian craft that creates intricate designs on furniture, architectural elements, and decorative objects.

History: Indian woodcarving has ancient roots, with evidence in temple architecture and royal palaces. Each region developed unique carving styles reflecting local aesthetics.

Regions: Saharanpur (Uttar Pradesh), Kashmir, Kerala, Rajasthan, Karnataka (Mysore), Tamil Nadu.

Techniques: Relief carving, chip carving, pierced carving, inlay work, turning, fretwork.

Materials: Teak, rosewood, sandalwood, sheesham, walnut, mango wood, ebony.

Products: Furniture, doors, windows, screens, decorative panels, sculptures, toys, boxes.

Market Demand: High demand for carved furniture and decorative items. Growing interest in sustainable wood products. Price range: ₹1,000 - ₹500,000+ depending on size and detail.`,
    metadata: {
      category: 'craft_info',
      craftType: 'woodcarving',
      language: 'en',
      source: 'Woodcraft Federation',
      region: 'Pan-India',
      tags: ['woodcarving', 'furniture', 'sculpture', 'traditional'],
      lastUpdated: new Date()
    }
  },

  // Embroidery Technique
  {
    content: `Embroidery Technique: Zardozi (Metal Thread Embroidery)

Description: Zardozi is a traditional form of embroidery using gold and silver threads, often combined with pearls, beads, and precious stones.

Difficulty: Advanced - Requires years of practice and steady hands.

Steps:
Step 1: Design transfer - Trace the pattern onto fabric using carbon paper or pouncing technique
Step 2: Frame setup - Stretch fabric tightly on an embroidery frame (adda)
Step 3: Thread preparation - Prepare metallic threads (zari) and attach to needle
Step 4: Base stitching - Create foundation with running stitches following the design
Step 5: Metal thread work - Couch down metallic threads using fine silk thread
Step 6: Embellishment - Add sequins, beads, and stones as per design
Step 7: Finishing - Secure all threads on the reverse side and remove from frame

Tools: Embroidery frame (adda), aari needle, scissors, thimble, tracing tools.

Materials: Silk or velvet fabric, metallic threads (gold/silver zari), silk thread, sequins, beads, stones.

Tips: Work in good lighting, maintain even tension, secure metallic threads properly to prevent unraveling.

Common Mistakes: Pulling threads too tight, uneven spacing, not securing thread ends properly.

Time: 50-200 hours depending on design complexity.`,
    metadata: {
      category: 'technique',
      craftType: 'embroidery',
      language: 'en',
      source: 'Embroidery Masters Guild',
      region: 'North India',
      tags: ['zardozi', 'embroidery', 'metallic thread', 'technique'],
      lastUpdated: new Date()
    }
  },

  // Pottery Technique
  {
    content: `Pottery Technique: Wheel Throwing

Description: Wheel throwing is the process of shaping clay on a rotating potter's wheel to create symmetrical vessels.

Difficulty: Intermediate - Requires practice to master centering and shaping.

Steps:
Step 1: Clay preparation - Wedge clay thoroughly to remove air bubbles (15-20 minutes)
Step 2: Centering - Place clay on wheel center and apply pressure while wheel spins to center the clay
Step 3: Opening - Press thumbs into center to create opening while maintaining centered position
Step 4: Pulling walls - Use fingers to pull clay upward, creating vessel walls with even thickness
Step 5: Shaping - Form desired shape using internal and external pressure
Step 6: Trimming - Remove excess clay from base when leather-hard
Step 7: Drying - Allow piece to dry slowly to prevent cracking
Step 8: Firing - Bisque fire at 900-1000°C, then glaze fire at 1200-1300°C

Tools: Potter's wheel, wire cutter, ribs, sponges, trimming tools, calipers.

Materials: Clay (earthenware or stoneware), water, glazes, kiln.

Tips: Keep hands wet, maintain steady wheel speed, practice centering daily, work with consistent clay consistency.

Common Mistakes: Off-center clay, uneven wall thickness, working with clay that's too wet or dry, rushing the process.

Time: 30 minutes to 2 hours per piece, plus drying and firing time.`,
    metadata: {
      category: 'technique',
      craftType: 'pottery',
      language: 'en',
      source: 'Potter's Association of India',
      region: 'Pan-India',
      tags: ['pottery', 'wheel throwing', 'ceramics', 'technique'],
      lastUpdated: new Date()
    }
  },

  // Material Information - Clay
  {
    content: `Material: Clay for Pottery

Description: Clay is a natural material composed of fine-grained minerals that becomes plastic when wet and hardens when fired.

Types:
- Earthenware: Low-fire clay, porous, suitable for decorative items. Temperature: 900-1100°C
- Stoneware: Mid to high-fire clay, durable, non-porous when fired. Temperature: 1200-1300°C
- Terracotta: Red earthenware clay, traditional Indian pottery material
- Porcelain: High-fire white clay, translucent when thin

Sources: Natural clay deposits in riverbeds, mines. Major sources: Khurja (UP), Jaipur (Rajasthan), Manipur.

Cost: ₹20-100 per kg depending on type and quality. Bulk purchases reduce cost.

Quality Indicators: Plasticity, color consistency, firing temperature, shrinkage rate, absence of impurities.

Sustainability: Natural and renewable resource. Eco-friendly when sourced responsibly. Firing requires energy consideration.

Storage: Keep clay moist in airtight containers. Can be reclaimed and reused indefinitely.`,
    metadata: {
      category: 'material',
      craftType: 'pottery',
      language: 'en',
      source: 'Materials Science Institute',
      region: 'Pan-India',
      tags: ['clay', 'pottery', 'ceramics', 'material'],
      lastUpdated: new Date()
    }
  },

  // Market Insights - Pottery
  {
    content: `Market Insights: Pottery and Ceramics

Current Demand: High and growing. Urban consumers seeking handmade, sustainable home decor. Export market expanding.

Average Pricing:
- Small decorative items: ₹200 - ₹1,000
- Medium vessels and planters: ₹1,000 - ₹5,000
- Large decorative pieces: ₹5,000 - ₹25,000
- Custom commissioned work: ₹10,000 - ₹100,000+

Top Buyer Regions: Delhi NCR, Mumbai, Bangalore, Pune, Hyderabad. International: USA, Europe, Middle East.

Seasonal Trends:
- Diwali season (Oct-Nov): 40% increase in demand for diyas and decorative items
- Wedding season (Nov-Feb): High demand for gift items and decor
- Summer (Mar-May): Increased demand for planters and garden pottery
- Monsoon (Jun-Sep): Moderate demand, focus on indoor items

Growth Rate: 15-20% annual growth in handmade pottery sector. E-commerce driving accessibility.

Competitor Analysis:
- Mass-produced ceramics: Lower price (₹100-500) but lower quality
- Imported pottery: Higher price (₹2,000-10,000) but lacks cultural authenticity
- Handmade Indian pottery: Premium positioning, authentic, sustainable

Opportunities: Online marketplaces, export, workshops and classes, custom corporate gifts, sustainable packaging alternatives.`,
    metadata: {
      category: 'market_insights',
      craftType: 'pottery',
      language: 'en',
      source: 'Craft Market Research 2024',
      region: 'Pan-India',
      tags: ['market', 'pricing', 'demand', 'pottery'],
      lastUpdated: new Date()
    }
  },

  // Market Insights - Textiles
  {
    content: `Market Insights: Handloom Textiles

Current Demand: Very high. Growing appreciation for handloom products. Government support through initiatives.

Average Pricing:
- Cotton sarees: ₹2,000 - ₹15,000
- Silk sarees: ₹10,000 - ₹100,000+
- Dress materials: ₹1,500 - ₹8,000
- Stoles and dupattas: ₹1,000 - ₹10,000
- Home furnishings: ₹500 - ₹5,000 per piece

Top Buyer Regions: All major Indian cities. Strong export to USA, UK, Europe, Australia, Middle East.

Seasonal Trends:
- Wedding season (Nov-Feb): Peak demand for silk sarees and dress materials
- Festival season (Aug-Oct): High demand across all categories
- Summer (Mar-May): Cotton textiles in demand
- Year-round: Steady demand for home furnishings

Growth Rate: 12-15% annual growth. E-commerce platforms expanding reach significantly.

Competitor Analysis:
- Power loom textiles: 50-70% cheaper but lower quality and uniqueness
- Imported textiles: Variable pricing, lacks Indian authenticity
- Handloom: Premium quality, unique designs, sustainable, cultural value

Opportunities: Online sales, international markets, fashion collaborations, sustainable fashion movement, government procurement.`,
    metadata: {
      category: 'market_insights',
      craftType: 'weaving',
      language: 'en',
      source: 'Handloom Market Analysis 2024',
      region: 'Pan-India',
      tags: ['market', 'textiles', 'handloom', 'pricing'],
      lastUpdated: new Date()
    }
  },

  // Pricing Guide - Jewelry
  {
    content: `Pricing Guide: Handcrafted Jewelry

Factors Affecting Price:
- Material cost (silver, gold, gemstones)
- Labor hours and skill level
- Design complexity
- Brand reputation
- Market demand

Pricing Formula: Material Cost + (Labor Hours × Hourly Rate) + Overhead (20-30%) + Profit Margin (30-50%)

Average Hourly Rates:
- Beginner artisan: ₹150-300/hour
- Intermediate artisan: ₹300-600/hour
- Master artisan: ₹600-1,500/hour

Price Ranges by Category:
- Simple silver earrings: ₹800 - ₹2,500
- Silver necklaces: ₹2,000 - ₹15,000
- Gold-plated jewelry: ₹1,500 - ₹8,000
- Gemstone jewelry: ₹3,000 - ₹50,000+
- Bridal sets: ₹25,000 - ₹500,000+

Market Positioning:
- Budget segment: ₹500-2,000 (fashion jewelry)
- Mid-range: ₹2,000-15,000 (quality handcrafted)
- Premium: ₹15,000-100,000+ (designer, precious materials)

Tips: Research competitor pricing, consider target market, factor in all costs, don't undervalue handwork, offer range of price points.`,
    metadata: {
      category: 'pricing',
      craftType: 'jewelry',
      language: 'en',
      source: 'Jewelry Artisans Association',
      region: 'Pan-India',
      tags: ['pricing', 'jewelry', 'business', 'guide'],
      lastUpdated: new Date()
    }
  }
];


// Hindi Content - Pottery
export const hindiCraftsKnowledge: Omit<KnowledgeDocument, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>[] = [
  {
    content: `कुम्हारी भारत की सबसे पुरानी कलाओं में से एक है, जो सिंधु घाटी सभ्यता (3300-1300 ईसा पूर्व) से चली आ रही है।

इतिहास: भारतीय कुम्हारी 5000 वर्षों से विकसित हुई है। यह दैनिक जीवन के लिए आवश्यक थी - खाना पकाने, भंडारण और धार्मिक समारोहों के लिए बर्तन बनाने में।

क्षेत्र: प्रमुख कुम्हारी केंद्र - खुर्जा (उत्तर प्रदेश), जयपुर (राजस्थान), मणिपुर, असम, तमिलनाडु।

तकनीक: हाथ से बनाना, चाक पर बनाना, मिट्टी की कुंडली, टेराकोटा काम, नीली मिट्टी के बर्तन, काली मिट्टी के बर्तन।

सामग्री: मिट्टी (मिट्टी के बर्तन, पत्थर के बर्तन), प्राकृतिक रंग, चमक, जलाने के लिए लकड़ी।

उत्पाद: बर्तन, फूलदान, सजावटी वस्तुएं, टाइलें, मूर्तियां, रसोई के बर्तन, धार्मिक मूर्तियां।

बाजार की मांग: सजावटी मिट्टी के बर्तनों और पारंपरिक टेराकोटा वस्तुओं की उच्च मांग। टिकाऊ, हस्तनिर्मित उत्पादों में बढ़ती रुचि।`,
    metadata: {
      category: 'craft_info',
      craftType: 'pottery',
      language: 'hi',
      source: 'पारंपरिक शिल्प डेटाबेस',
      region: 'Pan-India',
      tags: ['कुम्हारी', 'मिट्टी के बर्तन', 'टेराकोटा', 'पारंपरिक'],
      lastUpdated: new Date()
    }
  },

  {
    content: `बुनाई तकनीक: हथकरघा बुनाई

विवरण: हथकरघा पर हाथ से कपड़ा बुनने की पारंपरिक तकनीक।

कठिनाई स्तर: मध्यम - अभ्यास की आवश्यकता है।

चरण:
चरण 1: धागा तैयारी - धागों को रंगना और सुखाना
चरण 2: ताना तैयार करना - करघे पर धागे लगाना
चरण 3: बाना तैयार करना - बुनाई के लिए धागे तैयार करना
चरण 4: बुनाई - करघे पर कपड़ा बुनना
चरण 5: डिजाइन बनाना - पैटर्न के अनुसार रंगीन धागे डालना
चरण 6: फिनिशिंग - कपड़े को करघे से उतारना और किनारे सिलना

औजार: हथकरघा, शटल, रीड, हेडल।

सामग्री: सूती धागा, रेशमी धागा, ऊनी धागा, प्राकृतिक रंग।

सुझाव: धागे का तनाव समान रखें, नियमित अभ्यास करें, पैटर्न को ध्यान से फॉलो करें।

सामान्य गलतियां: असमान तनाव, गलत पैटर्न, धागे का टूटना।

समय: साड़ी बुनने में 7-15 दिन लगते हैं।`,
    metadata: {
      category: 'technique',
      craftType: 'weaving',
      language: 'hi',
      source: 'हथकरघा परिषद',
      region: 'Pan-India',
      tags: ['बुनाई', 'हथकरघा', 'तकनीक'],
      lastUpdated: new Date()
    }
  },

  {
    content: `बाजार जानकारी: हस्तशिल्प उत्पाद

वर्तमान मांग: उच्च और बढ़ती हुई। शहरी उपभोक्ता हस्तनिर्मित, टिकाऊ घर की सजावट की तलाश में हैं।

औसत मूल्य:
- छोटी सजावटी वस्तुएं: ₹200 - ₹1,000
- मध्यम आकार के बर्तन: ₹1,000 - ₹5,000
- बड़ी सजावटी वस्तुएं: ₹5,000 - ₹25,000
- कस्टम काम: ₹10,000 - ₹1,00,000+

प्रमुख खरीदार क्षेत्र: दिल्ली एनसीआर, मुंबई, बैंगलोर, पुणे, हैदराबाद। अंतर्राष्ट्रीय: अमेरिका, यूरोप, मध्य पूर्व।

मौसमी रुझान:
- दिवाली सीजन (अक्टूबर-नवंबर): दीयों और सजावटी वस्तुओं की मांग में 40% वृद्धि
- शादी का सीजन (नवंबर-फरवरी): उपहार वस्तुओं और सजावट की उच्च मांग
- गर्मी (मार्च-मई): गमलों और बगीचे की मिट्टी के बर्तनों की बढ़ी हुई मांग

विकास दर: हस्तनिर्मित शिल्प क्षेत्र में 15-20% वार्षिक वृद्धि।

अवसर: ऑनलाइन बाजार, निर्यात, कार्यशालाएं और कक्षाएं, कस्टम कॉर्पोरेट उपहार।`,
    metadata: {
      category: 'market_insights',
      craftType: 'handicrafts',
      language: 'hi',
      source: 'शिल्प बाजार अनुसंधान 2024',
      region: 'Pan-India',
      tags: ['बाजार', 'मूल्य निर्धारण', 'मांग'],
      lastUpdated: new Date()
    }
  }
];

// Combine all knowledge
export const allKnowledgeData = [...craftsKnowledge, ...hindiCraftsKnowledge];
