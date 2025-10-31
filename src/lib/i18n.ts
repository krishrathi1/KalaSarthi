
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
  ShoppingCart,
  Archive,
  FileText,
  User,
  Globe,
  Mic,
  UserPlus,
  DollarSign,
  Volume2,
} from "lucide-react";
import { translationService } from './translation-service';

export const languages = {
  // Indian Languages
  en: { name: 'English', region: 'indian' },
  hi: { name: 'हिन्दी', region: 'indian' },
  ta: { name: 'தமிழ்', region: 'indian' },
  bn: { name: 'বাংলা', region: 'indian' },
  te: { name: 'తెలుగు', region: 'indian' },
  as: { name: 'Assamese', region: 'indian' },
  bho: { name: 'Bhojpuri', region: 'indian' },
  doi: { name: 'Dogri', region: 'indian' },
  gu: { name: 'Gujarati', region: 'indian' },
  kn: { name: 'Kannada', region: 'indian' },
  ks: { name: 'Kashmiri', region: 'indian' },
  kok: { name: 'Konkani', region: 'indian' },
  mai: { name: 'Maithili', region: 'indian' },
  ml: { name: 'Malayalam', region: 'indian' },
  mr: { name: 'Marathi', region: 'indian' },
  raj: { name: 'राजस्थानी', region: 'indian' }, // Marwari/Rajasthani
  mni: { name: 'Meiteilon (Manipuri)', region: 'indian' },
  ne: { name: 'Nepali', region: 'indian' },
  or: { name: 'Odia', region: 'indian' },
  pa: { name: 'Punjabi', region: 'indian' },
  sa: { name: 'Sanskrit', region: 'indian' },
  sat: { name: 'Santali', region: 'indian' },
  sd: { name: 'Sindhi', region: 'indian' },
  ur: { name: 'Urdu', region: 'indian' },
  // Foreign Languages
  es: { name: 'Español', region: 'foreign' },
  fr: { name: 'Français', region: 'foreign' },
  de: { name: 'Deutsch', region: 'foreign' },
  zh: { name: '中文', region: 'foreign' },
  ja: { name: '日本語', region: 'foreign' },
  ar: { name: 'العربية', region: 'foreign' },
  pt: { name: 'Português', region: 'foreign' },
  ru: { name: 'Русский', region: 'foreign' },
  it: { name: 'Italiano', region: 'foreign' },
  ko: { name: '한국어', region: 'foreign' },
  nl: { name: 'Nederlands', region: 'foreign' },
  sv: { name: 'Svenska', region: 'foreign' },
  da: { name: 'Dansk', region: 'foreign' },
  no: { name: 'Norsk', region: 'foreign' },
  fi: { name: 'Suomi', region: 'foreign' },
  pl: { name: 'Polski', region: 'foreign' },
  tr: { name: 'Türkçe', region: 'foreign' },
  th: { name: 'ไทย', region: 'foreign' },
  vi: { name: 'Tiếng Việt', region: 'foreign' },
};

export type LanguageCode = string; // Allow custom languages

type Translations = {
  [key: string]: { [K in LanguageCode]?: string };
};

export interface MenuItem {
  label: { [K in LanguageCode]: string };
  icon: any;
  path: string;
  hidden?: boolean;
}

export interface Feature {
  title: { [K in LanguageCode]?: string };
  description: { [K in LanguageCode]?: string };
  icon: any;
  path: string;
  color: string;
  hidden?: boolean;
}

const translations: Translations = {
  // Dashboard
  greeting: {
    en: 'Namaste',
    hi: 'नमस्ते',
    ta: 'வணக்கம்',
    bn: 'নমস্কার',
    te: 'నమస్కారం',
    gu: 'નમસ્તે',
    mr: 'नमस्कार',
    kn: 'ನಮಸ್ಕಾರ',
    ml: 'നമസ്കാരം',
    pa: 'ਨਮਸਤੇ',
    as: 'নমস্কাৰ',
    or: 'ନମସ୍କାର',
    ur: 'سلام',
    es: 'Hola',
    fr: 'Bonjour',
    de: 'Hallo',
    zh: '你好',
    ja: 'こんにちは',
    ar: 'مرحبا',
    pt: 'Olá',
    ru: 'Привет',
    it: 'Ciao',
    ko: '안녕하세요',
    nl: 'Hallo',
    sv: 'Hej',
    da: 'Hej',
    no: 'Hei',
    fi: 'Hei',
    pl: 'Cześć',
    tr: 'Merhaba',
    th: 'สวัสดี',
    vi: 'Xin chào',
  },
  welcome: {
    en: 'Welcome to KalaSarthi. Here are your tools to empower your craft.',
    hi: 'कलासार्थी में आपका स्वागत है। अपनी कला को सशक्त बनाने के लिए आपके उपकरण यहां दिए गए हैं।',
    ta: 'கலாசார்திக்கு வரவேற்கிறோம். உங்கள் கைவினைக்கு அதிகாரம் அளிக்க உங்கள் கருவிகள் இங்கே உள்ளன.',
    bn: 'কলাসার্থীতে আপনাকে স্বাগত। আপনার শিল্পকে শক্তিশালী করার জন্য আপনার সরঞ্জামগুলি এখানে রয়েছে।',
    te: 'కళాసార్థికి స్వాగతం. మీ కళను శక్తివంతం చేయడానికి మీ సాధనాలు ఇక్కడ ఉన్నాయి.',
    gu: 'કલાસાર્થીમાં આપનું સ્વાગત છે. આપની કળાને શક્તિશાળી બનાવવા માટે આપના સાધનો અહીં આપવામાં આવ્યા છે.',
    mr: 'कलासार्थीमध्ये आपले स्वागत आहे. आपल्या कलेचे सशक्तीकरण करण्यासाठी आपली साधने येथे आहेत.',
    kn: 'ಕಲಾಸಾರ್ಥಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಕಲೆಯನ್ನು ಶಕ್ತಿಗೊಳಿಸಲು ನಿಮ್ಮ ಸಾಧನಗಳು ಇಲ್ಲಿವೆ.',
    ml: 'കലാസാര്ഥിയിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ കലയെ ശക്തിപ്പെടുത്തുന്നതിന് നിങ്ങളുടെ ഉപകരണങ്ങൾ ഇവിടെയുണ്ട്.',
    pa: 'ਕਲਾਸਾਰਥੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਤੁਹਾਡੀ ਕਲਾ ਨੂੰ ਸ਼ਕਤੀਸ਼ਾਲੀ ਬਣਾਉਣ ਲਈ ਤੁਹਾਡੇ ਸੰਦ ਇੱਥੇ ਦਿੱਤੇ ਗਏ ਹਨ।',
    as: 'কলাসাৰ্থীত আপোনাক স্বাগত। আপোনাৰ শিল্পক শক্তিশালী কৰাৰ বাবে আপোনাৰ সঁজুলি ইয়াত আছে।',
    or: 'କଲାସାର୍ଥିରେ ଆପଣଙ୍କର ସ୍ଵାଗତ। ଆପଣଙ୍କର କଳାକୁ ଶକ୍ତିଶାଳୀ କରିବା ପାଇଁ ଆପଣଙ୍କର ଉପକରଣଗୁଡ଼ିକ ଏଠାରେ ଅଛି।',
    ur: 'کالا سارتھی میں خوش آمدید۔ اپنی کلا کو طاقتور بنانے کے لیے آپ کے اوزار یہاں ہیں۔',
    es: 'Bienvenido a KalaSarthi. Aquí están tus herramientas para empoderar tu artesanía.',
    fr: 'Bienvenue sur KalaSarthi. Voici vos outils pour renforcer votre artisanat.',
    de: 'Willkommen bei KalaSarthi. Hier sind Ihre Werkzeuge, um Ihr Handwerk zu stärken.',
    zh: '欢迎来到KalaSarthi。这里是您的工具，帮助您赋能您的工艺。',
    ja: 'KalaSarthiへようこそ。ここにあなたの工芸を強化するためのツールがあります。',
    ar: 'مرحبا بك في كالاسارثي. إليك أدواتك لتمكين حرفك.',
    pt: 'Bem-vindo ao KalaSarthi. Aqui estão suas ferramentas para capacitar sua arte.',
    ru: 'Добро пожаловать в KalaSarthi. Вот ваши инструменты для укрепления вашего ремесла.',
    it: 'Benvenuto su KalaSarthi. Ecco i tuoi strumenti per potenziare la tua arte.',
    ko: 'KalaSarthi에 오신 것을 환영합니다. 여기에서 당신의 공예를 강화할 도구가 있습니다.',
    nl: 'Welkom bij KalaSarthi. Hier zijn uw tools om uw ambacht te versterken.',
    sv: 'Välkommen till KalaSarthi. Här är dina verktyg för att stärka ditt hantverk.',
    da: 'Velkommen til KalaSarthi. Her er dine værktøjer til at styrke dit håndværk.',
    no: 'Velkommen til KalaSarthi. Her er verktøyene dine for å styrke håndverket ditt.',
    fi: 'Tervetuloa KalaSarthiin. Tässä ovat työkalusi käsityösi vahvistamiseksi.',
    pl: 'Witamy w KalaSarthi. Oto twoje narzędzia do wzmocnienia rzemiosła.',
    tr: 'KalaSarthi\'ya hoş geldiniz. Zanaatinizi güçlendirmek için araçlarınız burada.',
    th: 'ยินดีต้อนรับสู่ KalaSarthi นี่คือเครื่องมือของคุณในการเสริมพลังงานฝีมือของคุณ',
    vi: 'Chào mừng bạn đến với KalaSarthi. Đây là các công cụ của bạn để trao quyền cho nghệ thuật của bạn.',
  },
  open: {
    en: 'Open',
    hi: 'खोलें',
    ta: 'திற',
    bn: 'খুলুন',
    te: 'తెరవండి',
    gu: 'ખોલો',
    mr: 'उघडा',
    kn: 'ತೆರೆ',
    ml: 'തുറക്കുക',
    pa: 'ਖੋਲ੍ਹੋ',
    as: 'খোলক',
    or: 'ଖୋଲ',
    ur: 'کھولیں',
    es: 'Abrir',
    fr: 'Ouvrir',
    de: 'Öffnen',
    zh: '打开',
    ja: '開く',
    ar: 'فتح',
    pt: 'Abrir',
    ru: 'Открыть',
    it: 'Apri',
    ko: '열기',
    nl: 'Openen',
    sv: 'Öppna',
    da: 'Åbn',
    no: 'Åpne',
    fi: 'Avaa',
    pl: 'Otwórz',
    tr: 'Aç',
    th: 'เปิด',
    vi: 'Mở',
  },
  // App Name
  appName: {
    en: 'KalaSarthi',
    hi: 'कलासार्थी',
    ta: 'கலாசார்தி',
    bn: 'কলাসার্থী',
    te: 'కళాసార్థి',
    gu: 'કલાસાર્થી',
    mr: 'कलासार्थी',
    kn: 'ಕಲಾಸಾರ್ಥಿ',
    ml: 'കലാസാര്ഥി',
    pa: 'ਕਲਾਸਾਰਥੀ',
    as: 'কলাসাৰ্থী',
    or: 'କଲାସାର୍ଥି',
    ur: 'کالا سارتھی',
    es: 'KalaSarthi',
    fr: 'KalaSarthi',
    de: 'KalaSarthi',
    zh: '卡拉萨蒂',
    ja: 'カラサルティ',
    ar: 'كالاسارثي',
    pt: 'KalaSarthi',
    ru: 'КалаСартхи',
    it: 'KalaSarthi',
    ko: '칼라사르티',
    nl: 'KalaSarthi',
    sv: 'KalaSarthi',
    da: 'KalaSarthi',
    no: 'KalaSarthi',
    fi: 'KalaSarthi',
    pl: 'KalaSarthi',
    tr: 'KalaSarthi',
    th: 'คาลาสาร์ธี',
    vi: 'KalaSarthi',
  },
  // Chat Interface
  chatTitle: {
    en: 'Artisan Buddy',
    hi: 'कारीगर साथी',
    ta: 'கைவினைஞர் நண்பர்',
    bn: 'শিল্পী বন্ধু',
    te: 'కళాకారుడు సహచరుడు',
    gu: 'કલાકાર મિત્ર',
    mr: 'कला साथी',
    kn: 'ಕಲಾಕಾರ ಸಹೋದರ',
    ml: 'കലാകാരൻ സുഹൃത്ത്',
    pa: 'ਕਲਾਕਾਰ ਦੋਸਤ',
    as: 'কলাকৌশলী বন্ধু',
    or: 'କଳାକାର ସାଥୀ',
    ur: 'کارٹسن بددی',
    es: 'Compañero Artesano',
    fr: 'Ami Artisan',
    de: 'Handwerker-Kumpel',
    zh: '工匠伙伴',
    ja: '職人バディ',
    ar: 'صديق الحرفي',
    pt: 'Amigo Artesão',
    ru: 'Друг Ремесленника',
    it: 'Amico Artigiano',
    ko: '장인 친구',
    nl: 'Ambachtsvriend',
    sv: 'Hantverkarvän',
    da: 'Håndværksven',
    no: 'Håndverksvenn',
    fi: 'Ammattilainen ystävä',
    pl: 'Przyjaciel Rzemieślnika',
    tr: 'Zanaatkar Arkadaş',
    th: 'เพื่อนช่างฝีมือ',
    vi: 'Bạn Thợ Thủ Công',
  },
  chatDescription: {
    en: 'Chat with Ramu\'s AI assistant 24/7.',
    hi: 'रामू के एआई सहायक से 24/7 चैट करें।',
    ta: 'ராமுவின் AI உதவியாளருடன் 24/7 அரட்டையிடுங்கள்.',
    bn: 'রামুর AI সহকারীর সাথে 24/7 চ্যাট করুন।',
    te: 'రాము యొక్క AI సహాయకుడితో 24/7 చాట్ చేయండి.',
    gu: 'રામુના AI સહાયક સાથે 24/7 ચેટ કરો.',
    mr: 'रामूच्या AI सहाय्यकासोबत 24/7 चॅट करा.',
    kn: 'ರಾಮುವಿನ AI ಸಹಾಯಕನೊಂದಿಗೆ 24/7 ಚಾಟ್ ಮಾಡಿ.',
    ml: 'രാമുവിന്റെ AI സഹായിയുമായി 24/7 ചാറ്റ് ചെയ്യുക.',
    pa: 'ਰਾਮੂ ਦੇ AI ਸਹਾਇਕ ਨਾਲ 24/7 ਗੱਲਬਾਤ ਕਰੋ।',
    as: 'ৰামুৰ AI সহায়কৰ সৈতে 24/7 চেট কৰক।',
    or: 'ରାମୁଙ୍କର AI ସହାୟକ ସହିତ 24/7 ଚାଟ୍ କରନ୍ତୁ।',
    ur: 'رامو کے AI اسسٹنٹ سے 24/7 چیٹ کریں۔',
    es: 'Chatea con el asistente de IA de Ramu 24/7.',
    fr: 'Discutez avec l\'assistant IA de Ramu 24/7.',
    de: 'Chatten Sie 24/7 mit Ramus KI-Assistenten.',
    zh: '24/7 与 Ramu 的 AI 助手聊天。',
    ja: 'RamuのAIアシスタントと24時間チャット。',
    ar: 'تحدث مع مساعد الذكاء الاصطناعي لـ Ramu على مدار 24 ساعة.',
    pt: 'Converse com o assistente de IA do Ramu 24/7.',
    ru: 'Общайтесь с ИИ-помощником Раму круглосуточно.',
    it: 'Chatta con l\'assistente AI di Ramu 24/7.',
    ko: 'Ramu의 AI 도우미와 24시간 채팅하세요.',
    nl: 'Chat 24/7 met de AI-assistent van Ramu.',
    sv: 'Chatta 24/7 med Ramus AI-assistent.',
    da: 'Chat 24/7 med Ramus AI-assistent.',
    no: 'Chat 24/7 med Ramus AI-assistent.',
    fi: 'Keskustele 24/7 Ramun AI-avustajan kanssa.',
    pl: 'Czatuj 24/7 z asystentem AI Ramu.',
    tr: 'Ramu\'nun AI asistanıyla 24/7 sohbet edin.',
    th: 'แชทกับผู้ช่วย AI ของ Ramu ตลอด 24 ชั่วโมง',
    vi: 'Trò chuyện với trợ lý AI của Ramu 24/7.',
  },
  chatPlaceholder: {
    en: 'Ask about weaving techniques...',
    hi: 'बुनाई तकनीकों के बारे में पूछें...',
    ta: 'நெய்தல் நுட்பங்களைப் பற்றி கேளுங்கள்...',
    bn: 'বোনা কৌশল সম্পর্কে জিজ্ঞাসা করুন...',
    te: 'నేత కౌశళాల గురించి అడగండి...',
    gu: 'વણાટ તકનીકો વિષે પૂછો...',
    mr: 'वेअरिंग तंत्रांविषयी विचारा...',
    kn: 'ನೇಯುವ ತಂತ್ರಗಳ ಬಗ್ಗೆ ಕೇಳಿ...',
    ml: 'നെയ്ത്ത സാങ്കേതികതകളെക്കുറിച്ച് ചോദിക്കുക...',
    pa: 'ਬੁਣਾਈ ਦੀਆਂ ਤਕਨੀਕਾਂ ਬਾਰੇ ਪੁੱਛੋ...',
    as: 'বোৰণ কৌশলৰ বিষয়ে সোধক...',
    or: 'ବୁଣିବା କୌଶଳ ବିଷୟରେ ପଚାରନ୍ତୁ...',
    ur: 'بُنائی کی تکنیکوں کے بارے میں پوچھیں...',
    es: 'Pregunta sobre técnicas de tejido...',
    fr: 'Demandez des techniques de tissage...',
    de: 'Fragen Sie nach Webtechniken...',
    zh: '询问编织技巧...',
    ja: '織りの技術について聞いてください...',
    ar: 'اسأل عن تقنيات النسيج...',
    pt: 'Pergunte sobre técnicas de tecelagem...',
    ru: 'Спросите о техниках плетения...',
    it: 'Chiedi delle tecniche di tessitura...',
    ko: '직조 기술에 대해 물어보세요...',
    nl: 'Vraag naar weeftechnieken...',
    sv: 'Fråga om vävtekniker...',
    da: 'Spørg om væveteknikker...',
    no: 'Spør om veveteknikker...',
    fi: 'Kysy kudontatekniikoista...',
    pl: 'Zapytaj o techniki tkania...',
    tr: 'Dokuma teknikleri hakkında sorun...',
    th: 'ถามเกี่ยวกับเทคนิคการทอ...',
    vi: 'Hỏi về kỹ thuật dệt...',
  },
  chatInitialMessage: {
    en: 'Namaste! I am Ramu\'s digital assistant. Ask me anything about his craft, story, or products.',
    hi: 'नमस्ते! मैं रामू का डिजिटल सहायक हूं। उनकी कला, कहानी या उत्पादों के बारे में कुछ भी पूछें।',
    ta: 'வணக்கம்! நான் ராமுவின் டிஜிட்டல் உதவியாளர். அவரது கைவினை, கதை அல்லது தயாரிப்புகள் பற்றி எதையும் கேளுங்கள்.',
    bn: 'নমস্কার! আমি রামুর ডিজিটাল সহকারী। তাঁর শিল্প, গল্প বা পণ্য সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন।',
    te: 'నమస్కారం! నేను రాము యొక్క డిజిటల్ సహాయకుడు. అతని కళ, కథ లేదా ఉత్పత్తుల గురించి ఏదైనా అడగండి.',
    gu: 'નમસ્તે! હું રામુનો ડિજિટલ સહાયક છું. તેમની કળા, વાર્તા અથવા ઉત્પાદનો વિષે કંઈ પણ પૂછો.',
    mr: 'नमस्कार! मी रामूचा डिजिटल सहाय्यक आहे. त्याच्या कलेबद्दल, कथेबद्दल किंवा उत्पादनांबद्दल काहीही विचारा.',
    kn: 'ನಮಸ್ಕಾರ! ನಾನು ರಾಮುವಿನ ಡಿಜಿಟಲ್ ಸಹಾಯಕ. ಅವನ ಕಲೆ, ಕಥೆ ಅಥवा ಉತ್ಪನ್ನಗಳ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ.',
    ml: 'നമസ്കാരം! ഞാൻ രാമുവിന്റെ ഡിജിറ്റൽ അസിസ്റ്റന്റാണ്. അദ്ദേഹത്തിന്റെ കല, കഥ അല്ലെങ്കിൽ ഉൽപ്പന്നങ്ങൾ എന്തെങ്കിലും ചോദിക്കുക.',
    pa: 'ਨਮਸਤੇ! ਮੈਂ ਰਾਮੂ ਦਾ ਡਿਜ਼ੀਟਲ ਸਹਾਇਕ ਹਾਂ। ਉਸਦੀ ਕਲਾ, ਕਹਾਣੀ ਜਾਂ ਉਤਪਾਦਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।',
    as: 'নমস্কাৰ! মই ৰামুৰ ডিজিটেল সহায়ক। তাৰ শিল্প, কাহিনী বা উৎপাদনৰ বিষয়ে যিকোনো কিছু সোধক।',
    or: 'ନମସ୍କାର! ମୁଁ ରାମୁଙ୍କର ଡିଜିଟାଲ୍ ସହାୟକ। ତାଙ୍କର କଳା, କାହାଣୀ କିମ୍ବା ଉତ୍ପାଦଗୁଡ଼ିକ ବିଷୟରେ କିଛି ପଚାରନ୍ତୁ।',
    ur: 'سلام! میں رامو کا ڈیجیٹل اسسٹنٹ ہوں۔ ان کی کلا، کہانی یا مصنوعات کے بارے میں کچھ بھی پوچھیں۔',
    es: '¡Namaste! Soy el asistente digital de Ramu. Pregúntame cualquier cosa sobre su artesanía, historia o productos.',
    fr: 'Namaste ! Je suis l\'assistant numérique de Ramu. Demandez-moi n\'importe quoi sur son artisanat, son histoire ou ses produits.',
    de: 'Namaste! Ich bin Ramus digitaler Assistent. Fragen Sie mich alles über sein Handwerk, seine Geschichte oder seine Produkte.',
    zh: '纳玛斯特！我 是 Ramu 的数字助手。问我任何关于他的工艺、故事或产品的问题。',
    ja: 'ナマステ！私はRamuのデジタルアシスタントです。彼の工芸、物語、製品について何でも聞いてください。',
    ar: 'السلام عليكم! أنا المساعد الرقمي لـ Ramu. اسألني عن أي شيء يتعلق بحرفيته أو قصته أو منتجاته.',
    pt: 'Namaste! Sou o assistente digital de Ramu. Pergunte-me qualquer coisa sobre sua arte, história ou produtos.',
    ru: 'Намасте! Я цифровой помощник Раму. Спросите меня о чем угодно, связанном с его ремеслом, историей или продуктами.',
    it: 'Namaste! Sono l\'assistente digitale di Ramu. Chiedimi qualsiasi cosa sulla sua arte, storia o prodotti.',
    ko: '나마스테! 저는 Ramu의 디지털 어시스턴트입니다. 그의 공예, 이야기 또는 제품에 대해 무엇이든 물어보세요.',
    nl: 'Namaste! Ik ben de digitale assistent van Ramu. Vraag me alles over zijn ambacht, verhaal of producten.',
    sv: 'Namaste! Jag är Ramus digitala assistent. Fråga mig vad som helst om hans hantverk, historia eller produkter.',
    da: 'Namaste! Jeg er Ramus digitale assistent. Spørg mig om alt vedrørende hans håndværk, historie eller produkter.',
    no: 'Namaste! Jeg er Ramus digitale assistent. Spør meg om alt angående håndverket hans, historie eller produkter.',
    fi: 'Namaste! Olen Ramun digitaalinen avustaja. Kysy minulta mitä tahansa hänen käsityöstään, tarinastaan tai tuotteistaan.',
    pl: 'Namaste! Jestem cyfrowym asystentem Ramu. Zapytaj mnie o wszystko dotyczące jego rzemiosła, historii lub produktów.',
    tr: 'Namaste! Ben Ramu\'nun dijital asistanıyım. Zanaatı, hikayesi veya ürünleri hakkında herhangi bir şey sor.',
    th: 'นามัสเต! ฉันเป็นผู้ช่วยดิจิทัลของ Ramu ถามฉันเกี่ยวกับงานฝีมือเรื่องราวหรือผลิตภัณฑ์ของเขา',
    vi: 'Namaste! Tôi là trợ lý kỹ thuật số của Ramu. Hỏi tôi bất cứ điều gì về nghệ thuật, câu chuyện hoặc sản phẩm của anh ấy.',
  },
  send: {
    en: 'Send',
    hi: 'भेजें',
    ta: 'அனுப்பு',
    bn: 'পাঠান',
    te: 'పంపండి',
    gu: 'મોકલો',
    mr: 'पाठवा',
    kn: 'ಕಳುಹಿಸಿ',
    ml: 'അയയ്ക്കുക',
    pa: 'ਭੇਜੋ',
    as: 'পঠিয়াওক',
    or: 'ପଠାନ୍ତୁ',
    ur: 'بھیجیں',
    es: 'Enviar',
    fr: 'Envoyer',
    de: 'Senden',
    zh: '发送',
    ja: '送信',
    ar: 'إرسال',
    pt: 'Enviar',
    ru: 'Отправить',
    it: 'Invia',
    ko: '보내기',
    nl: 'Verzenden',
    sv: 'Skicka',
    da: 'Send',
    no: 'Send',
    fi: 'Lähetä',
    pl: 'Wyślij',
    tr: 'Gönder',
    th: 'ส่ง',
    vi: 'Gửi',
  },
  you: {
    en: 'You',
    hi: 'आप',
    ta: 'நீங்கள்',
    bn: 'আপনি',
    te: 'మీరు',
    gu: 'તમે',
    mr: 'तुम्ही',
    kn: 'ನೀವು',
    ml: 'നീ',
    pa: 'ਤੁਸੀਂ',
    as: 'আপুনি',
    or: 'ଆପଣ',
    ur: 'آپ',
    es: 'Tú',
    fr: 'Vous',
    de: 'Sie',
    zh: '你',
    ja: 'あなた',
    ar: 'أنت',
    pt: 'Você',
    ru: 'Вы',
    it: 'Tu',
    ko: '당신',
    nl: 'Jij',
    sv: 'Du',
    da: 'Du',
    no: 'Du',
    fi: 'Sinä',
    pl: 'Ty',
    tr: 'Sen',
    th: 'คุณ',
    vi: 'Bạn',
  },
  ai: {
    en: 'AI',
    hi: 'एआई',
    ta: 'எஐ',
    bn: 'এআই',
    te: 'ఎఐ',
    gu: 'એઆઈ',
    mr: 'एआय',
    kn: 'ಎಐ',
    ml: 'എഐ',
    pa: 'ਏਆਈ',
    as: 'এআই',
    or: 'ଏଆଇ',
    ur: 'اے آئی',
    es: 'IA',
    fr: 'IA',
    de: 'KI',
    zh: 'AI',
    ja: 'AI',
    ar: 'الذكاء الاصطناعي',
    pt: 'IA',
    ru: 'ИИ',
    it: 'AI',
    ko: 'AI',
    nl: 'AI',
    sv: 'AI',
    da: 'AI',
    no: 'AI',
    fi: 'AI',
    pl: 'SI',
    tr: 'AI',
    th: 'AI',
    vi: 'AI',
  },
  chatError: {
    en: 'Chat Error',
    hi: 'चैट त्रुटि',
    ta: 'அரட்டை பிழை',
    bn: 'চ্যাট ত্রুটি',
    te: 'చాట్ లోపం',
    gu: 'ચેટ ભૂલ',
    mr: 'चॅट त्रुटी',
    kn: 'ಚಾಟ್ ದೋಷ',
    ml: 'ചാറ്റ് പിശക്',
    pa: 'ਚੈਟ ਗਲਤੀ',
    as: 'চেট ত্ৰুটি',
    or: 'ଚାଟ୍ ତ୍ରୁଟି',
    ur: 'چیٹ کی خرابی',
    es: 'Error de Chat',
    fr: 'Erreur de Chat',
    de: 'Chat-Fehler',
    zh: '聊天错误',
    ja: 'チャットエラー',
    ar: 'خطأ في الدردشة',
    pt: 'Erro de Chat',
    ru: 'Ошибка чата',
    it: 'Errore Chat',
    ko: '채팅 오류',
    nl: 'Chat Fout',
    sv: 'Chat Fel',
    da: 'Chat Fejl',
    no: 'Chat Feil',
    fi: 'Chat Virhe',
    pl: 'Błąd Czat',
    tr: 'Sohbet Hatası',
    th: 'ข้อผิดพลาดในการแชท',
    vi: 'Lỗi trò chuyện',
  },
  // Artisan Title
  artisanTitle: {
    en: 'Kanchipuram Weaver',
    hi: 'कांचीपुरम बुनकर',
    ta: 'காஞ்சிபுரம் நெசவாளர்',
    bn: 'কাঞ্চিপুরম বোনা',
    te: 'కాంచీపురం నేత',
    gu: 'કાંચીપુરમ વુવર',
    mr: 'कांचीपुरम विणकर',
    kn: 'ಕಾಂಚೀಪುರಂ ನೇಯುವವರು',
    ml: 'കാഞ്ചിപുരം വയ്ക്കുന്നയാൾ',
    pa: 'ਕਾਂਚੀਪੁਰਮ ਬੁਣਹਾਰ',
    as: 'কাঞ্চিপুৰম বোৰা',
    or: 'କାଞ୍ଚୀପୁରମ ବୁଣକାର',
    ur: 'کانچی پورم بننے والا',
    es: 'Tejedor de Kanchipuram',
    fr: 'Tisserand de Kanchipuram',
    de: 'Kanchipuram Weber',
    zh: '坎奇普拉姆织工',
    ja: 'カンチプラム織り手',
    ar: 'نساج كانشيبورام',
    pt: 'Tecelão de Kanchipuram',
    ru: 'Ткач из Канчипурама',
    it: 'Tessitore di Kanchipuram',
    ko: '칸치푸람 직공',
    nl: 'Kanchipuram Wever',
    sv: 'Kanchipuram Vävare',
    da: 'Kanchipuram Væver',
    no: 'Kanchipuram Vever',
    fi: 'Kanchipuram Kudonnainen',
    pl: 'Tkacz z Kanchipuram',
    tr: 'Kanchipuram Dokumacı',
    th: 'นักทอจากกัญจีปุรัม',
    vi: 'Thợ dệt Kanchipuram',
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
  // Artisan Buddy removed - use Enhanced Chat instead
  heritageStorytelling: {
    en: 'Heritage Storytelling',
    hi: 'विरासत की कहानी',
    ta: 'பாரம்பரியக் கதைசொல்லல்',
    bn: 'ঐতিহ্য গল্প বলা',
    te: 'వారసత్వ కథనం',
  },
  heritageStorytellingDesc: {
    en: "Transforms your photo and text into professional, multilingual listings and compelling stories.",
    hi: "आपकी तस्वीर और टेक्स्ट को पेशेवर, बहुभाषी लिस्टिंग और दिलचस्प कहानियों में बदल देता है।",
    ta: "உங்கள் புகைப்படம் மற்றும் உரையை தொழில்முறை, பன்மொழி பட்டியல்கள் மற்றும் அழுத்தமான கதைகளாக மாற்றுகிறது.",
    bn: "আপনার ছবি এবং টেক্সটকে পেশাদার, বহুভাষিক তালিকা এবং আকর্ষণীয় গল্পে রূপান্তরিত করে।",
    te: "మీ ఫోటో మరియు టెక్స్ట్‌ను ప్రొఫెషనల్, బహుభాషా జాబితాలు మరియు ఆకర్షణీయమైన కథలుగా మారుస్తుంది.",
  },
  trendSpotter: {
    en: 'Trend Spotter',
    hi: 'ट्रेंड स्पॉटर',
    ta: 'ட்ரெண்ட் ஸ்பாட்டர்',
    bn: 'ট্রেন্ড স্পটার',
    te: 'ట్రెండ్ స్పాటర్',
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
    en: "Enables direct buyer-artisan communication across languages with real-time text translation.",
    hi: "वास्तविक समय टेक्स्ट अनुवाद के साथ भाषाओं में प्रत्यक्ष क्रेता-कारीगर संचार को सक्षम बनाता है।",
    ta: "நேரடி உரை மொழிபெயர்ப்புடன் மொழிகளில் நேரடி வாங்குபவர்-கைவினைஞர் தகவல்தொடர்பை செயல்படுத்துகிறது.",
    bn: "রিয়েল-টাইম টেক্সট অনুবাদ সহ ভাষা জুড়ে সরাসরি ক্রেতা-শিল্পী যোগাযোগ সক্ষম করে।",
    te: "రియల్-టైమ్ టెక్స్ట్ అనువాదంతో భాషల అంతటా ప్రత్యక్ష కొనుగోలుదారు-చేతివృత్తులవారి కమ్యూనికేషన్‌ను ప్రారంభిస్తుంది.",
  },
  marketBridge: {
    en: 'Global Bazaar',
    hi: 'ग्लोबल बाजार',
    ta: 'உலக பஜார்',
    bn: 'গ্লোবাল বাজার',
    te: 'గ్లోబల్ బజార్',
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
    te: 'స్కీమ్ సహాయక్',
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
  if (typeof key === 'object') {
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

// Translation cache for instant access
const translationCache = new Map<string, string>();
const pendingTranslations = new Set<string>();

// Pre-load critical translations in background
export const preloadCriticalTranslations = async (lang: LanguageCode) => {
  if (lang === 'en') return; // No need to translate English

  const criticalKeys = [
    'greeting', 'welcome', 'appName', 'dashboard',
    'artisanBuddy', 'heritageStorytelling', 'trendSpotter'
  ];

  // Batch translate critical keys
  const untranslatedKeys = criticalKeys.filter(key => {
    const cacheKey = `${key}_${lang}`;
    return !translationCache.has(cacheKey) && !pendingTranslations.has(cacheKey);
  });

  if (untranslatedKeys.length > 0) {
    try {
      // Mark as pending to avoid duplicate requests
      untranslatedKeys.forEach(key => {
        pendingTranslations.add(`${key}_${lang}`);
      });

      // Batch translate
      const batchTranslations = await Promise.allSettled(
        untranslatedKeys.map(async (key) => {
          const translation = translations[key];
          if (translation?.['en']) {
            const translated = await translationService.translateWithCache(
              translation['en'],
              lang,
              'en'
            );
            return { key, translated };
          }
          return null;
        })
      );

      // Store successful translations
      batchTranslations.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const { key, translated } = result.value;
          const cacheKey = `${key}_${lang}`;
          translationCache.set(cacheKey, translated);
          pendingTranslations.delete(cacheKey);

          // Update translations object for persistence
          if (translations[key]) {
            translations[key][lang] = translated;
          }
        }
      });
    } catch (error) {
      console.error('Batch translation failed:', error);
      // Clear pending flags on error
      untranslatedKeys.forEach(key => {
        pendingTranslations.delete(`${key}_${lang}`);
      });
    }
  }
};

// Enhanced async translation function with instant cache access
export async function translateAsync(key: string | { [key: string]: string }, lang: LanguageCode): Promise<string> {
  // Handle object keys
  if (typeof key === 'object') {
    if (key[lang]) {
      return key[lang];
    }

    if (key['en']) {
      const cacheKey = `obj_${key['en']}_${lang}`;

      // Check cache first
      if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
      }

      // Check if translation is pending
      if (pendingTranslations.has(cacheKey)) {
        return key['en']; // Return English while translation is in progress
      }

      // Start background translation
      pendingTranslations.add(cacheKey);
      translationService.translateWithCache(key['en'], lang, 'en')
        .then(translated => {
          translationCache.set(cacheKey, translated);
          pendingTranslations.delete(cacheKey);
        })
        .catch(error => {
          console.error(`Background translation failed for ${key['en']} to ${lang}:`, error);
          pendingTranslations.delete(cacheKey);
        });

      return key['en']; // Return English immediately
    }

    return key['en'] || key[Object.keys(key)[0]] || '';
  }

  // Handle string keys
  const translation = translations[key];
  if (translation) {
    if (translation[lang]) {
      return translation[lang];
    }

    const cacheKey = `${key}_${lang}`;

    // Check cache first
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    // Check if translation is pending
    if (pendingTranslations.has(cacheKey)) {
      return translation['en'] || key; // Return English while translation is in progress
    }

    // Start background translation
    if (translation['en']) {
      pendingTranslations.add(cacheKey);
      translationService.translateWithCache(translation['en'], lang, 'en')
        .then(translated => {
          translationCache.set(cacheKey, translated);
          translation[lang] = translated; // Update translations object
          pendingTranslations.delete(cacheKey);
        })
        .catch(error => {
          console.error(`Background translation failed for ${key} to ${lang}:`, error);
          pendingTranslations.delete(cacheKey);
        });
    }

    return translation['en'] || key; // Return English immediately
  }

  // Handle unknown keys
  const unknownCacheKey = `unknown_${key}_${lang}`;

  if (translationCache.has(unknownCacheKey)) {
    return translationCache.get(unknownCacheKey)!;
  }

  if (pendingTranslations.has(unknownCacheKey)) {
    return key; // Return original while translation is in progress
  }

  // Start background translation for unknown keys
  pendingTranslations.add(unknownCacheKey);
  translationService.translateWithCache(key, lang, 'en')
    .then(translated => {
      translationCache.set(unknownCacheKey, translated);
      pendingTranslations.delete(unknownCacheKey);
    })
    .catch(error => {
      console.error(`Translation failed for unknown key ${key} to ${lang}:`, error);
      pendingTranslations.delete(unknownCacheKey);
    });

  return key; // Return original immediately
}

// Function to auto-fill missing translations for a specific language
export async function fillMissingTranslations(language: LanguageCode): Promise<void> {
  console.log(`Auto-filling missing translations for ${language}...`);

  for (const [key, translationObj] of Object.entries(translations)) {
    if (!translationObj[language] && translationObj['en']) {
      try {
        const translatedText = await translationService.translateWithCache(
          translationObj['en'],
          language,
          'en'
        );

        // Update the translations object
        translationObj[language] = translatedText;
        console.log(`Translated "${translationObj['en']}" to "${translatedText}" for ${language}`);
      } catch (error) {
        console.error(`Failed to translate ${key} to ${language}:`, error);
      }
    }
  }

  console.log(`Finished auto-filling translations for ${language}`);
}

export const menuItems: MenuItem[] = [
  {
    label: {
      en: 'Dashboard',
      hi: 'डैशबोर्ड',
      ta: 'டாஷ்போர்டு',
      bn: 'ড্যাশবোর্ড',
      te: 'డాష్‌బోర్డ్',
      gu: 'ડેશબોર્ડ',
      mr: 'डॅशबोर्ड',
      kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      ml: 'ഡാഷ്‌ബോർഡ്',
      pa: 'ਡੈਸ਼ਬੋਰਡ',
      as: 'ডেশ্ববোর্ড',
      or: 'ଡ୍ୟାସବୋର୍ଡ',
      ur: 'ڈیش بورڈ',
      // Add more as needed, fallback to en
    },
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: {
      en: 'Artisan Buddy',
      hi: 'कारीगर मित्र',
      ta: 'கைவினைஞர் நண்பர்',
      bn: 'কারিগর বন্ধু',
      te: 'కళాకారుల స్నేహితుడు',
      gu: 'કારીગર મિત્ર',
      mr: 'कारागीर मित्र',
      kn: 'ಕುಶಲಕರ್ಮಿ ಸ್ನೇಹಿತ',
      ml: 'കരകൗശല സുഹൃത്ത്',
      pa: 'ਕਾਰੀਗਰ ਦੋਸਤ',
      as: 'শিল্পী বন্ধু',
      or: 'କାରିଗର ବନ୍ଧୁ',
      ur: 'کاریگر دوست',
    },
    icon: BotMessageSquare,
    path: "/artisan-buddy",
  },
  {
    label: {
      en: 'Product Creator',
      hi: 'उत्पाद निर्माता',
      ta: 'தயாரிப்பு உருவாக்கி',
      bn: 'প্রোডাক্ট ক্রিয়েটর',
      te: 'ప్రాడక్ట్ క్రియేటర్',
      gu: 'પ્રોડક્ટ ક્રિએટર',
      mr: 'प्रोडक्ट क्रिएटर',
      kn: 'ಪ್ರಾಡಕ್ಟ್ ಕ್ರಿಯೇಟರ್',
      ml: 'പ്രാഡക്ട് ക്രിയേറ്റർ',
      pa: 'ਪ੍ਰਾਡਕਟ ਕ੍ਰਿਏਟਰ',
      as: 'প্রোডাক্ট ক্রিয়েটর',
      or: 'ଉତ୍ପାଦ ସୃଷ୍ଟିକର୍ତ୍ତା',
      ur: 'پروڈکٹ کریٹر',
    },
    icon: Sparkles,
    path: "/smart-product-creator",
  },
  {
    label: {
      en: 'Trend Spotter',
      hi: 'ट्रेंड स्पॉटर',
      ta: 'ட்ரெண்ட் ஸ்பாட்டர்',
      bn: 'ট্রেন্ড স্পটার',
      te: 'ట్రెండ్ స్పాటర్',
      gu: 'ટ્રેન્ડ સ્પોટર',
      mr: 'ट्रेंड स्पॉटर',
      kn: 'ಟ್ರೆಂಡ್ ಸ್ಪಾಟರ್',
      ml: 'ട്രെൻഡ് സ്പോട്ടർ',
      pa: 'ਟ੍ਰੈਂਡ ਸਪੌਟਰ',
      as: 'ট্রেন্ড স্পটার',
      or: 'ଟ୍ରେଣ୍ଡ ସ୍ପଟର',
      ur: 'ٹرینڈ سپاٹر',
    },
    icon: Palette,
    path: "/trend-spotter",
  },
  {
    label: {
      en: 'Design Generator',
      hi: 'डिज़ाइन जेनरेटर',
      ta: 'வடிவமைப்பு உருவாக்கி',
      bn: 'ডিজাইন জেনারেটর',
      te: 'డిజైన్ జనరేటర్',
      gu: 'ડિઝાઇન જનરેટર',
      mr: 'डिझाइन जनरेटर',
      kn: 'ಡಿಜೈನ್ ಜನರೇಟರ್',
      ml: 'ഡിസൈൻ ജനറേറ്റർ',
      pa: 'ਡਿਜ਼ਾਇਨ ਜਨਰੇਟਰ',
      as: 'ডিজাইন জেনাৰেটৰ',
      or: 'ଡିଜାଇନ୍ ଜନରେଟର',
      ur: 'ڈیزائن جنریٹر',
    },
    icon: Sparkles,
    path: "/ai-image-generator",
  },
  {
    label: {
      en: 'Buyer Connect',
      hi: 'क्रेता कनेक्ट',
      ta: 'வாங்குபவர் இணைப்பு',
      bn: 'ক্রেতা সংযোগ',
      te: 'కొనుగోలుదారు కనెక్ట్',
      gu: 'ખરીદદાર કનેક્ટ',
      mr: 'खरेदीदार कनेक्ट',
      kn: 'ಖರೀದಿದಾರ ಕನೆಕ್ಟ್',
      ml: 'വാങ്ങുന്നയാൾ കണക്ട്',
      pa: 'ਖਰੀਦਦਾਰ ਕਨੈਕਟ',
      as: 'ক্রেতা সংযোগ',
      or: 'କ୍ରେତା ସଂଯୋଗ',
      ur: 'خریدار کنیکٹ',
    },
    icon: Users,
    path: "/buyer-connect",
  },
  {
    label: {
      en: 'Inventory',
      hi: 'इन्वेंटरी',
      ta: 'சரக்கு',
      bn: 'ইনভেন্টরি',
      te: 'ఇన్వెంటరీ',
      gu: 'ઇન્વેન્ટરી',
      mr: 'इन्व्हेंटरी',
      kn: 'ඉන්ವೆಂಟರಿ',
      ml: 'ഇൻവെന്ററി',
      pa: 'ਇਨਵੈਂਟਰੀ',
      as: 'ইনভেন্টরি',
      or: 'ଇନଭେଣ୍ଟୋରୀ',
      ur: 'انوینٹری',
    },
    icon: Package,
    path: "/dashboard/inventory",
  },
  {
    label: {
      en: 'Global Bazaar',
      hi: 'ग्लोबल बाजार',
      ta: 'உலக பஜார்',
      bn: 'গ্লোবাল বাজার',
      te: 'గ్లోబల్ బజార్',
      gu: 'ગ્લોબલ બજાર',
      mr: 'ग्लोबल बाजार',
      kn: 'ಗ್ಲೋಬಲ್ ಬಜಾರ್',
      ml: 'ഗ്ലോബൽ ബസാർ',
      pa: 'ਗਲੋਬਲ ਬਜ਼ਾਰ',
      as: 'গ্লোবাল বজাৰ',
      or: 'ଗ୍ଲୋବାଲ୍ ବଜାର୍',
      ur: 'گلوبل بازار',
    },
    icon: ShoppingCart,
    path: "/marketplace"
  },
  {
    label: {
      en: 'CertiCraft',
      hi: 'सर्टीक्राफ्ट',
      ta: 'செர்டிகிராஃப்ட்',
      bn: 'সার্টিক্রাফ্ট',
      te: 'సర్టిక్రాఫ్ట్',
      gu: 'સર્ટીક્રાફ્ટ',
      mr: 'सर्टीक्राफ्ट',
      kn: 'ಸರ್ಟಿಕ್ರಾಫ್ಟ್',
      ml: 'സർട്ടിക്രാഫ്റ്റ്',
      pa: 'ਸਰਟੀਕ੍ਰਾਫਟ',
      as: 'সার্টিক্রাফ্ট',
      or: 'ସର୍ଟିକ୍ରାଫ୍ଟ',
      ur: 'سرٹی کرافٹ',
    },
    icon: ShieldCheck,
    path: "/trust-layer",
  },
  {
    label: {
      en: 'Scheme Sahayak',
      hi: 'स्कीम सहायक',
      ta: 'திட்டம் சஹாயக்',
      bn: 'স্কিম সহায়ক',
      te: 'ప్రభుత్వ పథకం హెచ్చরికలు',
      gu: 'સ્કીમ સહાયક',
      mr: 'स्कीम सहायक',
      kn: 'ಸ್ಕೀಮ್ ಸಹಾಯಕ',
      ml: 'സ്കീം സഹായക്',
      pa: 'ਸਕੀਮ ਸਹਾਇਕ',
      as: 'স্কিম সহায়ক',
      or: 'ସ୍କିମ୍ ସହାୟକ',
      ur: 'سکیم سہایک',
    },
    icon: ScrollText,
    path: "/scheme-sahayak",
  },
  {
    label: {
      en: 'Shop',
      hi: 'दुकान',
      ta: 'அந்தரங்கம்',
      bn: 'দোকান',
      te: 'అంగడీ',
      gu: 'દુકાન',
      mr: 'दुकान',
      kn: 'ಅಂಗಡಿ',
      ml: 'അംഗടി',
      pa: 'ਦੁਕਾਨ',
      as: 'দোকান',
      or: 'ଦୋକାନ',
      ur: 'دکان',
    },
    icon: ShoppingCart,
    path: "/marketplace",
    hidden: true,
  },
  {
    label: {
      en: 'DigitalKhata',
      hi: 'डिजिटल खाता',
      ta: 'டிஜிட்டல் காதா',
      bn: 'ডিজিটাল খাতা',
      te: 'డిజిటల్ ఖాతా',
      gu: 'ડિજિટલ ખાતું',
      mr: 'डिजिटल खाते',
      kn: 'ಡಿಜಿಟಲ್ ಖಾತೆ',
      ml: 'ഡിജിറ്റൽ ഖാത',
      pa: 'ਡਿਜੀਟਲ ਖਾਤਾ',
      as: 'ডিজিটেল খাতা',
      or: 'ଡିଜିଟାଲ୍ ଖାତା',
      ur: 'ڈیجیٹل کھاتہ',
    },
    icon: Calculator,
    path: "/finance/dashboard",
  },
  {
    label: {
      en: 'Archived',
      hi: 'संग्रहीत',
      ta: 'காப்பகப்படுத்தப்பட்டது',
      bn: 'আর্কাইভ করা',
      te: 'ఆర్కైవ్ చేయబడింది',
      gu: 'આર્કાઇવ કરેલું',
      mr: 'आर्काइव्ह केलेले',
      kn: 'ಆರ್ಕೈವ್ ಮಾಡಲಾದ',
      ml: 'ആർക്കൈവ് ചെയ്തത്',
      pa: 'ਆਰਕਾਈਵ ਕੀਤਾ',
      as: 'আর্কাইভ কৰা',
      or: 'ଆର୍କାଇଭ୍ କରାଯାଇଥିବା',
      ur: 'آرکائیو کردہ',
    },
    icon: Archive,
    path: "/archived",
    hidden: true,
  },
  {
    label: {
      en: 'Drafts',
      hi: 'ड्राफ्ट',
      ta: 'வரைவுகள்',
      bn: 'খসড়া',
      te: 'డ్రాఫ్ట్‌లు',
      gu: 'ડ્રાફ્ટ',
      mr: 'मसुदे',
      kn: 'ಡ್ರಾಫ್ಟ್‌ಗಳು',
      ml: 'ഡ്രാഫ്റ്റുകൾ',
      pa: 'ਡ੍ਰਾਫਟ',
      as: 'খচৰা',
      or: 'ଡ୍ରାଫ୍ଟ',
      ur: 'ڈرافٹ',
    },
    icon: FileText,
    path: "/drafts",
    hidden: true,
  },
  {
    label: {
      en: 'Profile',
      hi: 'प्रोफ़ाइल',
      ta: 'சுயவிவரம்',
      bn: 'প্রোফাইল',
      te: 'ప్రొఫైల్',
      gu: 'પ્રોફાઇલ',
      mr: 'प्रोफाइल',
      kn: 'ಪ್ರೊಫೈಲ್',
      ml: 'പ്രൊഫൈൽ',
      pa: 'ਪ੍ਰੋਫਾਇਲ',
      as: 'প্ৰফাইল',
      or: 'ପ୍ରୋଫାଇଲ୍',
      ur: 'پروفائل',
    },
    icon: User,
    path: "/profile",
    hidden: true,
  },
  {
    label: {
      en: 'Multi-Marketplace',
      hi: 'बहु-बाजार',
      ta: 'பல-சந்தை',
      bn: 'মাল্টি-মার্কেটপ্লেস',
      te: 'మల్టీ-మార్కెట్‌ప్లేస్',
      gu: 'મલ્ટી-માર્કેટપ્લેસ',
      mr: 'मल्टी-मार्केटप्लेस',
      kn: 'ಮಲ್ಟಿ-ಮಾರ್ಕೆಟ್‌ಪ್ಲೇಸ್',
      ml: 'മൾട്ടി-മാർക്കറ്റ്പ്ലേസ്',
      pa: 'ਮਲਟੀ-ਮਾਰਕੀਟਪਲੇਸ',
      as: 'মাল্টি-মার্কেটপ্লেস',
      or: 'ମଲ୍ଟି-ମାର୍କେଟପ୍ଲେସ୍',
      ur: 'ملٹی مارکیٹ پلیس',
    },
    icon: Globe,
    path: "/multi-marketplace",
    hidden: true,
  },
  // Voice Demo and Voice Enrollment removed - converted to text-only chat
  {
    label: {
      en: 'Fair Price Engine',
      hi: 'उचित मूल्य इंजन',
      ta: 'நியாயமான விலை இயந்திரம்',
      bn: 'ন্যায্য মূল্য ইঞ্জিন',
      te: 'న్యాయమైన ధర ఇంజిన్',
      gu: 'ન્યાયી કિંમત એંજિન',
      mr: 'न्याय्य किंमत इंजिन',
      kn: 'ನ್ಯಾಯ ಮುಲ್ಯ ಎಂಜಿನ್',
      ml: 'ന്യായ വില എഞ്ചിൻ',
      pa: 'ਨਿਆਇ ਮੁੱਲ ਇੰਜਣ',
      as: 'ন্যায্য মূল্য ইঞ্জিন',
      or: 'ନ୍ୟାୟ ମୂଲ୍ୟ ଇଞ୍ଜିନ୍',
      ur: 'منصفانہ قیمت انجن',
    },
    icon: DollarSign,
    path: "/fair-price-engine",
    hidden: true,
  },
];

export const features: Feature[] = [
  {
    title: { en: 'Artisan Buddy', hi: 'कारीगर बडी', ta: 'கைவினைஞர் நண்பன்', bn: 'শিল্পী বন্ধু', te: 'ఆర్టిసాన్ బడ్డీ' },
    description: { en: "A virtual agent copy of you that answers buyer queries 24/7 when you are offline.", hi: "आपकी एक वर्चुअल एजेंट कॉपी जो आपके ऑफ़लाइन होने पर 24/7 खरीदारों के सवालों का जवाब देती है।", ta: "நீங்கள் ஆஃப்லைனில் இருக்கும்போது 24/7 வாங்குபவர் கேள்விகளுக்கு பதிலளிக்கும் உங்களின் ஒரு மெய்நிகர் முகவர் நகல்.", bn: "আপনার একটি ভার্চুয়াল এজেন্ট অনুলিপি যা আপনি অফলাইনে থাকলে ক্রেতার প্রশ্নের 24/7 উত্তর দেয়।", te: "మీరు ఆఫ్‌లైన్‌లో ఉన్నప్పుడు 24/7 కొనుగోలుదారు ప్రశ్నలకు సమాధానమిచ్చే మీ వర్చువల్ ఏజెంట్ కాపీ." },
    icon: BotMessageSquare,
    path: "/artisan-buddy",
    color: "text-red-500",
  },
  {
    title: { en: 'Product Creator', hi: 'उत्पाद निर्माता', ta: 'தயாரிப்பு உருவாக்கி', bn: 'প্রোডাক্ট ক্রিয়েটর', te: 'ప్రాడక్ట్ క్రియేటర్' },
    description: { en: "AI-powered product creation and management system for artisans.", hi: "कारीगरों के लिए AI-संचालित उत्पाद निर्माण और प्रबंधन प्रणाली।", ta: "கைவினைஞர்களுக்கான AI-சக்திமிக்க தயாரிப்பு உருவாக்கம் மற்றும் நிர்வாக அமைப்பு.", bn: "শিল্পীদের জন্য AI-চালিত পণ্য তৈরি এবং ব্যবস্থাপনা সিস্টেম।", te: "కళాకారుల కోసం AI- శక్తితో కూడిన ఉత్పత్తి సృష్టి మరియు నిర్వహణ వ్యవస్థ." },
    icon: Sparkles,
    path: "/smart-product-creator",
    color: "text-orange-500",
  },
  {
    title: { en: 'Buyer Connect', hi: 'क्रेता कनेक्ट', ta: 'வாங்குபவர் இணைப்பு', bn: 'ক্রেতা সংযোগ', te: 'కొనుగోలుదారు కనెక్ట్' },
    description: { en: "Enables direct buyer-artisan communication across languages, supporting chat and voice.", hi: "चैट और आवाज का समर्थन करते हुए, भाषाओं में प्रत्यक्ष क्रेता-कारीगर संचार को सक्षम बनाता है।", ta: " அரட்டை மற்றும் குரலை ஆதரிக்கும் மொழிகளில் நேரடி வாங்குபவர்-கைவினைஞர் தகவல்தொடர்பை செயல்படுத்துகிறது.", bn: "চ্যাট এবং ভয়েস সমর্থনকারী ভাষা জুড়ে সরাসরি ক্রেতা-শিল্পী যোগাযোগ সক্ষম করে।", te: "చాట్ మరియు వాయిస్‌కు మద్దతు ఇస్తూ భాషల అంతటా ప్రత్యక్ష కొనుగోలుదారు-చేతివృత్తులవారి కమ్యూనికేషన్‌ను ప్రారంభిస్తుంది." },
    icon: Users,
    path: "/buyer-connect",
    color: "text-green-500",
  },
  {
    title: { en: 'Global Bazaar', hi: 'ग्लोबल बाजार', ta: 'உலக பஜார்', bn: 'গ্লোবাল বাজার', te: 'గ్లోబల్ బజార్' },
    description: { en: "Sync your products across multiple online marketplaces with a single click.", hi: "एक ही क्लिक से अपने उत्पादों को कई ऑनलाइन मार्केटप्लेस पर सिंक करें।", ta: "ஒரே கிளிக்கில் பல ஆன்லைன் சந்தைகளில் உங்கள் தயாரிப்புகளை ஒத்திசைக்கவும்.", bn: "একক ক্লিকে একাধিক অনলাইন মার্কেটপ্লেস জুড়ে আপনার পণ্যগুলি সিঙ্ক করুন।", te: "ఒకే క్లిక్‌తో బహుళ ఆన్‌లైన్ మార్కెట్‌ప్లేస్‌లలో మీ ఉత్పత్తులను సమకాలీకరించండి." },
    icon: Package,
    path: "/multi-marketplace",
    color: "text-blue-500",
  },
  {
    title: { en: 'CertiCraft', hi: 'सर्टीक्राफ्ट', ta: 'செர்டிகிராஃப்ட்', bn: 'সার্টিক্রাফ্ট', te: 'సర్టిక్రాఫ్ట్' },
    description: { en: "Verify authenticity and build trust with blockchain-backed product certification.", hi: "ब्लॉकचेन-समर्थित उत्पाद प्रमाणन के साथ प्रामाणिकता सत्यापित करें और विश्वास बनाएं।", ta: "பிளாக்செயின் ஆதரவு தயாரிப்பு சான்றிதழுடன் நம்பகத்தன்மையைச் சரிபார்த்து நம்பிக்கையை உருவாக்குங்கள்.", bn: "ব্লকচেন-সমর্থিত পণ্য শংসাপত্রের মাধ্যমে সত্যতা যাচাই করুন এবং বিশ্বাস তৈরি করুন।", te: "బ్లాక్‌చెయిన్-మద్దతుగల ఉత్పత్తి ధృవీకరణతో ప్రామాణికతను ధృవీకరించండి మరియు నమ్మకాన్ని పెంచుకోండి." },
    icon: ShieldCheck,
    path: "/trust-layer",
    color: "text-indigo-500",
  },
  {
    title: { en: 'Scheme Sahayak', hi: 'स्कीम सहायक', ta: 'திட்டம் சஹாயக்', bn: 'স্কিম সহায়ক', te: 'స్కీమ్ సహాయక్' },
    description: { en: "Keeps you informed of subsidies, training, and schemes you are eligible for.", hi: "आपको सब्सिडी, प्रशिक्षण और योजनाओं के बारे में सूचित रखता है जिनके लिए आप पात्र हैं।", ta: " மானியங்கள், பயிற்சி மற்றும் நீங்கள் தகுதியுள்ள திட்டங்கள் குறித்து உங்களுக்குத் தெரிவிக்கிறது.", bn: "আপনাকে ভর্তুকি, প্রশিক্ষণ এবং স্কিম সম্পর্কে অবহিত রাখে যার জন্য আপনি যোগ্য।", te: "మీరు అర్హులైన సబ్సిడీలు, శిక్షణ మరియు పథకాల గురించి మీకు తెలియజేస్తుంది." },
    icon: ScrollText,
    path: "/scheme-sahayak",
    color: "text-purple-500",
  },
  {
    title: { en: 'DigitalKhata', hi: 'डिजिटल खाता', ta: 'டிஜிட்டல் காதா', bn: 'ডিজিটাল খাতা', te: 'డిజిటల్ ఖాతా' },
    description: { en: "Track sales performance, analyze trends, and get AI-powered financial insights for your business.", hi: "अपने व्यवसाय के लिए बिक्री प्रदर्शन को ट्रैक करें, रुझानों का विश्लेषण करें और AI-संचालित वित्तीय अंतर्दृष्टि प्राप्त करें।", ta: "உங்கள் வணிகத்திற்கான விற்பனை செயல்திறனைக் கண்காணிக்கவும், போக்குகளை பகுப்பாய்வு செய்யவும், AI-ஆல் இயக்கப்படும் நிதி நுண்ணறிவுகளைப் பெறவும்.", bn: "আপনার ব্যবসার জন্য বিক্রয় কর্মক্ষমতা ট্র্যাক করুন, প্রবণতা বিশ্লেষণ করুন এবং AI-চালিত আর্থিক অন্তর্দৃষ্টি পান।", te: "మీ వ్యాపారం కోసం అమ్మకాల పనితీరును ట్రాక్ చేయండి, ధోరణులను విశ్లేషించండి మరియు AI-ఆధారిత ఆర్థిక అంతర్దృష్టులను పొందండి." },
    icon: Calculator,
    path: "/finance/dashboard",
    color: "text-emerald-500",
  },
  {
    title: { en: 'Design Generator', hi: 'डिज़ाइन जेनरेटर', ta: 'வடிவமைப்பு உருவாக்கி', bn: 'ডিজাইন জেনারেটর', te: 'డిజైన్ జనరేటర్' },
    description: { en: "Generate stunning product images using AI with custom styles, colors, and artistic effects.", hi: "कस्टम स्टाइल, रंग और कलात्मक प्रभावों के साथ AI का उपयोग करके शानदार उत्पाद छवियां उत्पन्न करें।", ta: "தனிப்பயன் பாணிகள், நிறங்கள் மற்றும் கலை விளைவுகளுடன் AI ஐப் பயன்படுத்தி அற்புதமான தயாரிப்பு படங்களை உருவாக்கவும்।", bn: "কাস্টম স্টাইল, রঙ এবং শৈল্পিক প্রভাব সহ AI ব্যবহার করে চমৎকার পণ্যের ছবি তৈরি করুন।", te: "కస్టమ్ స్టైల్‌లు, రంగులు మరియు కళాత్మక ప్రభావాలతో AI ని ఉపయోగించి అద్భుతమైన ఉత్పత్తి చిత్రాలను రూపొందించండి." },
    icon: Sparkles,
    path: "/ai-image-generator",
    color: "text-purple-500",
  },
  // Voice Demo removed - converted to text-only chat
];
