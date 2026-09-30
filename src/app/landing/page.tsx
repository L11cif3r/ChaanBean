"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Coins,
  Briefcase,
  Home,
  TrendingUp,
  Facebook,
  Linkedin,
  Instagram,
  Bot,
  Activity,
  Network,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  FileText,
  Users,
  BarChart3,
  Building2,
  RefreshCw,
  Search,
  Scale,
  ArrowUpRight,
  Globe,
  Radio,
  Flame,
  AlertTriangle,
  Sliders,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FooterModals, ModalType } from "@/components/FooterModals";
import { OfficialInitiativesBar } from "@/components/OfficialInitiativesBar";

const INTEL_LANGUAGES = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
];

const MULTI_LANG_VERDICTS: Record<string, {
  highTrust: {
    badge: string;
    verdict: string;
    analysis: string;
    safeLimit: string;
    voiceText: string;
  };
  highRisk: {
    badge: string;
    verdict: string;
    analysis: string;
    safeLimit: string;
    voiceText: string;
  };
}> = {
  en: {
    highTrust: {
      badge: "CREDITWORTHY · GRADE A2 (LOW RISK)",
      verdict: "APPROVED FOR UNSECURED CREDIT UP TO ₹25 LAKHS",
      analysis: "AI Risk Verdict: Counterparty maintains 100% on-time GST filings, verified ₹18.4 Cr annual turnover, and zero adverse court litigations. High cash flow debt service capability observed. Safe max credit ceiling: ₹25 Lakhs on 30-day payment cycle with continuous watch.",
      safeLimit: "₹25,00,000",
      voiceText: "ChaanBean Voice: 'Hello, your payment of ₹2,40,000 for Invoice #8412 is scheduled for settlement today. Reply 1 to pay via UPI.'",
    },
    highRisk: {
      badge: "HIGH RISK · GRADE C3 (CAUTION REQUIRED)",
      verdict: "UNSECURED CREDIT DECLINED · CASH-ON-DELIVERY RECOMMENDED",
      analysis: "AI Risk Verdict: Counterparty has 4 consecutive GSTR-3B filing defaults, ₹62 Lakhs unsatisfied bank charge on MCA, and 2 active NCLT Section 9 disputes. Probability of delayed recovery is 89%. Unsecured credit not advised.",
      safeLimit: "₹0 (Advance / COD Only)",
      voiceText: "ChaanBean Voice: 'Statutory 45-day MSME demand notice has been dispatched. Compound interest @ 3x RBI bank rate is now accruing.'",
    },
  },
  hi: {
    highTrust: {
      badge: "ऋण योग्य · ग्रेड A2 (कम जोखिम)",
      verdict: "₹25 लाख तक असुरक्षित क्रेडिट के लिए स्वीकृत",
      analysis: "एआई जोखिम निर्णय: खरीदार का 100% समय पर जीएसटी फाइलिंग, ₹18.4 करोड़ सत्यापित वार्षिक टर्नओवर और कोई अदालती मुकदमा नहीं है। उच्च नकदी प्रवाह क्षमता। निरंतर निगरानी के साथ 30-दिवसीय चक्र पर ₹25 लाख तक सुरक्षित क्रेडिट की सिफारिश।",
      safeLimit: "₹25,00,000",
      voiceText: "छानबीन वॉयस: 'नमस्ते, चालान संख्या #8412 के ₹2,40,000 का भुगतान आज देय है। यूपीआई से भुगतान करने के लिए 1 दबाएं।'",
    },
    highRisk: {
      badge: "उच्च जोखिम · ग्रेड C3 (सावधानी आवश्यक)",
      verdict: "असुरक्षित ऋण अस्वीकृत · केवल अग्रिम / डिलीवरी पर नकद",
      analysis: "एआई जोखिम निर्णय: खरीदार के लगातार 4 जीएसटी रिटर्न डिफ़ॉल्ट, एमसीए पर ₹62 लाख का अधूरा बैंक प्रभार और 2 एनसीएलटी मुकदमे दर्ज हैं। विलंबित वसूली की संभावना 89% है। असुरक्षित ऋण की सलाह नहीं दी जाती।",
      safeLimit: "₹0 (केवल अग्रिम भुगतान)",
      voiceText: "छानबीन वॉयस: 'सांविधिक 45-दिवसीय एमएसएमई मांग नोटिस जारी किया गया है। आरबीआई बैंक दर के 3 गुना चक्रवृद्धि ब्याज लागू है।'",
    },
  },
  ta: {
    highTrust: {
      badge: "கடன் தகுதி · தரம் A2 (குறைந்த ஆபத்து)",
      verdict: "₹25 லட்சம் வரை பிணையில்லா கடன் அனுமதிக்கப்பட்டது",
      analysis: "AI கடன் முடிவு: 100% சரியான நேரத்தில் ஜிஎஸ்டி தாக்கல், ₹18.4 கோடி சரிபார்க்கப்பட்ட வருவாய், நீதிமன்ற வழக்குகள் இல்லை. 30 நாள் தவணையில் ₹25 லட்சம் வரை கடன் வழங்க பரிந்துரைக்கப்படுகிறது.",
      safeLimit: "₹25,00,000",
      voiceText: "சான்பீன் வாய்ஸ்: 'வணக்கம், இன்வாய்ஸ் #8412 க்கான ₹2,40,000 தொகை இன்று செலுத்தப்பட வேண்டும். யுபிஐ மூலம் செலுத்த 1 ஐ அழுத்தவும்.'",
    },
    highRisk: {
      badge: "அதிக ஆபத்து · தரம் C3 (எச்சரிக்கை தேவை)",
      verdict: "பிணையில்லா கடன் நிராகரிக்கப்பட்டது · ரொக்க விற்பனை மட்டும்",
      analysis: "AI கடன் முடிவு: தொடர்ந்து 4 ஜிஎஸ்டி தாக்கல் தோல்விகள், ₹62 லட்சம் நிலுவை மற்றும் 2 NCLT வழக்குகள் உள்ளன. கட்டணம் வசூலிப்பதில் 89% தாமத வாய்ப்பு உள்ளது.",
      safeLimit: "₹0 (முன்பணம் மட்டும்)",
      voiceText: "சான்பீன் வாய்ஸ்: 'சட்டப்பூர்வ 45-நாள் MSME கோரிக்கை நோட்டீஸ் அனுப்பப்பட்டுள்ளது. 3 மடங்கு கூட்டு வட்டி கணக்கிடப்படுகிறது.'",
    },
  },
  ml: {
    highTrust: {
      badge: "ക്രെഡിറ്റ് യോഗ്യത · ഗ്രേഡ് A2 (കുറഞ്ഞ റിസ്ക്)",
      verdict: "₹25 ലക്ഷം വരെ ഈടില്ലാത്ത ക്രെഡിറ്റ് അനുവദിച്ചു",
      analysis: "AI റിസ്ക് വിലയിരുത്തൽ: 100% സമയബന്ധിതമായ ജിഎസ്ടി ഫയലിംഗ്, ₹18.4 കോടി വാർഷിക വിറ്റുവരവ്, കോർട്ട് കേസുകളില്ല. 30 ദിവസത്തെ ക്രെഡിറ്റ് കാലാവധിയിൽ ₹25 ലക്ഷം വരെ അനുവദിക്കാം.",
      safeLimit: "₹25,00,000",
      voiceText: "ചാൻബീൻ വോയ്‌സ്: 'നമസ്കാരം, ഇൻവോയ്സ് #8412-ന്റെ ₹2,40,000 തുക ഇന്ന് അടയ്ക്കേണ്ടതാണ്. യുപിഐ വഴി പണമടയ്ക്കാൻ 1 അമർത്തുക.'",
    },
    highRisk: {
      badge: "ഉയർന്ന റിസ്ക് · ഗ്രേഡ് C3 (ജാഗ്രത വേണം)",
      verdict: "ഈടില്ലാത്ത ക്രെഡിറ്റ് നിരസിച്ചു · ക്യാഷ് ഓൺ ഡെലിവറി മാത്രം",
      analysis: "AI റിസ്ക് വിലയിരുത്തൽ: തുടർച്ചയായി 4 ജിഎസ്ടി ഡിഫോൾട്ടുകൾ, ₹62 ലക്ഷം ബാങ്ക് ചാർജ്, 2 NCLT തർക്കങ്ങൾ. പണം കുടിശ്ശികയാകാൻ 89% സാധ്യതയുണ്ട്.",
      safeLimit: "₹0 (മുൻകൂർ പേയ്‌മെന്റ് മാത്രം)",
      voiceText: "ചാൻബീൻ വോയ്‌സ്: 'നിയമപരമായ 45 ദിവസത്തെ എംഎസ്എംഇ ഡിമാൻഡ് നോട്ടീസ് അയച്ചു. 3 മടങ്ങ് കൂട്ടുപലിശ ബാധകമാണ്.'",
    },
  },
  mr: {
    highTrust: {
      badge: "क्रेडिट पात्र · ग्रेड A2 (कमी जोखीम)",
      verdict: "₹25 लाख पर्यंत असुरक्षित क्रेडिट मंजूर",
      analysis: "एआय जोखीम निर्णय: 100% वेळेवर जीएसटी रिटर्न, ₹18.4 कोटी वार्षिक उलाढाल आणि शून्य न्यायालयीन खटले. 30 दिवसांच्या मुदतीवर ₹25 लाख मर्यादेची शिफारस.",
      safeLimit: "₹25,00,000",
      voiceText: "छानबीन व्हॉइस: 'नमस्कार, चलन #8412 साठी ₹2,40,000 चे पेमेंट आज देय आहे. यूपीआय द्वारे भरण्यासाठी 1 दाबा.'",
    },
    highRisk: {
      badge: "उच्च जोखीम · ग्रेड C3 (सावधगिरी बाळगा)",
      verdict: "असुरक्षित क्रेडिट नाकारले · फक्त कॅश ऑन डिलिव्हरी",
      analysis: "एआय जोखीम निर्णय: सलग 4 जीएसटी रिटर्न डिफॉल्ट, ₹62 लाख बँक चार्ज आणि 2 एनसीएलटी खटले. पेमेंट अडकण्याची 89% शक्यता आहे.",
      safeLimit: "₹0 (फक्त आगाऊ रक्कम)",
      voiceText: "छानबीन व्हॉइस: 'वैधानिक 45-दिवसांची एमएसएमई मागणी नोटीस पाठवली आहे. 3 पट चक्रवाढ व्याज लागू होत आहे.'",
    },
  },
  gu: {
    highTrust: {
      badge: "ક્રેડિટ યોગ્ય · ગ્રેડ A2 (ઓછું જોખમ)",
      verdict: "₹25 લાખ સુધી અસુરક્ષિત ક્રેડિટ મંજૂર",
      analysis: "AI જોખમ ચુકાદો: 100% સમયસર જીએસટી, ₹18.4 કરોડ ટર્નઓવર અને કોઈ કાનૂની વિવાદ નથી. 30-દિવસની શરતો સાથે ₹25 લાખ સુધી ક્રેડિટ મર્યાદા સલામત છે.",
      safeLimit: "₹25,00,000",
      voiceText: "છાનબીન વોઈસ: 'નમસ્તે, ઇન્વૉઇસ #8412 માટે ₹2,40,000 ની ચુકવણી આજે બાકી છે. UPI થી ચૂકવવા 1 દબાવો.'",
    },
    highRisk: {
      badge: "ઉચ્ચ જોખમ · ગ્રેડ C3 (સાવધાની જરૂરી)",
      verdict: "અસુરક્ષિત ક્રેડિટ નકારી · માત્ર એડવાન્સ / રોકડ",
      analysis: "AI જોખમ ચુકાદો: સતત 4 જીએસટી ડિફોલ્ટ, ₹62 લાખ ચાર્જ અને 2 NCLT વિવાદો. રિકવરીમાં વિલંબ થવાની 89% સંભાવના છે.",
      safeLimit: "₹0 (માત્ર એડવાન્સ)",
      voiceText: "છાનબીન વોઈસ: 'કાયદાકીય 45-દિવસની MSME નોટિસ મોકલી છે. 3 ગણું ચક્રવૃદ્ધિ વ્યાજ ગણાઈ રહ્યું છે.'",
    },
  },
  kn: {
    highTrust: {
      badge: "ಕ್ರೆಡಿಟ್ ಅರ್ಹತೆ · ಗ್ರೇಡ್ A2 (ಕಡಿಮೆ ಅಪಾಯ)",
      verdict: "₹25 ಲಕ್ಷದವರೆಗೆ ಅಸುರಕ್ಷಿತ ಕ್ರೆಡಿಟ್ ಅನುಮೋದಿಸಲಾಗಿದೆ",
      analysis: "AI ಕ್ರೆಡಿಟ್ ತೀರ್ಪು: ಸಕಾಲಿಕ GST ಸಲ್ಲಿಕೆ, ₹18.4 ಕೋಟಿ ವಹಿವಾಟು, ಯಾವುದೇ ನ್ಯಾಯಾಲಯ ಮೊಕದ್ದಮೆಗಳಿಲ್ಲ. 30 ದಿನಗಳ ಅವಧಿಗೆ ₹25 ಲಕ್ಷದವರೆಗೆ ಕ್ರೆಡಿಟ್ ನೀಡಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.",
      safeLimit: "₹25,00,000",
      voiceText: "ಚಾನ್‌ಬೀನ್ ವಾಯ್ಸ್: 'ನಮಸ್ಕಾರ, ಇನ್ವಾಯ್ಸ್ #8412 ರ ₹2,40,000 ಪಾವತಿ ಇಂದು ಬಾಕಿ ಇದೆ. ಯುಪಿಐ ಮೂಲಕ ಪಾವತಿಸಲು 1 ಒತ್ತಿರಿ.'",
    },
    highRisk: {
      badge: "ಹೆಚ್ಚಿನ ಅಪಾಯ · ಗ್ರೇಡ್ C3 (ಎಚ್ಚರಿಕೆ ಅಗತ್ಯ)",
      verdict: "ಅಸುರಕ್ಷಿತ ಕ್ರೆಡಿಟ್ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ · ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ ಮಾತ್ರ",
      analysis: "AI ಕ್ರೆಡಿಟ್ ತೀರ್ಪು: ಸತತ 4 ಜಿಎಸ್‌ಟಿ ಡಿಫಾಲ್ಟ್‌ಗಳು, ₹62 ಲಕ್ಷ ಬ್ಯಾಂಕ್ ಶುಲ್ಕ ಬಾಕಿ ಮತ್ತು 2 ಎನ್‌ಸಿಎಲ್‌ಟಿ ಮೊಕದ್ದಮೆಗಳಿವೆ. ಮರುಪಾವತಿ ವಿಳಂಬದ 89% ಸಂಭವನೀಯತೆ ಇದೆ.",
      safeLimit: "₹0 (ಮುಂಗಡ ಪಾವತಿ ಮಾತ್ರ)",
      voiceText: "ಚಾನ್‌ಬೀನ್ ವಾಯ್ಸ್: 'ಕಾನೂನುಬದ್ಧ 45-ದಿನಗಳ ಎಂಎಸ್‌ಎಂಇ ಬೇಡಿಕೆ ನೋಟಿಸ್ ಕಳುಹಿಸಲಾಗಿದೆ. 3 ಪಟ್ಟು ಚಕ್ರಬಡ್ಡಿ ಜಾರಿಯಲ್ಲಿದೆ.'",
    },
  },
  te: {
    highTrust: {
      badge: "క్రెడిట్ అర్హత · గ్రేడ్ A2 (తక్కువ ప్రమాదం)",
      verdict: "₹25 లక్షల వరకు క్రెడిట్ ఆమోదించబడింది",
      analysis: "AI క్రెడిట్ తీర్పు: సకాలంలో GST దాఖలు, ₹18.4 కోట్ల వార్షిక టర్నోవర్, ఎలాంటి కోర్టు వివాదాలు లేవు. 30 రోజుల వ్యవధికి ₹25 లక్షల వరకు క్రెడిట్ పరిమితి సిఫార్సు చేయబడింది.",
      safeLimit: "₹25,00,000",
      voiceText: "చాన్‌బీన్ వాయిస్: 'నమస్కారం, ఇన్వాయిస్ #8412 కోసం ₹2,40,000 చెల్లింపు ఈరోజు గడువు ఉంది. UPI ద్వారా చెల్లించడానికి 1 నొక్కండి.'",
    },
    highRisk: {
      badge: "అధిక ప్రమాదం · గ్రేడ్ C3 (జాగ్రత్త అవసరం)",
      verdict: "అన్‌సెక్యూర్డ్ క్రెడిట్ తిరస్కరించబడింది · కేవలం అడ్వాన్స్ మాత్రమే",
      analysis: "AI క్రెడిట్ తీర్పు: వరుసగా 4 GST డిఫాల్ట్‌లు, ₹62 లక్షల బ్యాంక్ ఛార్జ్ మరియు 2 NCLT కేసులు ఉన్నాయి. చెల్లింపు ఆలస్యమయ్యే అవకాశం 89% ఉంది.",
      safeLimit: "₹0 (కేవలం అడ్వాన్స్)",
      voiceText: "చాన్‌బీన్ వాయిస్: 'చట్టబద్ధమైన 45-రోజుల MSME డిమాండ్ నోటీసు పంపబడింది. 3 రెట్ల చక్రవడ్డీ వర్తిస్తుంది.'",
    },
  },
  bn: {
    highTrust: {
      badge: "ক্রেডিট যোগ্য · গ্রেড A2 (কম ঝুঁকি)",
      verdict: "₹২৫ লাখ পর্যন্ত জামানতহীন ক্রেডিট অনুমোদিত",
      analysis: "AI ঝুঁকি মূল্যায়ন: ১০০% সময়মতো জিএসটি ফাইলিং, ₹১৮.৪ কোটি টার্নওভার এবং কোনো মামলা নেই। ৩০ দিনের শর্তে ₹২৫ লাখ পর্যন্ত ক্রেডিট সীমা নিরাপদ।",
      safeLimit: "₹25,00,000",
      voiceText: "ছানবীন ভয়েস: 'নমস্কার, চালান #8412-এর ₹২,৪০,০০০ পেমেন্ট আজ বকেয়া রয়েছে। ইউপিআই-এর মাধ্যমে দিতে 1 টিপুন।'",
    },
    highRisk: {
      badge: "উচ্চ ঝুঁকি · গ্রেড C3 (সতর্কতা প্রয়োজন)",
      verdict: "জামানতহীন ক্রেডিট প্রত্যাখ্যান · কেবল ক্যাশ অন ডেলিভারি",
      analysis: "AI ঝুঁকি মূল্যায়ন: পরপর ৪টি জিএসটি ডিফল্ট, ₹৬২ লাখ চার্জ এবং ২টি এনসিএলটি মামলা রয়েছে। বিলম্বিত আদায়ের সম্ভাবনা ৮৯%।",
      safeLimit: "₹0 (কেবল অগ্রিম পেমেন্ট)",
      voiceText: "ছানবীন ভয়েস: 'বিধিবদ্ধ ৪৫-দিনের এমএসএমই ডিমান্ড নোটিশ পাঠানো হয়েছে। ৩ গুণ চক্রবৃদ্ধি সুদ প্রযোজ্য হচ্ছে।'",
    },
  },
};

const STATUTORY_QUOTA_BREAKDOWN = [
  {
    feature: "PAN / GST Identity & Filing Verification",
    rate: "₹50 / check",
    retailQuota: "100 checks",
    retailGross: "₹5,000",
    entQuota: "250 checks",
    entGross: "₹12,500",
    desc: "Active status, GSTR-1 & 3B compliance records, turnover validation",
  },
  {
    feature: "MCA Directorship & Charge Register",
    rate: "₹150 / check",
    retailQuota: "30 checks",
    retailGross: "₹4,500",
    entQuota: "80 checks",
    entGross: "₹12,000",
    desc: "DIN records, open bank charges, ROC filings, director disqualifications",
  },
  {
    feature: "Automated Legal Notice (§138 & §43B(h))",
    rate: "₹500 / notice",
    retailQuota: "15 notices",
    retailGross: "₹7,500",
    entQuota: "40 notices",
    entGross: "₹20,000",
    desc: "Advocate-vetted statutory notices with speed-post tracking integration",
  },
  {
    feature: "§18 MSME Samadhaan Arbitration Filing",
    rate: "₹2,500 / filing",
    retailQuota: "4 filings",
    retailGross: "₹10,000",
    entQuota: "8 filings",
    entGross: "₹20,000",
    desc: "Official MSEFC petition generation with 3x compound interest calculation",
  },
  {
    feature: "AI Voice Telephony & WhatsApp Cadences",
    rate: "₹1.50 / call",
    retailQuota: "1,500 calls",
    retailGross: "₹2,200",
    entQuota: "4,500 calls",
    entGross: "₹6,450",
    desc: "9 Indian languages, multilingual voice agents, payment reminder webhooks",
  },
  {
    feature: "Skip-Tracing & Debtor Geo-Locating",
    rate: "₹500 / trace",
    retailQuota: "10 traces",
    retailGross: "₹5,000",
    entQuota: "30 traces",
    entGross: "₹15,000",
    desc: "Multi-point trace of absconding commercial debtors & asset mapping",
  },
  {
    feature: "Real-Time Counterparty Credit Watch",
    rate: "₹500 / mo",
    retailQuota: "30 counterparties",
    retailGross: "₹15,000",
    entQuota: "Unlimited",
    entGross: "Included",
    desc: "24/7 autonomous alerts on defaults, charge modifications & litigations",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("ai-future-readiness");
  const [activeIntelLang, setActiveIntelLang] = useState<string>("en");
  const [activePersona, setActivePersona] = useState<"underwriter" | "recovery" | "cfo">("underwriter");
  const [sampleVerdictTarget, setSampleVerdictTarget] = useState<"high_trust" | "high_risk">("high_trust");
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryTarget, setEnquiryTarget] = useState<{ id: string; title: string; badge: string }>({
    id: "ai-future-readiness",
    title: "AI Future Readiness",
    badge: "AI Opportunity Roadmap",
  });
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);

  const openEnquiry = (id: string, title: string, badge: string) => {
    setEnquiryTarget({ id, title, badge });
    setEnquirySubmitted(false);
    setEnquiryModalOpen(true);
  };

  const switcherScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkSwitcherScroll = () => {
    if (switcherScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = switcherScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkSwitcherScroll();
    window.addEventListener("resize", checkSwitcherScroll);
    return () => window.removeEventListener("resize", checkSwitcherScroll);
  }, []);

  const handleScrollSwitcher = (direction: "left" | "right") => {
    if (switcherScrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      switcherScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkSwitcherScroll, 350);
    }
  };

  const loanProducts = [
    {
      title: "Business & Working Capital Loan",
      badge: "Fast MSME Disbursal",
      amount: "Up to ₹50 Lakhs",
      rate: "From 12.60% p.a.",
      description:
        "Collateral-free working capital loan for manufacturers, traders, and service providers. Fuel inventory purchase, machinery expansion, and raw materials.",
      highlights: ["100% paperless approval", "Disbursal within 24-48 hours", "Flexible tenure 1 to 5 years"],
      icon: Briefcase,
    },
    {
      title: "Invoice & Trade Financing",
      badge: "Instant Liquidity",
      amount: "Up to 90% Invoice Value",
      rate: "Competitive Trade Rates",
      description:
        "Don't wait 45 to 90 days for buyers to pay your bills. Get an immediate cash advance against your verified trade invoices and keep cash flow uninterrupted.",
      highlights: ["Cash advance against unpaid bills", "Zero impact on balance sheet", "Repaid when buyer settles"],
      icon: TrendingUp,
    },
    {
      title: "Gold Loan for Enterprise",
      badge: "Zero Income Proof",
      amount: "Up to ₹1.5 Crore",
      rate: "From 9.50% p.a. (0.79%/mo)",
      description:
        "Unlock immediate business capital against gold jewellery with highest per-gram valuation and bank-grade secure vault storage.",
      highlights: ["Same-day bank disbursal", "No ITR or balance sheet needed", "Free insured vault protection"],
      icon: Coins,
    },
    {
      title: "Commercial & Property Loan",
      badge: "Lowest Interest Rate",
      amount: "Up to ₹5 Crore",
      rate: "From 8.35% p.a.",
      description:
        "Finance factory purchase, commercial office space, or transfer your existing high-cost business loan at significantly lower EMIs.",
      highlights: ["Tenure up to 30 years", "Low processing fees", "Balance transfer savings"],
      icon: Home,
    },
  ];

  const features = [
    {
      id: "ai-future-readiness",
      title: "AI Future Readiness",
      tagline: "What Will AI Change in Your Business?",
      badge: "AI Opportunity Roadmap",
      benefit: "Custom AI Readiness Assessment",
      icon: Sparkles,
      actionType: "form",
      ctaLabel: "Fill Form & Enquire",
      description:
        "AI is not only about chatbots. It can change how you sell, operate, collect money, manage people, serve customers and make decisions. ChaanBean analyses your business model and identifies where AI can create measurable business impact.",
      outcome: "A practical AI roadmap designed around YOUR business — not a generic AI strategy.",
      highlights: [
        "Discover where AI can reduce operating costs",
        "Identify processes ready for automation & AI-assisted functions",
        "Customer-service, finance & HR productivity opportunities",
        "Sales, marketing & AI-led decision-making opportunities",
      ],
      discoverList: [
        "Where AI can reduce operating costs",
        "Processes ready for automation",
        "Functions that can be AI-assisted",
        "Customer-service opportunities",
        "Finance and accounting automation",
        "HR and employee productivity opportunities",
        "Sales and marketing opportunities",
        "AI-led decision-making opportunities",
      ],
    },
    {
      id: "ai-business-transformation",
      title: "AI Business Transformation",
      tagline: "Don't Just Adopt AI. Rebuild the Way Your Business Works.",
      badge: "AI Operations Layer",
      benefit: "Custom AI Operating Layer",
      icon: Bot,
      actionType: "form",
      ctaLabel: "Fill Form & Enquire",
      description:
        "ChaanBean can move from identifying opportunities to designing custom AI-powered business solutions around your organisation.",
      outcome: "Your business gets its own AI operating layer — configured around the way you work.",
      highlights: [
        "AI Contact Centre with Voice & WhatsApp agents",
        "Automated invoice processing & payment follow-ups",
        "HR helpdesk, onboarding & employee engagement",
        "Lead intelligence, proposal generation & sales assistants",
        "Real-time management dashboards & early-warning signals",
      ],
      operations: [
        {
          category: "Customer Operations",
          items: [
            "AI Contact Centre",
            "Voice & WhatsApp agents",
            "Customer support automation",
            "Lead qualification",
            "Appointment and enquiry handling",
          ],
        },
        {
          category: "Finance Operations",
          items: [
            "Invoice processing",
            "Payment follow-ups",
            "Reconciliation assistance",
            "Receivables monitoring",
            "Finance workflow automation",
          ],
        },
        {
          category: "HR Operations",
          items: [
            "Employee onboarding",
            "HR helpdesk",
            "Policy assistance",
            "Employee engagement",
            "AI learning assistants",
          ],
        },
        {
          category: "Sales & Marketing",
          items: [
            "Lead intelligence",
            "Proposal generation",
            "Sales assistants",
            "Customer segmentation",
            "Campaign automation",
          ],
        },
        {
          category: "Management",
          items: [
            "AI business dashboards",
            "Management insights",
            "Early-warning signals",
            "AI decision assistants",
          ],
        },
      ],
    },
    {
      id: "ai-credit-due-diligence",
      title: "AI Credit Due Diligence",
      tagline: "Before You Give Credit, Know the Business Behind the Transaction.",
      subtitle: "Credit decisions shouldn't depend on a single score.",
      badge: "Counterparty Diligence",
      benefit: "Explainable Credit Profile",
      icon: ShieldCheck,
      actionType: "subscription",
      ctaLabel: "View Plans & Subscribe",
      description:
        "Credit decisions shouldn't depend on a single score. ChaanBean creates a broader AI Credit Due Diligence Profile by bringing together available business, statutory, financial, behavioural and risk signals.",
      outcome:
        "Move from “Should I give credit?” to “How much credit can I responsibly give — and under what conditions?”",
      highlights: [
        "Who are they? Identity, registrations, ownership & operating history",
        "Can they pay? Financial strength, turnover & cash-flow indicators",
        "Do they pay? Credit behaviour, payment history & repayment signals",
        "What could change? Early-warning indicators & adverse risk events",
      ],
      pillars: [
        {
          q: "Who are they?",
          desc: "Business identity, registrations, ownership and operating history.",
        },
        {
          q: "Can they pay?",
          desc: "Financial strength, turnover and relevant cash-flow indicators.",
        },
        {
          q: "Do they pay?",
          desc: "Credit behaviour, payment history and available repayment signals.",
        },
        {
          q: "What could change?",
          desc: "Early-warning indicators, adverse events and emerging risk signals.",
        },
      ],
      outputs: [
        "Risk indicators",
        "Positive signals",
        "Red flags",
        "Recommended exposure",
        "Monitoring requirements",
        "Explainable decision factors",
      ],
    },
    {
      id: "continuous-credit-protection",
      title: "Continuous Credit Protection",
      tagline: "Credit Risk Doesn't End When You Approve the Credit. It Starts There.",
      badge: "Lifecycle Risk Sentinel",
      benefit: "Active Early Warnings",
      icon: Activity,
      actionType: "subscription",
      ctaLabel: "View Plans & Subscribe",
      description:
        "Instead of checking a customer once and forgetting about them, ChaanBean can continuously watch the credit relationship for signals that may require attention. Continuous Credit Protection becomes your digital layer of protection between credit given and money received.",
      outcome: "Don't just assess credit once. Protect the credit throughout its lifecycle.",
      highlights: [
        "Digital layer of protection between credit given and money received",
        "Monitor customer exposure & track payment behaviour",
        "Identify emerging risk & prioritise accounts requiring attention",
        "Trigger early-warning workflows tied directly to payment behaviour",
      ],
      capabilities: [
        "Monitor customer exposure",
        "Track payment behaviour",
        "Identify emerging risk",
        "Prioritise accounts requiring attention",
        "Trigger early-warning workflows",
        "Keep credit decisions connected to payment behaviour",
      ],
    },
    {
      id: "smart-collections-automation",
      title: "Smart Collections Automation",
      tagline: "Stop Chasing Payments. Start Orchestrating Them.",
      subtitle: "Every overdue payment doesn't need a human calling every customer.",
      badge: "Payment Orchestration",
      benefit: "Automated Recovery Journeys",
      icon: Zap,
      actionType: "subscription",
      ctaLabel: "View Plans & Subscribe",
      description:
        "Every overdue payment doesn't need a human calling every customer. Smart Collections Automation creates intelligent, automated payment journeys based on invoice status, ageing, customer behaviour and your collection rules.",
      outcome: "Every rupee due gets a structured journey toward payment.",
      highlights: [
        "One receivable. Multiple intelligent actions.",
        "Reminder → Voice → WhatsApp → Payment Link → Follow-up → Escalation → Human Intervention",
        "AI voice reminders, WhatsApp communication & payment links",
        "Move cases into statutory legal / recovery workflows when automation is no longer enough",
      ],
      journey: [
        "Reminder",
        "Voice",
        "WhatsApp",
        "Payment Link",
        "Follow-up",
        "Escalation",
        "Human Intervention",
      ],
      coordination: [
        "AI voice reminders",
        "WhatsApp communication",
        "SMS / email",
        "Payment links",
        "Promise-to-pay capture",
        "Follow-up scheduling",
        "Escalation to collection teams",
        "Management dashboards",
      ],
      legalFallback:
        "When automation is no longer enough: Move the case into the appropriate legal / recovery workflow with the supporting transaction history and documentation.",
    },
    {
      id: "capital-access",
      title: "Capital Access",
      tagline: "When Your Business Is Ready to Grow, Capital Shouldn't Be the Bottleneck.",
      badge: "MSME Financing",
      benefit: "Intelligence-Led Financing",
      icon: Coins,
      actionType: "form",
      ctaLabel: "Apply for Capital / Enquire",
      description:
        "A healthy business can still struggle when cash is locked inside receivables. ChaanBean can create a digital pathway for eligible MSMEs and micro businesses to explore relevant financial products. Instead of asking an MSME to start from scratch, ChaanBean can use the business intelligence already created through the platform to help create a more informed financing journey.",
      outcome:
        "Understand → Prepare → Match → Apply → Track. Capital unlocked through your verified data.",
      highlights: [
        "Collateral-free business loans & working capital",
        "Invoice & trade financing against unpaid receivables",
        "Equipment financing & other eligible credit products",
        "Business insurance & credit protection",
      ],
      pathways: [
        "Business loans",
        "Working capital",
        "Invoice / trade financing",
        "Equipment financing",
        "Other eligible credit products",
        "Business insurance",
      ],
      flow: ["Understand", "Prepare", "Match", "Apply", "Track"],
    },
    {
      id: "chaanbean-connect",
      title: "ChaanBean Connect",
      tagline: "Your Business Shouldn't Need Another Software Island.",
      badge: "Ecosystem Integration",
      benefit: "API-First Architecture",
      icon: Network,
      actionType: "form",
      ctaLabel: "Fill Form & Enquire for Connect",
      description:
        "ChaanBean is designed to work with the systems your business already uses. Connect your existing ecosystem: Tally · ERP · Accounting · CRM · HRMS · Banking / Financial Systems · APIs. Bring business transactions and operational information into the ChaanBean intelligence layer and send actions back into your existing workflows where appropriate.",
      outcome: "Keep your existing systems. Add intelligence on top of them.",
      highlights: [
        "Zero disruption: syncs natively with Tally, ERP, CRM, HRMS & banking",
        "Two-way data ingestion, verification & receivables monitoring",
        "Autonomous AI agents, alerts, webhooks & payment workflows",
        "Multilingual voice & WhatsApp routing in 9 Indian languages",
      ],
      ecosystem: [
        "Tally",
        "ERP Systems",
        "Accounting Software",
        "CRM",
        "HRMS",
        "Banking / Financial Systems",
        "APIs",
      ],
      architecture: [
        "Data ingestion",
        "Business verification",
        "Credit intelligence",
        "Risk signals",
        "Receivables monitoring",
        "Payment workflows",
        "AI agents",
        "Alerts",
        "Webhooks",
        "Enterprise integrations",
      ],
    },
    {
      id: "chaanbean-intelligence",
      title: "ChaanBean Intelligence™",
      tagline: "The More Your Business Uses ChaanBean, The More It Understands.",
      subtitle: "This is the long-term intelligence layer.",
      badge: "Autonomous AI Orchestration",
      benefit: "Continuously Evolving Intelligence",
      icon: Cpu,
      actionType: "form",
      ctaLabel: "Fill Form & Enquire for Intelligence",
      description:
        "This is the long-term intelligence layer. ChaanBean Intelligence brings together the signals generated across your business journey to create a continuously evolving picture of your organisation and its ecosystem. From data to intelligence: Business Data ↓ AI Analysis ↓ Business Intelligence ↓ Predictions & Early Warnings ↓ Recommended Actions ↓ Automated Execution.",
      outcome: "Your business doesn't just generate data. It learns from it.",
      highlights: [
        "Autonomous AI Credit Risk Verdict Engine with explainable reasoning",
        "Dynamic dashboard layout adapting to what each user uses most",
        "Real-time Platform Trending Radar across peer MSMEs & clusters",
        "Detailed Statutory Feature Quotas & Pricing Breakdown Matrix",
      ],
      flywheel: [
        "Business Data",
        "AI Analysis",
        "Business Intelligence",
        "Predictions & Early Warnings",
        "Recommended Actions",
        "Automated Execution",
      ],
      questions: [
        "Which customers should receive more credit?",
        "Which customers need attention today?",
        "Where are we losing working capital?",
        "Which operations should we automate next?",
        "Where can AI create the biggest business impact?",
        "What new business opportunity can we create from our existing data?",
      ],
    },
  ];


  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Micro-dot Watermark Security Matrix */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#FC8019_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.035] dark:opacity-[0.06] z-0" />

      {/* Ambient Crimson / Orange Halo Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-[160px] opacity-15 dark:opacity-25 z-0"
        style={{ background: "radial-gradient(circle, #FC8019 0%, rgba(252, 128, 25,0) 70%)" }}
      />

      {/* GLOBAL HERO WATERMARKS */}
      {/* 1. Large Top-Right Floating Watermark Logo */}
      <div className="pointer-events-none absolute -top-16 -right-20 sm:-right-8 lg:right-6 w-[340px] sm:w-[500px] lg:w-[620px] h-[340px] sm:h-[500px] lg:h-[620px] select-none opacity-[0.045] dark:opacity-[0.07] rotate-12 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 2. Top-Left Floating Watermark Logo */}
      <div className="pointer-events-none absolute top-28 -left-28 sm:-left-12 lg:left-4 w-[260px] sm:w-[380px] lg:w-[460px] h-[260px] sm:h-[380px] lg:h-[460px] select-none opacity-[0.035] dark:opacity-[0.055] -rotate-12 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 3. Hero Center Background Watermark */}
      <div className="pointer-events-none absolute top-72 left-1/2 -translate-x-1/2 w-[380px] sm:w-[580px] h-[380px] sm:h-[580px] select-none opacity-[0.025] dark:opacity-[0.04] rotate-3 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 4. Diagonal Faint Typographic Watermark Ribbon */}
      <div className="pointer-events-none absolute top-20 left-0 right-0 overflow-hidden select-none opacity-[0.025] dark:opacity-[0.04] z-0 -rotate-2">
        <div className="flex whitespace-nowrap text-xs font-mono tracking-[0.35em] uppercase font-black text-[#FC8019] py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="mx-8">
              CHAANBEAN · CREDIT &amp; RECOVERY OS · STATUTORY INTELLIGENCE ·
            </span>
          ))}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="relative h-9 w-12 shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight">
                Chaan<span className="text-[#FC8019]">Bean</span>
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Credit &amp; Recovery OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Menu Bar */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-bold text-slate-700 dark:text-slate-200">
            <a href="#services" className="hover:text-[#FC8019] transition-colors">
              Services
            </a>
            <a
              href="#services"
              onClick={() => setSelectedFeatureId("chaanbean-intelligence")}
              className="text-[#FC8019] hover:opacity-85 transition-colors flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/90 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800 text-xs font-mono font-bold shadow-sm"
            >
              <Cpu size={13} className="text-[#FC8019] animate-pulse" />
              <span>AI Intelligence™</span>
            </a>
            <a href="#loans" className="hover:text-[#FC8019] transition-colors">
              Loans
            </a>
            <a href="#contact" className="hover:text-[#FC8019] transition-colors">
              Contact Us
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FC8019] hover:text-[#FC8019] dark:hover:border-[#FC8019] dark:hover:text-[#FC8019] transition shadow-sm"
            >
              Already a Customer? Log In
            </Link>
            <Link
              href="/subscription"
              className="flex items-center gap-1.5 rounded-xl bg-[#FC8019] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
            >
              <span>Explore Plans</span>
              <ArrowRight size={14} />
            </Link>
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] px-6 py-4 space-y-3">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Services
            </a>
            <a
              href="#loans"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Business & Working Capital Loans
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Contact Us
            </a>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
              >
                Customer Log In →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-16 text-center lg:pt-24 lg:pb-20 z-10">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Platform Category Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-100/70 dark:bg-orange-950/60 px-4 py-1.5 text-xs font-bold text-[#FC8019] shadow-sm">
            <Sparkles size={14} className="text-[#FC8019]" />
            <span>One AI Platform to Understand, Protect &amp; Grow Your Business</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-[1.15]">
            From knowing where your business stands today —
            <br />
            <span className="bg-gradient-to-r from-[#FC8019] via-amber-500 to-orange-400 bg-clip-text text-transparent">
              to discovering where AI can take it tomorrow.
            </span>
          </h1>

          {/* Subtitle / Proposition Narrative */}
          <p className="mx-auto max-w-3xl text-base sm:text-lg lg:text-xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            ChaanBean brings Business Intelligence, AI Transformation, Credit Intelligence, Payment Protection, Capital Access and Business Automation together in one connected platform built for MSMEs.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/subscription"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#FC8019] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-[#FC8019]/25 hover:bg-[#E26D0A] hover:scale-[1.02] transition"
            >
              <span>Get Started &amp; Choose Plan</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/login"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm transition"
            >
              <Lock size={15} className="text-[#FC8019]" />
              <span>Already a Customer? Log In</span>
            </Link>
          </div>

          {/* Action Ribbon / Tagline Ribbon */}
          <div className="pt-4">
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-[#FC8019]/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 dark:from-orange-950/40 dark:via-slate-900 dark:to-orange-950/40 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Benchmark your business
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Discover your AI opportunities
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Secure your credit
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Automate your operations
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Unlock capital
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5 text-[#FC8019]">
                  <CheckCircle2 size={15} className="shrink-0" /> Build what comes next
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 Core Platform Features Section */}
      <section id="services" className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 px-6 py-20 scroll-mt-16">
        {/* Background Watermarks */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] select-none opacity-[0.035] dark:opacity-[0.06] -rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute top-1/2 -right-24 w-[420px] sm:w-[540px] h-[420px] sm:h-[540px] select-none opacity-[0.035] dark:opacity-[0.06] rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute -bottom-20 left-1/4 w-[340px] h-[340px] select-none opacity-[0.025] dark:opacity-[0.045] -rotate-6 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>

        {/* Feature Watermark Ribbon */}
        <div className="pointer-events-none absolute top-4 left-0 right-0 overflow-hidden select-none opacity-[0.02] dark:opacity-[0.035] z-0">
          <div className="flex whitespace-nowrap text-[11px] font-mono tracking-[0.3em] uppercase font-bold text-[#FC8019]">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="mx-8">
                CHAANBEAN · AI TRANSFORMATION · DUE DILIGENCE · CREDIT PROTECTION · COLLECTIONS · CAPITAL ACCESS · CONNECT · INTELLIGENCE ·
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019] bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
              Platform Architecture · 8 Connected Capabilities
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              One Connected Platform. Eight Transformative Powers.
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              ChaanBean connects Business Intelligence, AI Transformation, Credit Due Diligence, Continuous Protection, Collections, Capital Access, Ecosystem Connect, and Autonomous Intelligence into a single operating layer.
            </p>
          </div>

          {/* 8-Feature Interactive Switcher Bar */}
          <div className="relative mb-10 group/switcher">
            {/* Scroll Left Indicator Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScrollSwitcher("left")}
                aria-label="Scroll left to see more features"
                className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#FC8019] hover:border-[#FC8019] transition-all hover:scale-110 active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {/* Safe Scrollable Strip (margin-left: 0 guaranteed on overflow - never cuts off left edge) */}
            <div
              ref={switcherScrollRef}
              onScroll={checkSwitcherScroll}
              className="w-full overflow-x-auto pb-2 no-scrollbar scroll-smooth px-2 sm:px-4"
            >
              <div className="flex items-center gap-2 w-max mx-auto px-1 py-1">
                {features.map((feat) => {
                  const isSelected = selectedFeatureId === feat.id;
                  const Icon = feat.icon;
                  return (
                    <button
                      key={feat.id}
                      onClick={() => setSelectedFeatureId(feat.id)}
                      className={`flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-200 border ${
                        isSelected
                          ? "bg-[#FC8019] text-white border-[#FC8019] shadow-lg shadow-[#FC8019]/25 scale-[1.02]"
                          : feat.id === "chaanbean-intelligence"
                          ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-slate-900 border-[#FC8019]/50 text-[#FC8019] hover:border-[#FC8019] shadow-sm ring-1 ring-orange-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={15} className={isSelected ? "text-white" : "text-[#FC8019]"} />
                      <span>{feat.title}</span>
                      {feat.id === "chaanbean-intelligence" && (
                        <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-[#FC8019] text-white shadow-sm"
                        }`}>
                          AI Orchestration
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scroll Right Indicator Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScrollSwitcher("right")}
                aria-label="Scroll right to see more features"
                className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#FC8019] hover:border-[#FC8019] transition-all hover:scale-110 active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {/* Top 3 Capabilities Grid (1. AI Future Readiness, 2. AI Business Transformation, 3. AI Credit Due Diligence) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {features.slice(0, 3).map((feat) => {
              const isSelected = selectedFeatureId === feat.id;
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  onClick={() => setSelectedFeatureId(feat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedFeatureId(feat.id);
                    }
                  }}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 shadow-md transition-all duration-300 cursor-pointer select-none group active:scale-[0.99] transform ${
                    isSelected
                      ? "border-[#FC8019] ring-4 ring-[#FC8019]/25 shadow-2xl shadow-orange-500/20 scale-[1.02] bg-gradient-to-b from-orange-50/70 via-white to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 z-10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:scale-[1.01]"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                        <Icon size={22} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {feat.badge}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className={`text-xl font-black transition-colors ${
                        isSelected ? "text-[#FC8019]" : "text-slate-900 dark:text-white group-hover:text-[#FC8019]"
                      }`}>
                        {feat.title}
                      </h3>
                      <p className="text-sm font-bold text-[#FC8019] mt-1 line-clamp-2">
                        {feat.tagline}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {feat.description}
                    </p>

                    {/* Key Highlights */}
                    <ul className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {feat.highlights.slice(0, 3).map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action CTA Button & Outcome Tag */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    {feat.actionType === "form" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEnquiry(feat.id, feat.title, feat.badge);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Sparkles size={13} />
                        <span>{feat.ctaLabel}</span>
                      </button>
                    ) : (
                      <Link
                        href="/subscription"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span>{feat.ctaLabel}</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#FC8019] transition-colors">
                        {isSelected ? "● Viewing Architecture" : "Tap card for deep-dive"}
                      </span>
                      <ArrowRight size={14} className={`transition-transform duration-300 ${isSelected ? "text-[#FC8019] translate-x-1" : "text-slate-400 group-hover:translate-x-1"}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom 3 Capabilities Grid (4. Continuous Credit Protection, 5. Smart Collections Automation, 6. Capital Access) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
            {features.slice(3, 6).map((feat) => {
              const isSelected = selectedFeatureId === feat.id;
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  onClick={() => setSelectedFeatureId(feat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedFeatureId(feat.id);
                    }
                  }}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 shadow-md transition-all duration-300 cursor-pointer select-none group active:scale-[0.99] transform ${
                    isSelected
                      ? "border-[#FC8019] ring-4 ring-[#FC8019]/25 shadow-2xl shadow-orange-500/20 scale-[1.02] bg-gradient-to-b from-orange-50/70 via-white to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 z-10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:scale-[1.01]"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                        <Icon size={22} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {feat.badge}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className={`text-xl font-black transition-colors ${
                        isSelected ? "text-[#FC8019]" : "text-slate-900 dark:text-white group-hover:text-[#FC8019]"
                      }`}>
                        {feat.title}
                      </h3>
                      <p className="text-sm font-bold text-[#FC8019] mt-1 line-clamp-2">
                        {feat.tagline}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {feat.description}
                    </p>

                    {/* Key Highlights */}
                    <ul className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {feat.highlights.slice(0, 3).map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action CTA Button & Outcome Tag */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    {feat.actionType === "form" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEnquiry(feat.id, feat.title, feat.badge);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Coins size={13} />
                        <span>{feat.ctaLabel}</span>
                      </button>
                    ) : (
                      <Link
                        href="/subscription"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span>{feat.ctaLabel}</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#FC8019] transition-colors">
                        {isSelected ? "● Viewing Architecture" : "Tap card for deep-dive"}
                      </span>
                      <ArrowRight size={14} className={`transition-transform duration-300 ${isSelected ? "text-[#FC8019] translate-x-1" : "text-slate-400 group-hover:translate-x-1"}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected Horizontal Flow: ChaanBean Connect (7) + ChaanBean Intelligence™ (8) */}
          <div className="mb-12 rounded-3xl border-2 border-[#FC8019]/40 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 dark:from-orange-950/30 dark:via-slate-900 dark:to-orange-950/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-orange-500/20 mb-6">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FC8019] flex items-center gap-2">
                  <Network size={14} /> Ecosystem Ingestion ──▶ Autonomous AI Orchestration <Cpu size={14} />
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  Connected Horizontal Flow: Systems Integration to Self-Learning AI
                </h3>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                  ChaanBean Connect brings data in from your existing software without disruption, and ChaanBean Intelligence transforms it into continuous underwriting, predictions, and automated execution.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#FC8019]/15 text-[#FC8019] border border-[#FC8019]/30 flex items-center gap-1.5 shadow-sm">
                  <Radio size={12} className="animate-pulse" /> Live Connected Pipeline
                </span>
              </div>
            </div>

            {/* Side-by-Side Connected Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative items-stretch">
              {/* Card 7: ChaanBean Connect */}
              <div
                onClick={() => setSelectedFeatureId("chaanbean-connect")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedFeatureId("chaanbean-connect");
                  }
                }}
                className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 cursor-pointer shadow-md group ${
                  selectedFeatureId === "chaanbean-connect"
                    ? "border-[#FC8019] ring-4 ring-[#FC8019]/25 shadow-2xl shadow-orange-500/20 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                      <Network size={22} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Ecosystem Integration
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                      ChaanBean Connect
                    </h4>
                    <p className="text-sm font-bold text-[#FC8019] mt-1">
                      Your Business Shouldn't Need Another Software Island.
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    ChaanBean is designed to work with the systems your business already uses. Connect your existing ecosystem: Tally · ERP · Accounting · CRM · HRMS · Banking / Financial Systems · APIs.
                  </p>

                  {/* Connected Ecosystem Tags */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                      Syncs Natively With:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Tally", "ERP Systems", "Accounting Software", "CRM", "HRMS", "Banking / Financial", "APIs"].map((sys, idx) => (
                        <span key={idx} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {sys}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 9 Languages Routing Badge */}
                  <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#FC8019]">
                      <Globe size={13} /> 9 Indian Languages Telephony &amp; WhatsApp
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Auto-Routed</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEnquiry("chaanbean-connect", "ChaanBean Connect", "Ecosystem Integration");
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Network size={14} />
                    <span>Fill Form &amp; Enquire for Connect</span>
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#FC8019] transition-colors">
                      {selectedFeatureId === "chaanbean-connect" ? "● Viewing Ingest Architecture" : "Tap for deep-dive"}
                    </span>
                    <ArrowRight size={14} className={`transition-transform duration-300 ${selectedFeatureId === "chaanbean-connect" ? "text-[#FC8019] translate-x-1" : "text-slate-400 group-hover:translate-x-1"}`} />
                  </div>
                </div>
              </div>

              {/* Card 8: ChaanBean Intelligence™ */}
              <div
                onClick={() => setSelectedFeatureId("chaanbean-intelligence")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedFeatureId("chaanbean-intelligence");
                  }
                }}
                className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 cursor-pointer shadow-md group ${
                  selectedFeatureId === "chaanbean-intelligence"
                    ? "border-[#FC8019] ring-4 ring-[#FC8019]/25 shadow-2xl shadow-orange-500/20 bg-gradient-to-br from-orange-50/70 via-white to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900"
                    : "border-[#FC8019]/70 ring-2 ring-orange-500/20 bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 hover:border-[#FC8019]"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                      <Cpu size={22} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FC8019] text-white flex items-center gap-1 shadow-sm">
                        <Flame size={10} /> Live AI Verdict
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Autonomous AI Orchestration
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                      ChaanBean Intelligence™
                    </h4>
                    <p className="text-sm font-bold text-[#FC8019] mt-1">
                      The More Your Business Uses ChaanBean, The More It Understands.
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    This is the long-term intelligence layer. ChaanBean Intelligence brings together the signals generated across your business journey to create a continuously evolving picture of your organisation and its ecosystem.
                  </p>

                  {/* Flywheel Flow Stepper */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                      Closed-Loop Flywheel:
                    </span>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold font-mono text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Business Data</span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">AI Analysis</span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Intelligence</span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#FC8019]">Actions</span>
                    </div>
                  </div>

                  {/* Live Underwriting Verdict Preview Pill */}
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <ShieldCheck size={13} /> "Is This Company Worth Giving Credit For?"
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full font-bold">
                      Grade A2 / C3 Verified
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEnquiry("chaanbean-intelligence", "ChaanBean Intelligence™", "Autonomous AI Orchestration");
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FC8019] via-amber-500 to-[#FC8019] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Cpu size={14} />
                    <span>Fill Form &amp; Enquire for Intelligence</span>
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#FC8019] transition-colors">
                      {selectedFeatureId === "chaanbean-intelligence" ? "● Viewing Live AI Verdict & Quotas" : "Tap for deep-dive"}
                    </span>
                    <ArrowRight size={14} className={`transition-transform duration-300 ${selectedFeatureId === "chaanbean-intelligence" ? "text-[#FC8019] translate-x-1" : "text-slate-400 group-hover:translate-x-1"}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Feature Deep-Dive Spotlight Drawer */}
          {(() => {
            const activeFeature = features.find((f) => f.id === selectedFeatureId) || features[0];
            const Icon = activeFeature.icon;

            return (
              <div className="mt-12 rounded-3xl border-2 border-[#FC8019]/40 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 sm:p-10 dark:from-orange-500/15 dark:via-slate-900 dark:to-slate-900 shadow-2xl transition-all duration-500">
                <div className="space-y-8">
                  {/* Top Spotlight Header */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-orange-500/20">
                    <div className="space-y-3 max-w-3xl">
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#FC8019]/20 border border-[#FC8019]/30 px-3 py-1 text-xs font-bold text-[#FC8019]">
                        <Icon size={14} />
                        <span>Active Capability Spotlight · {activeFeature.badge}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        {activeFeature.title}
                      </h3>
                      <p className="text-base sm:text-lg font-bold text-[#FC8019]">
                        {activeFeature.tagline}
                      </p>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeFeature.description}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                      {activeFeature.actionType === "form" ? (
                        <button
                          type="button"
                          onClick={() => openEnquiry(activeFeature.id, activeFeature.title, activeFeature.badge)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FC8019] px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                        >
                          <Sparkles size={14} />
                          <span>{activeFeature.ctaLabel || "Fill Form & Enquire"}</span>
                        </button>
                      ) : (
                        <Link
                          href="/subscription"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FC8019] px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                        >
                          <span>{activeFeature.ctaLabel || "View Plans & Subscribe"}</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-[#FC8019] transition"
                      >
                        <span>Client Log In</span>
                      </Link>
                    </div>
                  </div>

                  {/* Deep-Dive Module Breakdown by Feature Type */}
                  {activeFeature.id === "ai-future-readiness" && activeFeature.discoverList && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                        <Sparkles size={14} />
                        <span>Discover: Where AI Creates Measurable Impact in Your Business</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {activeFeature.discoverList.map((item, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 space-y-2 shadow-sm flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] shrink-0 mt-0.5">
                              <CheckCircle2 size={16} />
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase text-[#FC8019]">Opportunity 0{idx + 1}</span>
                              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{item}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature.id === "ai-business-transformation" && activeFeature.operations && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                        <Layers size={14} />
                        <span>Automate Your MSME Operations</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {activeFeature.operations.map((op, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 space-y-3 shadow-sm">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-[#FC8019]">
                              <Sparkles size={14} />
                              <span>{op.category}</span>
                            </h4>
                            <ul className="space-y-2">
                              {op.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature.id === "ai-credit-due-diligence" && activeFeature.pillars && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                          <Search size={14} />
                          <span>Understand: The 4 Core Pillars of Credit Diligence</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {activeFeature.pillars.map((pil, idx) => (
                            <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 space-y-2 shadow-sm">
                              <span className="text-xs font-mono font-black uppercase text-[#FC8019]">Pillar 0{idx + 1}</span>
                              <h4 className="text-base font-black text-slate-900 dark:text-white">{pil.q}</h4>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{pil.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {activeFeature.outputs && (
                        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20 p-5 space-y-3">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                            ChaanBean Output · AI Credit Diligence Profile
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {activeFeature.outputs.map((out, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                {out}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeFeature.id === "continuous-credit-protection" && activeFeature.capabilities && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                        <Activity size={14} />
                        <span>Continuous Watch Sentinels (Credit Given ➔ Cash Received)</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeFeature.capabilities.map((cap, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 flex items-start gap-3 shadow-sm">
                            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 shrink-0">
                              <CheckCircle2 size={16} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cap}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated signal monitoring &amp; early trigger mechanism</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature.id === "smart-collections-automation" && activeFeature.journey && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                          <Zap size={14} />
                          <span>One Receivable. Multiple Intelligent Actions.</span>
                        </div>
                        {/* Journey Stepper */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                          {activeFeature.journey.map((step, idx) => (
                            <div key={idx} className="relative flex flex-col items-center text-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                              <span className="text-[10px] font-mono font-bold text-[#FC8019]">Step 0{idx + 1}</span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {activeFeature.coordination && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Coordinated Communication &amp; Workflow Channels
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {activeFeature.coordination.map((coord, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                {coord}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeFeature.legalFallback && (
                        <div className="rounded-2xl border-2 border-orange-500/40 bg-orange-100/60 dark:bg-orange-950/40 p-4 sm:p-5 flex items-start gap-3">
                          <Scale size={20} className="text-[#FC8019] shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">When Automation Is No Longer Enough</h4>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                              {activeFeature.legalFallback}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeFeature.id === "capital-access" && activeFeature.pathways && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                          <Coins size={14} />
                          <span>5-Step Financing Journey</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {activeFeature.flow?.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                              <span className="text-[10px] font-mono font-bold text-[#FC8019]">Phase 0{idx + 1}</span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Access Pathways &amp; Financial Products
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {activeFeature.pathways.map((prod, idx) => (
                            <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 flex items-center gap-2.5 shadow-sm">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{prod}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFeature.id === "chaanbean-connect" && activeFeature.ecosystem && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                          <Network size={14} />
                          <span>Connect Your Existing Ecosystem</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {activeFeature.ecosystem.map((sys, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm">
                              <Building2 size={13} className="text-[#FC8019]" />
                              {sys}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Multilingual Connect Dispatch Preview */}
                      <div className="rounded-2xl border-2 border-orange-500/30 bg-white/90 dark:bg-slate-900/90 p-5 space-y-4 shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                            <Globe size={15} />
                            <span>Multilingual Ecosystem Routing · 9 Indian Languages</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            Switch language to test localized voice cadences &amp; API webhooks
                          </span>
                        </div>
                        {/* Language Selector Pills */}
                        <div className="flex flex-wrap gap-2">
                          {INTEL_LANGUAGES.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => setActiveIntelLang(l.code)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                                activeIntelLang === l.code
                                  ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20 scale-105"
                                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                              }`}
                            >
                              <span>{l.flag}</span>
                              <span>{l.native}</span>
                              <span className="text-[10px] opacity-75 font-mono">({l.code.toUpperCase()})</span>
                            </button>
                          ))}
                        </div>

                        {/* Localized Telephony / WhatsApp Webhook Payload Preview */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <Radio size={12} className="animate-pulse" /> Live Telephony &amp; WhatsApp Dispatch in {INTEL_LANGUAGES.find(l => l.code === activeIntelLang)?.name}
                            </span>
                            <span>Direct Connect Bridge</span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 italic">
                            "{MULTI_LANG_VERDICTS[activeIntelLang]?.highTrust.voiceText}"
                          </p>
                        </div>
                      </div>

                      {activeFeature.architecture && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            API-First Architecture Capabilities
                          </h4>
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {activeFeature.architecture.map((item, idx) => (
                              <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2.5 flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeFeature.id === "chaanbean-intelligence" && (
                    <div className="space-y-8">
                      {/* 1. Multi-Language Switcher */}
                      <div className="rounded-2xl border-2 border-[#FC8019]/40 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 space-y-4 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <div>
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FC8019] flex items-center gap-1.5">
                              <Globe size={14} /> Multilingual Autonomous Intelligence
                            </span>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                              Real-Time Intelligence Delivery in 9 Indian Languages
                            </h4>
                          </div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Toggle language to test instant risk reports &amp; verdicts:
                          </span>
                        </div>

                        {/* Language Selector Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {INTEL_LANGUAGES.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => setActiveIntelLang(l.code)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                                activeIntelLang === l.code
                                  ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/25 scale-105"
                                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                              }`}
                            >
                              <span>{l.flag}</span>
                              <span>{l.native}</span>
                              <span className="text-[10px] opacity-75 font-mono">({l.code.toUpperCase()})</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Autonomous AI Credit Verdict Engine ("Is This Company Worth Giving Credit For?") */}
                      <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                          <div>
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck size={14} /> Autonomous AI Risk Verdict Engine
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                              Is This Company Worth Giving Credit For?
                            </h4>
                            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                              The AI doesn't just show charts — it issues an explainable, definitive credit underwriting decision.
                            </p>
                          </div>

                          {/* Target Scenario Switcher */}
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                            <button
                              onClick={() => setSampleVerdictTarget("high_trust")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                sampleVerdictTarget === "high_trust"
                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <ThumbsUp size={13} />
                              <span>Sample A: Creditworthy</span>
                            </button>
                            <button
                              onClick={() => setSampleVerdictTarget("high_risk")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                sampleVerdictTarget === "high_risk"
                                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <ThumbsDown size={13} />
                              <span>Sample B: High Risk</span>
                            </button>
                          </div>
                        </div>

                        {/* Live Verdict Display */}
                        {(() => {
                          const verdictData = sampleVerdictTarget === "high_trust"
                            ? MULTI_LANG_VERDICTS[activeIntelLang]?.highTrust
                            : MULTI_LANG_VERDICTS[activeIntelLang]?.highRisk;
                          const isApproved = sampleVerdictTarget === "high_trust";

                          return (
                            <div className="space-y-5">
                              {/* Verdict Banner */}
                              <div className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isApproved
                                  ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                                  : "border-red-500 bg-red-500/10 dark:bg-red-950/40 text-red-800 dark:text-red-200"
                              }`}>
                                <div className="space-y-1">
                                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    isApproved ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                                  }`}>
                                    {verdictData.badge}
                                  </span>
                                  <h5 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    {verdictData.verdict}
                                  </h5>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Safe Credit Exposure</span>
                                  <span className={`text-xl font-black font-mono ${isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {verdictData.safeLimit}
                                  </span>
                                </div>
                              </div>

                              {/* AI Risk Reasoning Box */}
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 text-[#FC8019]">
                                    <Bot size={14} /> AI Decision Reasoning ({INTEL_LANGUAGES.find(l => l.code === activeIntelLang)?.name})
                                  </span>
                                  <span>Generated in 1.4s · RoC &amp; GST Grounded</span>
                                </div>
                                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                                  {verdictData.analysis}
                                </p>
                              </div>

                              {/* Decisive Underwriting Score Matrix */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                                  <span className="block text-[10px] font-mono uppercase text-slate-500">Statutory Health</span>
                                  <span className={`text-base font-black font-mono ${isApproved ? "text-emerald-600" : "text-red-600"}`}>
                                    {isApproved ? "98 / 100" : "28 / 100"}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                                  <span className="block text-[10px] font-mono uppercase text-slate-500">Verified Turnover</span>
                                  <span className="block text-base font-black font-mono text-slate-900 dark:text-white">
                                    {isApproved ? "₹18.42 Cr" : "₹1.10 Cr"}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                                  <span className="block text-[10px] font-mono uppercase text-slate-500">Default Probability</span>
                                  <span className={`text-base font-black font-mono ${isApproved ? "text-emerald-600" : "text-red-600"}`}>
                                    {isApproved ? "4.2% (Minimal)" : "89.4% (Severe)"}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                                  <span className="block text-[10px] font-mono uppercase text-slate-500">Court / Police Cases</span>
                                  <span className={`text-base font-black font-mono ${isApproved ? "text-emerald-600" : "text-red-600"}`}>
                                    {isApproved ? "0 Cases (Clean)" : "2 Active NCLT"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3. AI Orchestration Engine based on User Usage */}
                      <div className="rounded-3xl border-2 border-orange-500/40 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/15 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                            <Sliders size={14} />
                            <span>AI Orchestration Engine · Dynamic Persona Adaptation</span>
                          </div>
                          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            It Modifies What You See Based on What You Use Most
                          </h4>
                          <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                            ChaanBean Intelligence monitors daily usage and dynamically reconfigures the platform around your business workflow. If your team primarily runs counterparty due diligence, verification tools are elevated. If you focus on debt collection, automated multi-cadence voice recovery takes over your primary dashboard.
                          </p>
                        </div>

                        {/* Interactive Persona Simulator */}
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setActivePersona("underwriter")}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                activePersona === "underwriter"
                                  ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
                                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              Simulation: Credit Underwriter Profile
                            </button>
                            <button
                              onClick={() => setActivePersona("recovery")}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                activePersona === "recovery"
                                  ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
                                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              Simulation: Debt Recovery Specialist
                            </button>
                            <button
                              onClick={() => setActivePersona("cfo")}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                activePersona === "cfo"
                                  ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
                                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              Simulation: CFO / Business Owner
                            </button>
                          </div>

                          {/* Dynamic Go-To Tool Banner */}
                          <div className="p-4 rounded-2xl border border-orange-500/30 bg-white/90 dark:bg-slate-900/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono uppercase font-bold text-[#FC8019] flex items-center gap-1.5">
                                <Sparkles size={12} /> Auto-Pinned Go-To Capability
                              </span>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {activePersona === "underwriter" && "Instant GST Turnover Filing Verification & Court Litigation Docket (Used 64% of the time)"}
                                {activePersona === "recovery" && "Automated 45-day §43B(h) Multi-Lingual Voice Cadence & Legal Demand Pack (Used 78% of the time)"}
                                {activePersona === "cfo" && "Working Capital Exposure Sentinels & Early Warning Cash Flow Radar (Used 71% of the time)"}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] text-xs font-mono font-bold shrink-0">
                              Active Persona Layout
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 4. Platform Trending Radar (Trending Features & Industry Risk Signals) */}
                      <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                          <div>
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FC8019] flex items-center gap-1.5">
                              <Flame size={14} className="text-orange-500 animate-bounce" /> Platform Trending Radar
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                              What's Trending Across Peer MSMEs &amp; Industry Clusters
                            </h4>
                          </div>
                          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Updated Hourly · Live Network Signals
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {/* Card 1: Trending Feature */}
                          <div className="rounded-2xl border border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20 p-5 space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-[#FC8019] flex items-center gap-1">
                              <Flame size={12} /> #1 Trending Feature
                            </span>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white">
                              Automated 45-Day §43B(h) WhatsApp Notice
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              +340% surge in adoption this month by manufacturers &amp; suppliers to prevent tax penalties on buyer payment delays.
                            </p>
                          </div>

                          {/* Card 2: Trending Industry Risk */}
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={12} /> Trending Industry Risk
                            </span>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white">
                              Textile &amp; Auto Ancillary Payment Cycles
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Average B2B payment stretch increased from 42 days to 59 days across Surat, Tirupur, and Pune manufacturing hubs.
                            </p>
                          </div>

                          {/* Card 3: Trending Counterparty Signal */}
                          <div className="rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Radio size={12} /> Trending Risk Flag
                            </span>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white">
                              MCA Charge Creation &amp; GSTR-3B Spikes
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              AI detected 3.2x increase in delayed GSTR-3B filings among mid-tier wholesale distributors entering Q4.
                            </p>
                          </div>

                          {/* Card 4: Go-To Peer Benchmark */}
                          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Go-To Recommendation
                            </span>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white">
                              Tally Sync + Regional Dialers
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Peers in your turnover slab (₹10Cr–₹50Cr) recover 82% of overdue invoices within 11 days using automated voice cadences.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 5. The Long-Term Intelligence Flywheel */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                          <Cpu size={14} />
                          <span>From Data to Intelligence: The Closed-Loop Flywheel</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {activeFeature.flywheel?.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                              <span className="text-[10px] font-mono font-bold text-[#FC8019]">Phase 0{idx + 1}</span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 6. Strategic MSME Questions Answered Over Time */}
                      {activeFeature.questions && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Strategic MSME Business Questions Answered Over Time
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {activeFeature.questions.map((q, idx) => (
                              <div key={idx} className="rounded-xl border border-orange-500/20 bg-white/90 dark:bg-slate-900/90 p-4 space-y-1 shadow-sm">
                                <span className="text-[10px] font-mono font-bold text-[#FC8019]">Question 0{idx + 1}</span>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{q}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. Detailed Feature Quotas & Statutory Pricing Breakdown inside ChaanBean Intelligence */}
                      <div className="rounded-3xl border-2 border-[#FC8019]/40 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20 p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-500/20 pb-4">
                          <div className="space-y-1">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FC8019] flex items-center gap-1.5">
                              <Sparkles size={14} /> Statutory Resource Allocation Matrix
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                              Detailed Feature Quotas &amp; Statutory Pricing Breakdown
                            </h4>
                            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                              Transparent statutory quota allotments and individual unit valuations unlocked across ChaanBean Intelligence plans.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                              100% Wallet Credit Guarantee
                            </span>
                          </div>
                        </div>

                        {/* High-Contrast Interactive Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white/95 dark:bg-slate-900/95">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800/80 font-mono text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="py-3.5 px-4 font-bold">Feature / Statutory Gateway</th>
                                <th className="py-3.5 px-3">Standard Unit Price</th>
                                <th className="py-3.5 px-3 text-center bg-orange-500/10 text-[#FC8019] font-bold">Retail Plan (₹9,899) Quota</th>
                                <th className="py-3.5 px-3 text-right bg-orange-500/10 text-[#FC8019] font-bold">Gross Value</th>
                                <th className="py-3.5 px-3 text-center bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">Enterprise (₹17,599) Quota</th>
                                <th className="py-3.5 px-4 text-right bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">Gross Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {STATUTORY_QUOTA_BREAKDOWN.map((row, idx) => (
                                <tr key={idx} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/40 transition">
                                  <td className="py-3 px-4">
                                    <span className="font-bold text-slate-900 dark:text-white block">{row.feature}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{row.desc}</span>
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{row.rate}</td>
                                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white bg-orange-500/5">{row.retailQuota}</td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-[#FC8019] bg-orange-500/5">{row.retailGross}</td>
                                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white bg-blue-500/5">{row.entQuota}</td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5">{row.entGross}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 font-mono text-xs">
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td colSpan={2} className="py-3 px-4 font-black uppercase text-slate-700 dark:text-slate-300">
                                  Total Market Gross Value
                                </td>
                                <td className="py-3 px-3 text-center text-slate-500">Gross:</td>
                                <td className="py-3 px-3 text-right font-black text-slate-500 line-through">₹49,200</td>
                                <td className="py-3 px-3 text-center text-slate-500">Gross:</td>
                                <td className="py-3 px-4 text-right font-black text-slate-500 line-through">₹85,950</td>
                              </tr>
                              <tr className="bg-orange-500/10 dark:bg-orange-950/40 text-sm">
                                <td colSpan={2} className="py-3.5 px-4 font-black uppercase text-slate-900 dark:text-white">
                                  Plan Subscription Fee (80% Off Bundled)
                                </td>
                                <td colSpan={2} className="py-3.5 px-3 text-right font-black text-lg text-[#FC8019]">
                                  ₹9,899 / 3 Months
                                </td>
                                <td colSpan={2} className="py-3.5 px-4 text-right font-black text-lg text-blue-600 dark:text-blue-400">
                                  ₹17,599 / 3 Months
                                </td>
                              </tr>
                              <tr className="bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px]">
                                <td colSpan={2} className="py-2.5 px-4 font-bold">
                                  Client Net Benefit
                                </td>
                                <td colSpan={2} className="py-2.5 px-3 text-right font-bold">
                                  Save ₹39,301 · 100% credited to wallet
                                </td>
                                <td colSpan={2} className="py-2.5 px-4 text-right font-bold">
                                  Save ₹68,351 · 100% credited to wallet
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Outcome Banner */}
                  <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                        Strategic Business Outcome
                      </span>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        {activeFeature.outcome}
                      </p>
                    </div>
                    {activeFeature.actionType === "form" ? (
                      <button
                        type="button"
                        onClick={() => openEnquiry(activeFeature.id, activeFeature.title, activeFeature.badge)}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#FC8019] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                      >
                        <Sparkles size={13} />
                        <span>{activeFeature.ctaLabel || "Fill Form & Enquire"}</span>
                      </button>
                    ) : (
                      <Link
                        href="/subscription"
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#FC8019] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                      >
                        <span>{activeFeature.ctaLabel || "Explore Plans"}</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>


      {/* MSME Loans & Credit Section */}
      <section id="loans" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/80 scroll-mt-16">
        <div className="relative mx-auto max-w-7xl z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Working Capital &amp; Business Loans
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Never let delayed buyer payments stop your factory production or supply chain. Access collateral-free working capital, trade invoice discounting, and asset-backed credit with same-day approvals.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loanProducts.map((loan, idx) => {
              const Icon = loan.icon;
              return (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 sm:p-7 shadow-md hover:shadow-xl hover:border-[#FC8019] transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                        <Icon size={22} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {loan.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                        {loan.title}
                      </h3>
                      <div className="text-xl font-black text-[#FC8019] mt-1">
                        {loan.amount}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {loan.rate}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {loan.description}
                    </p>

                    <ul className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {loan.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
                    <Link
                      href="/subscription"
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-[#FC8019] hover:text-[#FC8019] transition shadow-sm"
                    >
                      <span>Check Eligibility &amp; Apply</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border-2 border-[#FC8019]/30 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/80 dark:from-orange-950/20 dark:via-slate-900 dark:to-orange-950/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">Need an Instant Working Capital or Machinery Loan?</h4>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Use our interactive EMI calculator, compare rates, and submit an application with zero physical paperwork.
              </p>
            </div>
            <Link
              href="/subscription"
              className="shrink-0 flex items-center gap-2 rounded-2xl bg-[#FC8019] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
            >
              <span>Explore Loan Portal &amp; Calculator</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Commercial Plans & Universal À La Carte Section */}
      <section id="pricing" className="relative px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070A10]/60 scroll-mt-16">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019] bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
              Commercial Plans &amp; Universal À La Carte
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Transparent Pricing Designed for Every Scale
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              Choose heavily discounted 3-month bundles, or opt for Universal Pay &amp; Use wallet recharges starting from ₹5,000 up to bespoke enterprise customization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* 1. Retail Plan (Growth) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-7 flex flex-col justify-between shadow-sm hover:border-slate-300 transition">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    3 Months Validity · 80% Discount
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Retail Plan (Growth)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ideal for small-to-mid manufacturers needing steady counterparty vetting and automated debt recovery.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    ₹9,899
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono mt-0.5">
                    ₹49,200 Gross Value · 100% Credited to Wallet
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 10 Director DIN &amp; 10 MSME Udyam Reports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 40 GST Slabs &amp; Exact Turnovers Filed</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 3,500 Default Recovery Voice Calls</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 5 Advocate Statutory Legal Notices</li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/subscription"
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#FC8019] text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>View Full Retail Quotas</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* 2. Enterprise Plan */}
            <div className="rounded-3xl border-2 border-[#FC8019] bg-white dark:bg-slate-900 p-7 flex flex-col justify-between shadow-xl shadow-orange-500/10 md:-translate-y-2 relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FC8019] text-white text-[10px] font-mono uppercase font-bold px-3 py-1 rounded-full shadow-md">
                High-Volume Corporate Choice
              </span>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#FC8019] bg-orange-100 dark:bg-orange-950/80 px-2 py-0.5 rounded">
                    3 Months Validity · Enterprise Quotas
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Enterprise Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Comprehensive credit underwriting, priority API endpoints, and dedicated legal chamber desks.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    ₹17,599
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono mt-0.5">
                    ₹85,950 Gross Value · 100% Credited to Wallet
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 20 Director DIN &amp; 20 MSME Udyam Reports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 65 GST Slabs &amp; Exact Turnovers Filed</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 6,000 Default Recovery Voice Calls</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 10 Advocate Statutory Legal Notices</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> 5 Dedicated User Access Seats</li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/subscription"
                  className="w-full py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  <span>Explore Enterprise Plan</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* 3. À La Carte Options: Universal Pay & Use OR Call-Service-Only */}
            <div className="rounded-3xl border-2 border-orange-500/40 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 p-7 flex flex-col justify-between shadow-md hover:border-[#FC8019] transition">
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded">
                      Option 1: Universal Pay &amp; Use
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                      Option 2: Call-Service-Only
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Two À La Carte Modes</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Choose between a Universal Wallet across all 18 gateways, or dedicated Call-Service-Only voice recovery packages.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1 text-[#FC8019]"><Zap size={13} /> 1. Universal Pay &amp; Use</span>
                      <span className="font-mono">₹5k – ₹1,00,000+</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      100% credited to wallet. Deducts ₹1/call, statutory notices, GST &amp; DIN KYC with 0 lock-in.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Phone size={13} /> 2. Call-Service-Only</span>
                      <span className="font-mono">₹4,500 – ₹20,000</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dedicated recovery voice dialer: 3k, 8k, 14k, or 19k calls. 9 Indian languages &amp; full rollover.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Pay &amp; Use wallet carries forward 100%</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Call packages at ₹1.05 to ₹1.50/call</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-[#FC8019] shrink-0" /> Bespoke enterprise setups on ₹50k+ tiers</li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/subscription"
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition flex items-center justify-center gap-1.5 hover:opacity-90"
                >
                  <span>Select À La Carte Option</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/60 scroll-mt-16">
        <div className="relative mx-auto max-w-5xl z-10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              Get In Touch
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Contact Us
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Have questions about verifying a buyer or recovering unpaid dues? Our team is here to assist you.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Contact Details Card */}
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Reach Our Helpline</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Connect directly with our credit verification and recovery advisory team. We assist businesses across all Indian states.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Phone &amp; WhatsApp</span>
                    <a href="tel:+917900048382" className="text-base font-bold text-slate-900 dark:text-white hover:text-[#FC8019] transition">
                      +91 79000 48382
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email Support</span>
                    <a href="mailto:hello@chaanbean.com" className="text-base font-bold text-slate-900 dark:text-white hover:text-[#FC8019] transition">
                      hello@chaanbean.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kerala Office</span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        10 53 , PANAVILA VEEDU, THRIKOVILVATTOM MUKHATHALA, MUKHATHALA - KOLLAM - KERALA 691577— INDIA — 9819206637
                      </p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Mumbai Office</span>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Flat no 101 1st floor Venkatesh Apts CHSL Rawal Nagar Behind Hardik Palace Station Road Mira
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Operating Hours</span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Monday to Saturday · 9:30 AM – 6:30 PM IST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-md">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Send Us a Direct Message</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6">
                Fill in your details and an advisor will contact you within 2 business hours.
              </p>

              {contactSent ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-2">
                  <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Message Received!</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Thank you. Our recovery and verification team will reach out to you shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSent(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Your Name / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar (Agro Traders)"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98XXX XXXXX"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@company.in"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      How Can We Help You?
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Need help running credit checks on buyers or recovering overdue receivables..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#FC8019] py-3 text-sm font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section className="relative overflow-hidden px-6 py-16 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-transparent to-orange-50/50 dark:to-orange-950/10">
        {/* Section Watermark Logos */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-[450px] h-[450px] select-none opacity-[0.035] dark:opacity-[0.06] -rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute -bottom-28 -right-16 w-[520px] h-[520px] select-none opacity-[0.045] dark:opacity-[0.07] rotate-15 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>

        <div className="relative mx-auto max-w-4xl rounded-3xl border border-[#FC8019]/30 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-[#FC8019]/5 overflow-hidden z-10">
          {/* Card Inner Watermark Emblems */}
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 sm:w-80 h-64 sm:h-80 select-none opacity-[0.045] dark:opacity-[0.07] rotate-12 z-0">
            <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
          </div>
          <div className="pointer-events-none absolute -top-12 -left-12 w-48 sm:w-60 h-48 sm:h-60 select-none opacity-[0.03] dark:opacity-[0.05] -rotate-12 z-0">
            <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Ready to Protect Your Working Capital?
            </h2>
            <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-300 mt-3 mb-8">
              Choose your enterprise subscription plan to access full counterparty checks, automated voice recovery cadences, and statutory legal arbitration.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/subscription"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#FC8019] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FC8019]/20 hover:bg-[#E26D0A] transition"
              >
                <span>Explore Subscription Plans</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 transition"
              >
                <span>Already a Customer? Log In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Rich Footer */}
      <footer className="border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A0F] text-slate-600 dark:text-slate-400 pt-16 pb-12 px-6">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* 5-Column Grid */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Col 1: Company Info */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <Link href="/landing" className="flex items-center gap-2.5">
                <div className="relative h-8 w-10 shrink-0">
                  <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Chaan<span className="text-[#FC8019]">Bean</span>
                  </span>
                  <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-400">
                    Credit &amp; Recovery OS
                  </span>
                </div>
              </Link>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ChaanBean is a statutory B2B counterparty due diligence, credit verification, and payment recovery platform for Indian enterprises.
              </p>
              <div className="pt-1 text-xs space-y-2 text-slate-500 dark:text-slate-400">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Kerala Office:</p>
                  <p>10 53 , PANAVILA VEEDU, THRIKOVILVATTOM MUKHATHALA, MUKHATHALA - KOLLAM - KERALA 691577— INDIA — 9819206637</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Mumbai Office:</p>
                  <p>Flat no 101 1st floor Venkatesh Apts CHSL Rawal Nagar Behind Hardik Palace Station Road Mira</p>
                </div>
              </div>
            </div>

            {/* Col 2: Services Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Platform Services
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("ai-future-readiness")}
                    className="hover:text-[#FC8019] transition"
                  >
                    AI Future Readiness
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("ai-business-transformation")}
                    className="hover:text-[#FC8019] transition"
                  >
                    AI Business Transformation
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("ai-credit-due-diligence")}
                    className="hover:text-[#FC8019] transition"
                  >
                    AI Credit Due Diligence
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("continuous-credit-protection")}
                    className="hover:text-[#FC8019] transition"
                  >
                    Continuous Credit Protection
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("smart-collections-automation")}
                    className="hover:text-[#FC8019] transition"
                  >
                    Smart Collections Automation
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("capital-access")}
                    className="hover:text-[#FC8019] transition"
                  >
                    Capital Access
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("chaanbean-connect")}
                    className="hover:text-[#FC8019] transition"
                  >
                    ChaanBean Connect
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    onClick={() => setSelectedFeatureId("chaanbean-intelligence")}
                    className="hover:text-[#FC8019] transition"
                  >
                    ChaanBean Intelligence™
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Solutions Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For Manufacturers &amp; Mills
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For Wholesalers &amp; Distributors
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For B2B Traders &amp; Exporters
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For MSME Vendors &amp; Suppliers
                  </a>
                </li>
                <li>
                  <a href="#loans" className="hover:text-[#FC8019] transition">
                    Working Capital Loans
                  </a>
                </li>
                <li>
                  <a href="#loans" className="hover:text-[#FC8019] transition">
                    Invoice Discounting &amp; Factoring
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Other Pages Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Other Pages &amp; Legal
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <button
                    onClick={() => setActiveModal("about")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("terms")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Terms and Conditions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("privacy")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("manuals")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    User Manuals &amp; Guides
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("blogs")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Our Blogs &amp; Case Studies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("faqs")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Frequently Asked Questions (FAQs)
                  </button>
                </li>
                <li>
                  <Link href="/subscription" className="hover:text-[#FC8019] transition">
                    Enterprise Subscription Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Contact Us & Social Media */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Contact Us &amp; Community
              </h4>
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <Phone size={13} className="text-[#FC8019] shrink-0" />
                  <a href="tel:+917900048382" className="hover:text-[#FC8019] transition font-semibold">
                    +91 79000 48382
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={13} className="text-[#FC8019] shrink-0" />
                  <a href="mailto:hello@chaanbean.com" className="hover:text-[#FC8019] transition font-semibold">
                    hello@chaanbean.com
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={13} className="text-[#FC8019] shrink-0" />
                  <span>Mon – Sat: 9:30 AM – 6:30 PM</span>
                </p>
              </div>

              {/* Social Media Options: Facebook, LinkedIn, X, Instagram */}
              <div className="pt-2">
                <span className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Follow Us
                </span>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://facebook.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1877F2] hover:border-[#1877F2] transition"
                  >
                    <Facebook size={15} />
                  </a>
                  <a
                    href="https://linkedin.com/company/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0A66C2] hover:border-[#0A66C2] transition"
                  >
                    <Linkedin size={15} />
                  </a>
                  <a
                    href="https://x.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X (formerly Twitter)"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#E4405F] hover:border-[#E4405F] transition"
                  >
                    <Instagram size={15} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Official Government & National Initiative Logos Strip (GeM, Make in India Lion, Ministry of Commerce, Digital India, MSME) */}
          <div className="my-6">
            <OfficialInitiativesBar />
          </div>

          {/* Bottom Bar: Copyright & Compliance */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <p>© 2026 ChaanBean Technologies Pvt Ltd. All rights reserved.</p>
            <p className="text-center text-[11px] text-slate-400">
              Statutory Compliance: MSMED Act 2006 · Section 43B(h) · RBI Fair Practices Code · DPDP Act 2023
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/login" className="hover:text-[#FC8019] transition">
                Client Portal
              </Link>
              <span>·</span>
              <Link href="/subscription" className="hover:text-[#FC8019] transition">
                Plans
              </Link>
              <span>·</span>
              <a href="#services" className="hover:text-[#FC8019] transition">
                Back to Top ↑
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Capability Enquiry Modal (Form to Fill & Enquire) */}
      {enquiryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setEnquiryModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border-2 border-orange-500/40 bg-white dark:bg-[#0E131F] p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 dark:text-white my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setEnquiryModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-[11px] font-mono font-bold text-[#FC8019]">
                <Sparkles size={12} />
                <span>{enquiryTarget.badge}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Enquire: {enquiryTarget.title}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Submit your details below and an enterprise solution specialist will contact you with a tailored assessment within 2 business hours.
              </p>
            </div>

            {enquirySubmitted ? (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-3">
                <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 items-center justify-center">
                  <CheckCircle2 size={26} />
                </div>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                  Enquiry Successfully Received!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Thank you for reaching out regarding <span className="font-bold text-slate-900 dark:text-white">{enquiryTarget.title}</span>. Our technical advisory team will review your business requirements and contact you promptly.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setEnquiryModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEnquirySubmitted(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Your Name &amp; Business Name <span className="text-[#FC8019]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar (Agro Traders)"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Phone Number <span className="text-[#FC8019]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98XXX XXXXX"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Email Address <span className="text-[#FC8019]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.in"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Selected Solution / Module
                  </label>
                  <select
                    value={enquiryTarget.id}
                    onChange={(e) => {
                      const found = features.find((f) => f.id === e.target.value);
                      if (found) {
                        setEnquiryTarget({ id: found.id, title: found.title, badge: found.badge });
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                  >
                    <option value="ai-future-readiness">AI Future Readiness (AI Opportunity Roadmap)</option>
                    <option value="ai-business-transformation">AI Business Transformation (Custom Operating Solutions)</option>
                    <option value="capital-access">Capital Access (MSME Working Capital &amp; Invoice Financing)</option>
                    <option value="chaanbean-connect">ChaanBean Connect (Ecosystem &amp; API Integration)</option>
                    <option value="chaanbean-intelligence">ChaanBean Intelligence™ (Autonomous AI &amp; Risk Verdicts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Describe Your Requirements / Current Challenges
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Currently managing billing on Tally ERP with ₹12 Cr turnover, looking to automate WhatsApp reminders and AI phone follow-ups..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#FC8019] py-3 text-sm font-bold text-white shadow-lg shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  <span>Submit Solution Enquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Interactive Modal Dialogs */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
