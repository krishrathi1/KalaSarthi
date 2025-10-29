/**
 * Scheme Sahayak Translations
 * Supports 12 Indian languages with context-aware translations
 */

export type SupportedLanguage = 
  | 'en' | 'hi' | 'ta' | 'bn' | 'te' | 'gu' 
  | 'mr' | 'kn' | 'ml' | 'pa' | 'or' | 'ur';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  gu: { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', rtl: false },
  kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  ml: { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  pa: { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  or: { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true }
};

export const translations: Record<string, Record<SupportedLanguage, string>> = {
  // App Title
  'app.title': {
    en: 'Scheme Sahayak',
    hi: 'योजना सहायक',
    ta: 'திட்ட உதவியாளர்',
    bn: 'স্কিম সহায়ক',
    te: 'పథకం సహాయకుడు',
    gu: 'યોજના સહાયક',
    mr: 'योजना सहाय्यक',
    kn: 'ಯೋಜನೆ ಸಹಾಯಕ',
    ml: 'പദ്ധതി സഹായി',
    pa: 'ਯੋਜਨਾ ਸਹਾਇਕ',
    or: 'ଯୋଜନା ସହାୟକ',
    ur: 'اسکیم سہایک'
  },

  // Navigation
  'nav.home': {
    en: 'Home',
    hi: 'होम',
    ta: 'முகப்பு',
    bn: 'হোম',
    te: 'హోమ్',
    gu: 'હોમ',
    mr: 'होम',
    kn: 'ಮುಖಪುಟ',
    ml: 'ഹോം',
    pa: 'ਹੋਮ',
    or: 'ହୋମ',
    ur: 'ہوم'
  },

  'nav.recommendations': {
    en: 'Recommendations',
    hi: 'सिफारिशें',
    ta: 'பரிந்துரைகள்',
    bn: 'সুপারিশ',
    te: 'సిఫార్సులు',
    gu: 'ભલામણો',
    mr: 'शिफारसी',
    kn: 'ಶಿಫಾರಸುಗಳು',
    ml: 'ശുപാർശകൾ',
    pa: 'ਸਿਫ਼ਾਰਸ਼ਾਂ',
    or: 'ସୁପାରିଶ',
    ur: 'سفارشات'
  },

  'nav.documents': {
    en: 'Documents',
    hi: 'दस्तावेज़',
    ta: 'ஆவணங்கள்',
    bn: 'নথি',
    te: 'పత్రాలు',
    gu: 'દસ્તાવેજો',
    mr: 'कागदपत्रे',
    kn: 'ದಾಖಲೆಗಳು',
    ml: 'രേഖകൾ',
    pa: 'ਦਸਤਾਵੇਜ਼',
    or: 'ଦଲିଲ',
    ur: 'دستاویزات'
  },

  'nav.applications': {
    en: 'Applications',
    hi: 'आवेदन',
    ta: 'விண்ணப்பங்கள்',
    bn: 'আবেদন',
    te: 'దరఖాస్తులు',
    gu: 'અરજીઓ',
    mr: 'अर्ज',
    kn: 'ಅರ್ಜಿಗಳು',
    ml: 'അപേക്ഷകൾ',
    pa: 'ਅਰਜ਼ੀਆਂ',
    or: 'ଆବେଦନ',
    ur: 'درخواستیں'
  },

  'nav.notifications': {
    en: 'Notifications',
    hi: 'सूचनाएं',
    ta: 'அறிவிப்புகள்',
    bn: 'বিজ্ঞপ্তি',
    te: 'నోటిఫికేషన్లు',
    gu: 'સૂચનાઓ',
    mr: 'सूचना',
    kn: 'ಅಧಿಸೂಚನೆಗಳು',
    ml: 'അറിയിപ്പുകൾ',
    pa: 'ਸੂਚਨਾਵਾਂ',
    or: 'ବିଜ୍ଞପ୍ତି',
    ur: 'اطلاعات'
  },

  // AI Recommendations
  'ai.title': {
    en: 'AI Recommendations',
    hi: 'एआई सिफारिशें',
    ta: 'AI பரிந்துரைகள்',
    bn: 'AI সুপারিশ',
    te: 'AI సిఫార్సులు',
    gu: 'AI ભલામણો',
    mr: 'AI शिफारसी',
    kn: 'AI ಶಿಫಾರಸುಗಳು',
    ml: 'AI ശുപാർശകൾ',
    pa: 'AI ਸਿਫ਼ਾਰਸ਼ਾਂ',
    or: 'AI ସୁପାରିଶ',
    ur: 'AI سفارشات'
  },

  'ai.confidence': {
    en: 'Confidence',
    hi: 'विश्वास',
    ta: 'நம்பிக்கை',
    bn: 'আত্মবিশ্বাস',
    te: 'విశ్వాసం',
    gu: 'વિશ્વાસ',
    mr: 'विश्वास',
    kn: 'ವಿಶ್ವಾಸ',
    ml: 'വിശ്വാസം',
    pa: 'ਵਿਸ਼ਵਾਸ',
    or: 'ବିଶ୍ୱାସ',
    ur: 'اعتماد'
  },

  'ai.success_probability': {
    en: 'Success Probability',
    hi: 'सफलता की संभावना',
    ta: 'வெற்றி வாய்ப்பு',
    bn: 'সাফল্যের সম্ভাবনা',
    te: 'విజయ సంభావ్యత',
    gu: 'સફળતાની સંભાવના',
    mr: 'यशाची शक्यता',
    kn: 'ಯಶಸ್ಸಿನ ಸಂಭವನೀಯತೆ',
    ml: 'വിജയ സാധ്യത',
    pa: 'ਸਫਲਤਾ ਦੀ ਸੰਭਾਵਨਾ',
    or: 'ସଫଳତାର ସମ୍ଭାବନା',
    ur: 'کامیابی کا امکان'
  },

  // Document Management
  'doc.upload': {
    en: 'Upload Document',
    hi: 'दस्तावेज़ अपलोड करें',
    ta: 'ஆவணத்தை பதிவேற்றவும்',
    bn: 'নথি আপলোড করুন',
    te: 'పత్రాన్ని అప్‌లోడ్ చేయండి',
    gu: 'દસ્તાવેજ અપલોડ કરો',
    mr: 'कागदपत्र अपलोड करा',
    kn: 'ದಾಖಲೆಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    ml: 'രേഖ അപ്‌ലോഡ് ചെയ്യുക',
    pa: 'ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ',
    or: 'ଦଲିଲ ଅପଲୋଡ୍ କରନ୍ତୁ',
    ur: 'دستاویز اپ لوڈ کریں'
  },

  'doc.capture': {
    en: 'Capture Photo',
    hi: 'फोटो लें',
    ta: 'புகைப்படம் எடுக்கவும்',
    bn: 'ছবি তুলুন',
    te: 'ఫోటో తీయండి',
    gu: 'ફોટો લો',
    mr: 'फोटो घ्या',
    kn: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    ml: 'ഫോട്ടോ എടുക്കുക',
    pa: 'ਫੋਟੋ ਲਓ',
    or: 'ଫଟୋ ନିଅନ୍ତୁ',
    ur: 'تصویر لیں'
  },

  'doc.verified': {
    en: 'Verified',
    hi: 'सत्यापित',
    ta: 'சரிபார்க்கப்பட்டது',
    bn: 'যাচাইকৃত',
    te: 'ధృవీకరించబడింది',
    gu: 'ચકાસાયેલ',
    mr: 'सत्यापित',
    kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    ml: 'പരിശോധിച്ചു',
    pa: 'ਪ੍ਰਮਾਣਿਤ',
    or: 'ଯାଞ୍ଚ କରାଯାଇଛି',
    ur: 'تصدیق شدہ'
  },

  'doc.pending': {
    en: 'Pending',
    hi: 'लंबित',
    ta: 'நிலுவையில்',
    bn: 'মুলতুবি',
    te: 'పెండింగ్',
    gu: 'બાકી',
    mr: 'प्रलंबित',
    kn: 'ಬಾಕಿ',
    ml: 'തീർപ്പാക്കാത്തത്',
    pa: 'ਬਕਾਇਆ',
    or: 'ବିଚାରାଧୀନ',
    ur: 'زیر التواء'
  },

  // Application Status
  'app.status.draft': {
    en: 'Draft',
    hi: 'मसौदा',
    ta: 'வரைவு',
    bn: 'খসড়া',
    te: 'డ్రాఫ్ట్',
    gu: 'ડ્રાફ્ટ',
    mr: 'मसुदा',
    kn: 'ಕರಡು',
    ml: 'കരട്',
    pa: 'ਡਰਾਫਟ',
    or: 'ଡ୍ରାଫ୍ଟ',
    ur: 'مسودہ'
  },

  'app.status.submitted': {
    en: 'Submitted',
    hi: 'जमा किया गया',
    ta: 'சமர்ப்பிக்கப்பட்டது',
    bn: 'জমা দেওয়া হয়েছে',
    te: 'సమర్పించబడింది',
    gu: 'સબમિટ કર્યું',
    mr: 'सबमिट केले',
    kn: 'ಸಲ್ಲಿಸಲಾಗಿದೆ',
    ml: 'സമർപ്പിച്ചു',
    pa: 'ਜਮ੍ਹਾਂ ਕੀਤਾ',
    or: 'ଦାଖଲ କରାଯାଇଛି',
    ur: 'جمع کرایا گیا'
  },

  'app.status.approved': {
    en: 'Approved',
    hi: 'स्वीकृत',
    ta: 'அங்கீகரிக்கப்பட்டது',
    bn: 'অনুমোদিত',
    te: 'ఆమోదించబడింది',
    gu: 'મંજૂર',
    mr: 'मंजूर',
    kn: 'ಅನುಮೋದಿಸಲಾಗಿದೆ',
    ml: 'അംഗീകരിച്ചു',
    pa: 'ਮਨਜ਼ੂਰ',
    or: 'ଅନୁମୋଦିତ',
    ur: 'منظور شدہ'
  },

  'app.status.rejected': {
    en: 'Rejected',
    hi: 'अस्वीकृत',
    ta: 'நிராகரிக்கப்பட்டது',
    bn: 'প্রত্যাখ্যাত',
    te: 'తిరస్కరించబడింది',
    gu: 'નકારી કાઢ્યું',
    mr: 'नाकारले',
    kn: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    ml: 'നിരസിച്ചു',
    pa: 'ਰੱਦ ਕੀਤਾ',
    or: 'ପ୍ରତ୍ୟାଖ୍ୟାନ',
    ur: 'مسترد'
  },

  // Common Actions
  'action.apply': {
    en: 'Apply Now',
    hi: 'अभी आवेदन करें',
    ta: 'இப்போது விண்ணப்பிக்கவும்',
    bn: 'এখনই আবেদন করুন',
    te: 'ఇప్పుడే దరఖాస్తు చేయండి',
    gu: 'હમણાં અરજી કરો',
    mr: 'आता अर्ज करा',
    kn: 'ಈಗ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    ml: 'ഇപ്പോൾ അപേക്ഷിക്കുക',
    pa: 'ਹੁਣੇ ਅਰਜ਼ੀ ਦਿਓ',
    or: 'ବର୍ତ୍ତମାନ ଆବେଦନ କରନ୍ତୁ',
    ur: 'ابھی درخواست دیں'
  },

  'action.save': {
    en: 'Save',
    hi: 'सहेजें',
    ta: 'சேமிக்கவும்',
    bn: 'সংরক্ষণ করুন',
    te: 'సేవ్ చేయండి',
    gu: 'સાચવો',
    mr: 'जतन करा',
    kn: 'ಉಳಿಸಿ',
    ml: 'സംരക്ഷിക്കുക',
    pa: 'ਸੰਭਾਲੋ',
    or: 'ସଂରକ୍ଷଣ କରନ୍ତୁ',
    ur: 'محفوظ کریں'
  },

  'action.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    ta: 'ரத்துசெய்',
    bn: 'বাতিল করুন',
    te: 'రద్దు చేయండి',
    gu: 'રદ કરો',
    mr: 'रद्द करा',
    kn: 'ರದ್ದುಮಾಡಿ',
    ml: 'റദ്ദാക്കുക',
    pa: 'ਰੱਦ ਕਰੋ',
    or: 'ବାତିଲ୍ କରନ୍ତୁ',
    ur: 'منسوخ کریں'
  },

  'action.view_details': {
    en: 'View Details',
    hi: 'विवरण देखें',
    ta: 'விவரங்களைக் காண்க',
    bn: 'বিস্তারিত দেখুন',
    te: 'వివరాలను చూడండి',
    gu: 'વિગતો જુઓ',
    mr: 'तपशील पहा',
    kn: 'ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    ml: 'വിശദാംശങ്ങൾ കാണുക',
    pa: 'ਵੇਰਵੇ ਦੇਖੋ',
    or: 'ବିବରଣୀ ଦେଖନ୍ତୁ',
    ur: 'تفصیلات دیکھیں'
  },

  // Offline Messages
  'offline.title': {
    en: 'You are offline',
    hi: 'आप ऑफ़लाइन हैं',
    ta: 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள்',
    bn: 'আপনি অফলাইনে আছেন',
    te: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు',
    gu: 'તમે ઑફલાઇન છો',
    mr: 'तुम्ही ऑफलाइन आहात',
    kn: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ',
    ml: 'നിങ്ങൾ ഓഫ്‌ലൈനാണ്',
    pa: 'ਤੁਸੀਂ ਔਫਲਾਈਨ ਹੋ',
    or: 'ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି',
    ur: 'آپ آف لائن ہیں'
  },

  'offline.message': {
    en: 'Some features may be limited. Your changes will sync when you reconnect.',
    hi: 'कुछ सुविधाएं सीमित हो सकती हैं। पुनः कनेक्ट होने पर आपके परिवर्तन सिंक हो जाएंगे।',
    ta: 'சில அம்சங்கள் வரம்புக்குட்பட்டதாக இருக்கலாம். நீங்கள் மீண்டும் இணைக்கும்போது உங்கள் மாற்றங்கள் ஒத்திசைக்கப்படும்.',
    bn: 'কিছু বৈশিষ্ট্য সীমিত হতে পারে। আপনি পুনরায় সংযোগ করলে আপনার পরিবর্তনগুলি সিঙ্ক হবে।',
    te: 'కొన్ని ఫీచర్లు పరిమితం కావచ్చు. మీరు మళ్లీ కనెక్ట్ అయినప్పుడు మీ మార్పులు సమకాలీకరించబడతాయి।',
    gu: 'કેટલીક સુવિધાઓ મર્યાદિત હોઈ શકે છે. તમે ફરીથી કનેક્ટ થાઓ ત્યારે તમારા ફેરફારો સમન્વયિત થશે।',
    mr: 'काही वैशिष्ट्ये मर्यादित असू शकतात. तुम्ही पुन्हा कनेक्ट झाल्यावर तुमचे बदल समक्रमित होतील।',
    kn: 'ಕೆಲವು ವೈಶಿಷ್ಟ್ಯಗಳು ಸೀಮಿತವಾಗಿರಬಹುದು. ನೀವು ಮರುಸಂಪರ್ಕಿಸಿದಾಗ ನಿಮ್ಮ ಬದಲಾವಣೆಗಳು ಸಿಂಕ್ ಆಗುತ್ತವೆ।',
    ml: 'ചില സവിശേഷതകൾ പരിമിതപ്പെടുത്തിയേക്കാം. നിങ്ങൾ വീണ്ടും കണക്റ്റുചെയ്യുമ്പോൾ നിങ്ങളുടെ മാറ്റങ്ങൾ സമന്വയിപ്പിക്കും।',
    pa: 'ਕੁਝ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਸੀਮਤ ਹੋ ਸਕਦੀਆਂ ਹਨ। ਜਦੋਂ ਤੁਸੀਂ ਦੁਬਾਰਾ ਕਨੈਕਟ ਕਰੋਗੇ ਤਾਂ ਤੁਹਾਡੀਆਂ ਤਬਦੀਲੀਆਂ ਸਿੰਕ ਹੋ ਜਾਣਗੀਆਂ।',
    or: 'କିଛି ବୈଶିଷ୍ଟ୍ୟ ସୀମିତ ହୋଇପାରେ। ଆପଣ ପୁନଃ ସଂଯୋଗ କଲାବେଳେ ଆପଣଙ୍କର ପରିବର୍ତ୍ତନଗୁଡ଼ିକ ସିଙ୍କ ହେବ।',
    ur: 'کچھ خصوصیات محدود ہو سکتی ہیں۔ جب آپ دوبارہ منسلک ہوں گے تو آپ کی تبدیلیاں مطابقت پذیر ہوں گی۔'
  }
};

export function translate(key: string, lang: SupportedLanguage): string {
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

export function getLanguageInfo(lang: SupportedLanguage): LanguageInfo {
  return SUPPORTED_LANGUAGES[lang];
}

export function getAllLanguages(): LanguageInfo[] {
  return Object.values(SUPPORTED_LANGUAGES);
}
