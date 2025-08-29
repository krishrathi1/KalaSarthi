
import {
  LayoutDashboard,
  BotMessageSquare,
  Sparkles,
  Palette,
  Users,
  ShieldCheck,
  Package,
  ScrollText,
  IndianRupee,
  Calculator,
} from "lucide-react";

export const languages = {
    en: { name: 'English' },
    hi: { name: 'हिन्दी' },
    ta: { name: 'தமிழ்' },
    bn: { name: 'বাংলা' },
    te: { name: 'తెలుగు' },
    as: { name: 'Assamese' },
    bho: { name: 'Bhojpuri' },
    doi: { name: 'Dogri' },
    gu: { name: 'Gujarati' },
    kn: { name: 'Kannada' },
    ks: { name: 'Kashmiri' },
    kok: { name: 'Konkani' },
    mai: { name: 'Maithili' },
    ml: { name: 'Malayalam' },
    mr: { name: 'Marathi' },
    mni: { name: 'Meiteilon (Manipuri)' },
    ne: { name: 'Nepali' },
    or: { name: 'Odia' },
    pa: { name: 'Punjabi' },
    sa: { name: 'Sanskrit' },
    sat: { name: 'Santali' },
    sd: { name: 'Sindhi' },
    ur: { name: 'Urdu' },
};

export type LanguageCode = keyof typeof languages;

type Translations = {
  [key: string]: { [K in LanguageCode]?: string };
};

const translations: Translations = {
  // Dashboard
  greeting: {
    en: 'Namaste',
    hi: 'नमस्ते',
    ta: 'வணக்கம்',
    bn: 'নমস্কার',
    te: 'నమస్కారం',
  },
  welcome: {
    en: 'Welcome to KalaMitra. Here are your tools to empower your craft.',
    hi: 'कलामित्र में आपका स्वागत है। अपनी कला को सशक्त बनाने के लिए आपके उपकरण यहां दिए गए हैं।',
    ta: 'கலாமித்ராவுக்கு வரவேற்கிறோம். உங்கள் கைவினைக்கு அதிகாரம் அளிக்க உங்கள் கருவிகள் இங்கே உள்ளன.',
    bn: 'কলামিত্রতে আপনাকে স্বাগত। আপনার শিল্পকে শক্তিশালী করার জন্য আপনার সরঞ্জামগুলি এখানে রয়েছে।',
    te: 'కళామిత్రకు స్వాగతం. మీ కళను శక్తివంతం చేయడానికి మీ సాధనాలు ఇక్కడ ఉన్నాయి.',
  },
  open: {
    en: 'Open',
    hi: 'खोलें',
    ta: 'திற',
    bn: 'খুলুন',
    te: 'తెరవండి',
  },
  // Sidebar
  tagline: {
    en: 'From Kanchipuram to California, every artisan deserves a digital twin.',
    hi: 'कांचीपुरम से कैलिफ़ोर्निया तक, हर कारीगर एक डिजिटल ट्विन का हक़दार है।',
    ta: 'காஞ்சிபுரத்திலிருந்து கலிபோர்னியா வரை, ஒவ்வொரு கைவினைஞருக்கும் ஒரு டிஜிட்டல் இரட்டை தேவை.',
    bn: 'কাঞ্চিপুরম থেকে ক্যালিফোর্নিয়া পর্যন্ত, প্রত্যেক শিল্পী একটি ডিজিটাল টুইনের যোগ্য।',
    te: 'కాంచీపురం నుండి కాలిఫోర్నియా వరకు, ప్రతి కళాకారుడు ఒక డిజిటల్ ట్విన్‌కు అర్హుడు.',
  },
  // Features
  dashboard: {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    ta: 'டாஷ்போர்டு',
    bn: 'ড্যাশবোর্ড',
    te: 'డాష్‌బోర్డ్',
  },
  artisanBuddy: {
    en: 'Artisan Buddy',
    hi: 'कारीगर बडी',
    ta: 'கைவினைஞர் நண்பன்',
    bn: 'শিল্পী বন্ধু',
    te: 'ఆర్టిసాన్ బడ్డీ'
  },
  artisanBuddyDesc: {
    en: "A virtual agent copy of you that answers buyer queries 24/7 when you are offline.",
    hi: "आपकी एक वर्चुअल एजेंट कॉपी जो आपके ऑफ़लाइन होने पर 24/7 खरीदारों के सवालों का जवाब देती है।",
    ta: "நீங்கள் ஆஃப்லைனில் இருக்கும்போது 24/7 வாங்குபவர் கேள்விகளுக்கு பதிலளிக்கும் உங்களின் ஒரு மெய்நிகர் முகவர் நகல்.",
    bn: "আপনার একটি ভার্চুয়াল এজেন্ট অনুলিপি যা আপনি অফলাইনে থাকলে ক্রেতার প্রশ্নের 24/7 উত্তর দেয়।",
    te: "మీరు ఆఫ్‌లైన్‌లో ఉన్నప్పుడు 24/7 కొనుగోలుదారు ప్రశ్నలకు సమాధానమిచ్చే మీ వర్చువల్ ఏజెంట్ కాపీ.",
  },
  heritageStorytelling: {
    en: 'Heritage Storytelling',
    hi: 'विरासत की कहानी',
    ta: 'பாரம்பரியக் கதைசொல்லல்',
    bn: 'ঐতিহ্য গল্প বলা',
    te: 'వారసత్వ కథనం',
  },
  heritageStorytellingDesc: {
    en: "Transforms your photo + voice note into professional, multilingual listings and compelling stories.",
    hi: "आपकी तस्वीर + वॉयस नोट को पेशेवर, बहुभाषी लिस्टिंग औरน่าสนใจ कहानियों में बदल देता है।",
    ta: "உங்கள் புகைப்படம் + குரல் குறிப்பை தொழில்முறை, பன்மொழி பட்டியல்கள் மற்றும் அழுத்தமான கதைகளாக மாற்றுகிறது.",
    bn: "আপনার ছবি + ভয়েস নোটকে পেশাদার, বহুভাষিক তালিকা এবং আকর্ষণীয় গল্পে রূপান্তরিত করে।",
    te: "మీ ఫోటో + వాయిస్ నోట్‌ను ప్రొఫెషనల్, బహుభాషా జాబితాలు మరియు ఆకర్షణీయమైన కథలుగా మారుస్తుంది.",
  },
  trendSpotter: {
    en: 'TrendSpotter',
    hi: 'ट्रेंडस्पॉटर',
    ta: 'ட்ரெண்ட்ஸ்பாட்டர்',
    bn: 'ট্রেন্ডস্পটার',
    te: 'ట్రెండ్‌స్పాటర్',
  },
  trendSpotterDesc: {
    en: "Get AI-powered ideas to adapt traditional crafts to modern tastes and market trends.",
    hi: "पारंपरिक शिल्पों को आधुनिक स्वाद और बाजार के रुझानों के अनुकूल बनाने के लिए एआई-संचालित विचार प्राप्त करें।",
    ta: "பாரம்பரிய கைவினைகளை நவீன சுவைகள் மற்றும் சந்தை போக்குகளுக்கு ஏற்ப மாற்றுவதற்கான AI- சக்திமிக்க யோசனைகளைப் பெறுங்கள்.",
    bn: "ঐতিহ্যবাহী কারুশিল্পকে আধুনিক রুচি এবং বাজারের প্রবণতার সাথে খাপ খাইয়ে নিতে AI-চালিত ধারণা পান।",
    te: "సాంప్రదాయ చేతిపనులను ఆధునిక అభిరుచులు మరియు మార్కెట్ పోకడలకు అనుగుణంగా మార్చడానికి AI- శక్తితో కూడిన ఆలోచనలను పొందండి.",
  },
  buyerConnect: {
    en: 'Buyer Connect',
    hi: 'क्रेता कनेक्ट',
    ta: 'வாங்குபவர் இணைப்பு',
    bn: 'ক্রেতা সংযোগ',
    te: 'కొనుగోలుదారు కనెక్ట్',
  },
  buyerConnectDesc: {
    en: "Enables direct buyer-artisan communication across languages, supporting chat and voice.",
    hi: "चैट और आवाज का समर्थन करते हुए, भाषाओं में प्रत्यक्ष क्रेता-कारीगर संचार को सक्षम बनाता है।",
    ta: " அரட்டை மற்றும் குரலை ஆதரிக்கும் மொழிகளில் நேரடி வாங்குபவர்-கைவினைஞர் தகவல்தொடர்பை செயல்படுத்துகிறது.",
    bn: "চ্যাট এবং ভয়েস সমর্থনকারী ভাষা জুড়ে সরাসরি ক্রেতা-শিল্পী যোগাযোগ সক্ষম করে।",
    te: "చాట్ మరియు వాయిస్‌కు మద్దతు ఇస్తూ భాషల అంతటా ప్రత్యక్ష కొనుగోలుదారు-చేతివృత్తులవారి కమ్యూనికేషన్‌ను ప్రారంభిస్తుంది.",
  },
  marketBridge: {
    en: 'Market Bridge',
    hi: 'मार्केट ब्रिज',
    ta: 'சந்தை பாலம்',
    bn: 'মার্কেট ব্রিজ',
    te: 'మార్కెట్ వంతెన',
  },
  marketBridgeDesc: {
    en: "Sync your products across multiple online marketplaces with a single click.",
    hi: "एक ही क्लिक से अपने उत्पादों को कई ऑनलाइन मार्केटप्लेस पर सिंक करें।",
    ta: "ஒரே கிளிக்கில் பல ஆன்லைன் சந்தைகளில் உங்கள் தயாரிப்புகளை ஒத்திசைக்கவும்.",
    bn: "একক ক্লিকে একাধিক অনলাইন মার্কেটপ্লেস জুড়ে আপনার পণ্যগুলি সিঙ্ক করুন।",
    te: "ఒకే క్లిక్‌తో బహుళ ఆన్‌లైన్ మార్కెట్‌ప్లేస్‌లలో మీ ఉత్పత్తులను సమకాలీకరించండి.",
  },
  certiCraft: {
    en: 'CertiCraft',
    hi: 'सर्टीक्राफ्ट',
    ta: 'செர்டிகிராஃப்ட்',
    bn: 'সার্টিক্রাফ্ট',
    te: 'సర్టిక్రాఫ్ట్',
  },
  certiCraftDesc: {
    en: "Verify authenticity and build trust with blockchain-backed product certification.",
    hi: "ब्लॉकचेन-समर्थित उत्पाद प्रमाणन के साथ प्रामाणिकता सत्यापित करें और विश्वास बनाएं।",
    ta: "பிளாக்செயின் ஆதரவு தயாரிப்பு சான்றிதழுடன் நம்பகத்தன்மையைச் சரிபார்த்து நம்பிக்கையை உருவாக்குங்கள்.",
    bn: "ব্লকচেন-সমর্থিত পণ্য শংসাপত্রের মাধ্যমে সত্যতা যাচাই করুন এবং বিশ্বাস তৈরি করুন।",
    te: "బ్లాక్‌చెయిన్-మద్దతుగల ఉత్పత్తి ధృవీకరణతో ప్రామాణికతను ధృవీకరించండి మరియు నమ్మకాన్ని పెంచుకోండి.",
  },
  govtSchemeAlerts: {
    en: 'Govt. Scheme Alerts',
    hi: 'सरकारी योजना अलर्ट',
    ta: 'அரசு திட்டம் எச்சரிக்கைகள்',
    bn: 'সরকারি স্কিম সতর্কতা',
    te: 'ప్రభుత్వ పథకం హెచ్చరికలు',
  },
  govtSchemeAlertsDesc: {
    en: "Keeps you informed of subsidies, training, and schemes you are eligible for.",
    hi: "आपको सब्सिडी, प्रशिक्षण और योजनाओं के बारे में सूचित रखता है जिनके लिए आप पात्र हैं।",
    ta: " மானியங்கள், பயிற்சி மற்றும் நீங்கள் தகுதியுள்ள திட்டங்கள் குறித்து உங்களுக்குத் தெரிவிக்கிறது.",
    bn: "আপনাকে ভর্তুকি, প্রশিক্ষণ এবং স্কিম সম্পর্কে অবহিত রাখে যার জন্য আপনি যোগ্য।",
    te: "మీరు అర్హులైన సబ్సిడీలు, శిక్షణ మరియు పథకాల గురించి మీకు తెలియజేస్తుంది.",
  },
  financeTracker: {
    en: 'Finance Tracker',
    hi: 'वित्त ट्रैकर',
    ta: 'நிதி கண்காணிப்பு',
    bn: 'ফিনান্স ট্র্যাকার',
    te: 'ఫైనాన్స్ ట్రాకర్',
  },
  financeTrackerDesc: {
    en: "Maintains sales history, predicts demand, and generates reports for microloan approvals.",
    hi: "बिक्री इतिहास बनाए रखता है, मांग की भविष्यवाणी करता है, और माइक्रोग्रान अनुमोदन के लिए रिपोर्ट तैयार करता है।",
    ta: "விற்பனை வரலாற்றைப் பராமரிக்கிறது, தேவையைக் கணிிக்கிறது, மற்றும் மைக்ரோலோன் ஒப்புதல்களுக்கான அறிக்கைகளை உருவாக்குகிறது.",
    bn: "বিক্রয় ইতিহাস বজায় রাখে, চাহিদা ভবিষ্যদ্বাণী করে এবং মাইক্রোলোন অনুমোদনের জন্য প্রতিবেদন তৈরি করে।",
    te: "అమ్మకాల చరిత్రను నిర్వహిస్తుంది, డిమాండ్‌ను అంచనా వేస్తుంది మరియు మైక్రోలోన్ ఆమోదాల కోసం నివేదికలను రూపొందిస్తుంది.",
  },
  fairPriceEngine: {
    en: 'Fair Price Engine',
    hi: 'उचित मूल्य इंजन',
    ta: 'நியாயமான விலை இயந்திரம்',
    bn: 'ন্যায্য মূল্য ইঞ্জিন',
    te: 'న్యాయమైన ధర ఇంజిన్',
  },
  fairPriceEngineDesc: {
    en: "Suggests fair prices for your products using cost inputs and market analysis.",
    hi: "लागत इनपुट और बाजार विश्लेषण का उपयोग करके आपके उत्पादों के लिए उचित मूल्य सुझाता है।",
    ta: "செலவு உள்ளீடுகள் மற்றும் சந்தை பகுப்பாய்வைப் பயன்படுத்தி உங்கள் தயாரிப்புகளுக்கு நியாயமான விலைகளைப் பரிந்துரைக்கிறது।",
    bn: "খরচ ইনপুট এবং বাজার বিশ্লেষণ ব্যবহার করে আপনার পণ্যের জন্য ন্যায্য মূল্য প্রস্তাব করে।",
    te: "ఖర్చు ఇన్‌పుట్‌లు మరియు మార్కెట్ విశ్లేషణను ఉపయోగించి మీ ఉత్పత్తులకు సరసమైన ధరలను సూచిస్తుంది.",
  },
};

export function t(key: string | { [key: string]: string }, lang: LanguageCode) {
    if(typeof key === 'object') {
        return key[lang] ?? key['en'];
    }
    const translation = translations[key];
    if (translation) {
      return translation[lang] ?? translation['en'];
    }
    const pathAsKey = menuItems.find(item => item.path === key);
    if (pathAsKey) {
        return t(pathAsKey.label, lang);
    }
    return key;
}

export const menuItems = [
    {
      label: {en: 'Dashboard', hi: 'डैशबोर्ड', ta: 'டாஷ்போர்டு', bn: 'ড্যাশবোর্ড', te: 'డాష్‌బోర్డ్'},
      icon: LayoutDashboard,
      path: "/",
    },
    {
      label: {en: 'Artisan Buddy', hi: 'कारीगर बडी', ta: 'கைவினைஞர் நண்பன்', bn: 'শিল্পী বন্ধু', te: 'ఆర్టిసాన్ బడ్డీ'},
      icon: BotMessageSquare,
      path: "/artisan-buddy",
    },
    {
      label: {en: 'Heritage Storytelling', hi: 'विरासत की कहानी', ta: 'பாரம்பரியக் கதைசொல்லல்', bn: 'ঐতিহ্য গল্প বলা', te: 'వారసత్వ కథనం'},
      icon: Sparkles,
      path: "/story-generator",
    },
    {
      label: {en: 'TrendSpotter', hi: 'ट्रेंडस्पॉटर', ta: 'ட்ரெண்ட்ஸ்பாட்டர்', bn: 'ট্রেন্ডস্পটার', te: 'ట్రెండ్‌స్పాటర్'},
      icon: Palette,
      path: "/trend-mapper",
    },
    {
      label: {en: 'Buyer Connect', hi: 'क्रेता कनेक्ट', ta: 'வாங்குபவர் இணைப்பு', bn: 'ক্রেতা সংযোগ', te: 'కొనుగోలుదారు కనెక్ట్'},
      icon: Users,
      path: "/matchmaking",
    },
    {
      label: {en: 'Market Bridge', hi: 'मार्केट ब्रिज', ta: 'சந்தை பாலம்', bn: 'মার্কেট ব্রিজ', te: 'మార్కెట్ వంతెన'},
      icon: Package,
      path: "/multi-marketplace",
    },
    {
      label: {en: 'CertiCraft', hi: 'सर्टीक्राफ्ट', ta: 'செர்டிகிராஃப்ட்', bn: 'সার্টিক্রাফ্ট', te: 'సర్టిక్రాఫ్ట్'},
      icon: ShieldCheck,
      path: "/trust-layer",
    },
    {
      label: {en: 'Govt. Scheme Alerts', hi: 'सरकारी योजना अलर्ट', ta: 'அரசு திட்டம் எச்சரிக்கைகள்', bn: 'সরকারি স্কিম সতর্কতা', te: 'ప్రభుత్వ పథకం హెచ్చరికలు'},
      icon: ScrollText,
      path: "/yojana-mitra",
    },
    {
      label: {en: 'Finance Tracker', hi: 'वित्त ट्रैकर', ta: 'நிதி கண்காணிப்பு', bn: 'ফিনান্স ট্র্যাকার', te: 'ఫైనాన్స్ ట్రాకర్'},
      icon: IndianRupee,
      path: "/arth-saarthi",
    },
    {
      label: {en: 'Fair Price Engine', hi: 'उचित मूल्य इंजन', ta: 'நியாயமான விலை இயந்திரம்', bn: 'ন্যায্য মূল্য ইঞ্জিন', te: 'న్యాయమైన ధర ఇంజిన్'},
      icon: Calculator,
      path: "/price-engine",
    },
];

export const features = [
  {
    title: {en: 'Artisan Buddy', hi: 'कारीगर बडी', ta: 'கைவினைஞர் நண்பன்', bn: 'শিল্পী বন্ধু', te: 'ఆర్టిసాన్ బడ్డీ'},
    description: {en: "A virtual agent copy of you that answers buyer queries 24/7 when you are offline.", hi: "आपकी एक वर्चुअल एजेंट कॉपी जो आपके ऑफ़लाइन होने पर 24/7 खरीदारों के सवालों का जवाब देती है।", ta: "நீங்கள் ஆஃப்லைனில் இருக்கும்போது 24/7 வாங்குபவர் கேள்விகளுக்கு பதிலளிக்கும் உங்களின் ஒரு மெய்நிகர் முகவர் நகல்.", bn: "আপনার একটি ভার্চুয়াল এজেন্ট অনুলিপি যা আপনি অফলাইনে থাকলে ক্রেতার প্রশ্নের 24/7 উত্তর দেয়।", te: "మీరు ఆఫ్‌లైన్‌లో ఉన్నప్పుడు 24/7 కొనుగోలుదారు ప్రశ్నలకు సమాధానమిచ్చే మీ వర్చువల్ ఏజెంట్ కాపీ."},
    icon: BotMessageSquare,
    path: "/artisan-buddy",
    color: "text-red-500",
  },
  {
    title: {en: 'Heritage Storytelling', hi: 'विरासत की कहानी', ta: 'பாரம்பரியக் கதைசொல்லல்', bn: 'ঐতিহ্য গল্প বলা', te: 'వారసత్వ కథనం'},
    description: {en: "Transforms your photo + voice note into professional, multilingual listings and compelling stories.", hi: "आपकी तस्वीर + वॉयस नोट को पेशेवर, बहुभाषी लिस्टिंग औरน่าสนใจ कहानियों में बदल देता है।", ta: "உங்கள் புகைப்படம் + குரல் குறிப்பை தொழில்முறை, பன்மொழி பட்டியல்கள் மற்றும் அழுத்தமான கதைகளாக மாற்றுகிறது.", bn: "আপনার ছবি + ভয়েস নোটকে পেশাদার, বহুভাষিক তালিকা এবং আকর্ষণীয় গল্পে রূপান্তরিত করে।", te: "మీ ఫోటో + వాయిస్ నోట్‌ను ప్రొఫెషనల్, బహుభాషా జాబితాలు మరియు ఆకర్షణీయమైన కథలుగా మారుస్తుంది."},
    icon: Sparkles,
    path: "/story-generator",
    color: "text-orange-500",
  },
  {
    title: {en: 'TrendSpotter', hi: 'ट्रेंडस्पॉटर', ta: 'ட்ரெண்ட்ஸ்பாッター', bn: 'ট্রেন্ডস্পটার', te: 'ట్రెండ్‌స్పాటర్'},
    description: {en: "Get AI-powered ideas to adapt traditional crafts to modern tastes and market trends.", hi: "पारंपरिक शिल्पों को आधुनिक स्वाद और बाजार के रुझानों के अनुकूल बनाने के लिए एआई-संचालित विचार प्राप्त करें।", ta: "பாரம்பரிய கைவினைகளை நவீன சுவைகள் மற்றும் சந்தை போக்குகளுக்கு ஏற்ப மாற்றுவதற்கான AI- சக்திமிக்க யோசனைகளைப் பெறுங்கள்.", bn: "ঐতিহ্যবাহী কারুশিল্পকে আধুনিক রুচি এবং বাজারের প্রবণতার সাথে খাপ খাইয়ে নিতে AI-চালিত ধারণা পান।", te: "సాంప్రదాయ చేతిపనులను ఆధునిక అభిరుచులు మరియు మార్కెట్ పోకడలకు అనుగుణంగా మార్చడానికి AI- శక్తితో కూడిన ఆలోచనలను పొందండి."},
    icon: Palette,
    path: "/trend-mapper",
    color: "text-yellow-500",
  },
  {
    title: {en: 'Buyer Connect', hi: 'क्रेता कनेक्ट', ta: 'வாங்குபவர் இணைப்பு', bn: 'ক্রেতা সংযোগ', te: 'కొనుగోలుదారు కనెక్ట్'},
    description: {en: "Enables direct buyer-artisan communication across languages, supporting chat and voice.", hi: "चैट और आवाज का समर्थन करते हुए, भाषाओं में प्रत्यक्ष क्रेता-कारीगर संचार को सक्षम बनाता है।", ta: " அரட்டை மற்றும் குரலை ஆதரிக்கும் மொழிகளில் நேரடி வாங்குபவர்-கைவினைஞர் தகவல்தொடர்பை செயல்படுத்துகிறது.", bn: "চ্যাট এবং ভয়েস সমর্থনকারী ভাষা জুড়ে সরাসরি ক্রেতা-শিল্পী যোগাযোগ সক্ষম করে।", te: "చాట్ మరియు వాయిస్‌కు మద్దతు ఇస్తూ భాషల అంతటా ప్రత్యక్ష కొనుగోలుదారు-చేతివృత్తులవారి కమ్యూనికేషన్‌ను ప్రారంభిస్తుంది."},
    icon: Users,
    path: "/matchmaking",
    color: "text-green-500",
  },
  {
    title: {en: 'Market Bridge', hi: 'मार्केट ब्रिज', ta: 'சந்தை பாலம்', bn: 'মার্কেট ব্রিজ', te: 'మార్కెట్ వంతెన'},
    description: {en: "Sync your products across multiple online marketplaces with a single click.", hi: "एक ही क्लिक से अपने उत्पादों को कई ऑनलाइन मार्केटप्लेस पर सिंक करें।", ta: "ஒரே கிளிக்கில் பல ஆன்லைன் சந்தைகளில் உங்கள் தயாரிப்புகளை ஒத்திசைக்கவும்.", bn: "একক ক্লিকে একাধিক অনলাইন মার্কেটপ্লেস জুড়ে আপনার পণ্যগুলি সিঙ্ক করুন।", te: "ఒకే క్లిక్‌తో బహుళ ఆన్‌లైన్ మార్కెట్‌ప్లేస్‌లలో మీ ఉత్పత్తులను సమకాలీకరించండి."},
    icon: Package,
    path: "/multi-marketplace",
    color: "text-blue-500",
  },
  {
    title: {en: 'CertiCraft', hi: 'सर्टीक्राफ्ट', ta: 'செர்டிகிராஃப்ட்', bn: 'সার্টিক্রাফ্ট', te: 'సర్టిక్రాఫ్ట్'},
    description: {en: "Verify authenticity and build trust with blockchain-backed product certification.", hi: "ब्लॉकचेन-समर्थित उत्पाद प्रमाणन के साथ प्रामाणिकता सत्यापित करें और विश्वास बनाएं।", ta: "பிளாக்செயின் ஆதரவு தயாரிப்பு சான்றிதழுடன் நம்பகத்தன்மையைச் சரிபார்த்து நம்பிக்கையை உருவாக்குங்கள்.", bn: "ব্লকচেন-সমর্থিত পণ্য শংসাপত্রের মাধ্যমে সত্যতা যাচাই করুন এবং বিশ্বাস তৈরি করুন।", te: "బ్లాక్‌చెయిన్-మద్దతుగల ఉత్పత్తి ధృవీకరణతో ప్రామాణికతను ధృవీకరించండి మరియు నమ్మకాన్ని పెంచుకోండి."},
    icon: ShieldCheck,
    path: "/trust-layer",
    color: "text-indigo-500",
  },
  {
    title: {en: 'Govt. Scheme Alerts', hi: 'सरकारी योजना अलर्ट', ta: 'அரசு திட்டம் எச்சரிக்கைகள்', bn: 'সরকারি স্কিম সতর্কতা', te: 'ప్రభుత్వ పథకం హెచ్చరికలు'},
    description: {en: "Keeps you informed of subsidies, training, and schemes you are eligible for.", hi: "आपको सब्सिडी, प्रशिक्षण और योजनाओं के बारे में सूचित रखता है जिनके लिए आप पात्र हैं।", ta: " மானியங்கள், பயிற்சி மற்றும் நீங்கள் தகுதியுள்ள திட்டங்கள் குறித்து உங்களுக்குத் தெரிவிக்கிறது.", bn: "আপনাকে ভর্তুকি, প্রশিক্ষণ এবং স্কিম সম্পর্কে অবহিত রাখে যার জন্য আপনি যোগ্য।", te: "మీరు అర్హులైన సబ్సిడీలు, శిక్షణ మరియు పథకాల గురించి మీకు తెలియజేస్తుంది."},
    icon: ScrollText,
    path: "/yojana-mitra",
    color: "text-purple-500",
  },
  {
    title: {en: 'Finance Tracker', hi: 'वित्त ट्रैकर', ta: 'நிதி கண்காணிப்பு', bn: 'ফিনান্স ট্র্যাকার', te: 'ఫైనాన్స్ ట్రాకర్'},
    description: {en: "Maintains sales history, predicts demand, and generates reports for microloan approvals.", hi: "बिक्री इतिहास बनाए रखता है, मांग की भविष्यवाणी करता है, और माइक्रोग्रान अनुमोदन के लिए रिपोर्ट तैयार करता है।", ta: "விற்பனை வரலாற்றைப் பராமரிக்கிறது, தேவையைக் கணிிக்கிறது, மற்றும் மைக்ரோலோன் ஒப்புதல்களுக்கான அறிக்கைகளை உருவாக்குகிறது.", bn: "বিক্রয় ইতিহাস বজায় রাখে, চাহিদা ভবিষ্যদ্বাণী করে এবং মাইক্রোলোন অনুমোদনের জন্য প্রতিবেদন তৈরি করে।", te: "అమ్మకాల చరిత్రను నిర్వహిస్తుంది, డిమాండ్‌ను అంచనా వేస్తుంది మరియు మైక్రోలోన్ ఆమోదాల కోసం నివేదికలను రూపొందిస్తుంది."},
    icon: IndianRupee,
    path: "/arth-saarthi",
    color: "text-pink-500",
  },
  {
    title: {en: 'Fair Price Engine', hi: 'उचित मूल्य इंजन', ta: 'நியாயமான விலை இயந்திரம்', bn: 'ন্যায্য মূল্য ইঞ্জিন', te: 'న్యాయమైన ధర ఇంజిన్'},
    description: {en: "Suggests fair prices for your products using cost inputs and market analysis.", hi: "लागत इनपुट और बाजार विश्लेषण का उपयोग करके आपके उत्पादों के लिए उचित मूल्य सुझाता है।", ta: "செலவு உள்ளீடுகள் மற்றும் சந்தை பகுப்பாய்வைப் பயன்படுத்தி உங்கள் தயாரிப்புகளுக்கு நியாயமான விலைகளைப் பரிந்துரைக்கிறது।", bn: "খরচ ইনপুট এবং বাজার বিশ্লেষণ ব্যবহার করে আপনার পণ্যের জন্য ন্যায্য মূল্য প্রস্তাব করে।", te: "ఖర్చు ఇన్‌పుట్‌లు మరియు మార్కెట్ విశ్లేషణను ఉపయోగించి మీ ఉత్పత్తులకు సరసమైన ధరలను సూచిస్తుంది."},
    icon: Calculator,
    path: "/price-engine",
    color: "text-cyan-500",
  }
];
