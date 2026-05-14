export type LangCode = "he" | "en" | "ar" | "ru";

export interface Translations {
  // App
  appName: string;
  appTagline: string;
  // Address
  origin: string;
  destination: string;
  originPlaceholder: string;
  destinationPlaceholder: string;
  detectingLocation: string;
  locationError: string;
  useCurrentLocation: string;
  searchingAddresses: string;
  // Vehicle
  vehicleType: string;
  regular: string;
  large: string;
  regularSub: string;
  largeSub: string;
  // Time
  dateTime: string;
  now: string;
  schedule: string;
  pickDateTime: string;
  confirm: string;
  cancel: string;
  dayLabel: string;
  hourLabel: string;
  minuteLabel: string;
  rideNow: string;
  // Tariff
  tariff: string;
  tariff1: string;
  tariff2: string;
  tariff3: string;
  autoDetected: string;
  manualOverride: string;
  tariffNames: [string, string, string];
  tariffDescs: [string, string, string];
  // Surcharges
  surchargesTitle: string;
  surchargesLabel: string;
  surchargeLabels: {
    highway6: string;
    carmelTunnels: string;
    fastLane: string;
    airport: string;
    phoneOrder: string;
  };
  // Fare
  calculate: string;
  calculating: string;
  estimatedFare: string;
  baseFare: string;
  distanceFare: string;
  timeFare: string;
  largeVehicleSurcharge: string;
  bookingFee: string;
  total: string;
  distance: string;
  duration: string;
  minutes: string;
  km: string;
  ils: string;
  fareDisclaimer: string;
  newCalculation: string;
  // Share
  shareWhatsApp: string;
  shareGeneral: string;
  shareTitle: string;
  shareFrom: string;
  shareTo: string;
  whatsappNotInstalled: string;
  navigateWaze: string;
  wazeNotInstalled: string;
  // Misc
  noRoute: string;
  enterDestination: string;
  addressSuggestions: string;
  searching: string;
  noResults: string;
  days: [string, string, string, string, string, string, string];
  // Subscription countdown
  trialLabel: string;
  paidLabel: string;
  daysLeftPlural: string;
  dayLeftSingular: string;
  expiresToday: string;
  // Voice
  voiceListen: string;
  voiceListening: string;
  voiceNotSupported: string;
  voiceError: string;
  // Settings
  settings: string;
  language: string;
  appearance: string;
  aboutApp: string;
  version: string;
}

const he: Translations = {
  appName: "Taxi Meter Pro",
  appTagline: "מחשבון מונית חכם",
  origin: "נקודת מוצא",
  destination: "יעד",
  originPlaceholder: "מיקום נוכחי...",
  destinationPlaceholder: "לאן נוסעים?",
  detectingLocation: "מאתר מיקום...",
  locationError: "לא ניתן לאתר מיקום",
  useCurrentLocation: "השתמש במיקום הנוכחי",
  searchingAddresses: "מחפש כתובות...",
  vehicleType: "סוג רכב",
  regular: "רגיל",
  large: "גדול (6+)",
  regularSub: "עד 4 נוסעים",
  largeSub: "עד 8 נוסעים",
  dateTime: "זמן נסיעה",
  now: "עכשיו",
  schedule: "הזמנה מראש",
  pickDateTime: "בחר תאריך ושעה",
  confirm: "אישור",
  cancel: "ביטול",
  dayLabel: "יום",
  hourLabel: "שעה",
  minuteLabel: "דקה",
  rideNow: "נסיעה עכשיו",
  tariff: "תעריף",
  tariff1: "תעריף 1",
  tariff2: "תעריף 2",
  tariff3: "תעריף 3",
  autoDetected: "זוהה אוטומטית",
  manualOverride: "ידני",
  tariffNames: ["תעריף 1", "תעריף 2", "תעריף 3"],
  tariffDescs: ["ימים א׳-ה׳ 05:30–21:00", "ע״ש, שבת, חגים ולילה", "נסיעות מחוץ לעיר"],
  surchargesTitle: "תוספות חיוב",
  surchargesLabel: "תוספות",
  surchargeLabels: {
    highway6: "כביש 6",
    carmelTunnels: "מנהרות הכרמל",
    fastLane: "נתיב המהיר",
    airport: 'נתב"ג',
    phoneOrder: "הזמנה טלפונית",
  },
  calculate: "חשב מחיר",
  calculating: "מחשב...",
  estimatedFare: "מחיר משוער",
  baseFare: "דמי פתיחה",
  distanceFare: "לפי מרחק",
  timeFare: "לפי זמן",
  largeVehicleSurcharge: "תוספת רכב גדול",
  bookingFee: "דמי הזמנה",
  total: "סה״כ",
  distance: "מרחק",
  duration: "זמן נסיעה",
  minutes: "דקות",
  km: "ק״מ",
  ils: "₪",
  fareDisclaimer: "* המחיר משוער בלבד. המחיר הסופי עשוי להשתנות בהתאם לתנועה ותנאי הדרך.",
  newCalculation: "חישוב חדש",
  shareWhatsApp: "שתף בוואטסאפ",
  shareGeneral: "שתף",
  shareTitle: "הערכת מחיר Taxi Meter Pro",
  shareFrom: "מ",
  shareTo: "אל",
  whatsappNotInstalled: "וואטסאפ אינה מותקנת במכשיר",
  navigateWaze: "נווט ב-Waze",
  wazeNotInstalled: "Waze אינה מותקנת. פותחת בדפדפן...",
  noRoute: "לא נמצא מסלול",
  enterDestination: "אנא הזן יעד",
  addressSuggestions: "הצעות כתובת",
  searching: "מחפש...",
  noResults: "לא נמצאו תוצאות",
  days: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
  trialLabel: "ניסיון חינם",
  paidLabel: "מנוי",
  daysLeftPlural: "ימים נותרו",
  dayLeftSingular: "יום אחד נותר",
  expiresToday: "פג היום!",
  voiceListen: "דבר לחיפוש כתובת",
  voiceListening: "מאזין... דבר עכשיו",
  voiceNotSupported: "זיהוי קול אינו נתמך בדפדפן זה",
  voiceError: "לא זוהה קול — נסה שוב",
  settings: "הגדרות",
  language: "שפה",
  appearance: "מראה",
  aboutApp: "אודות",
  version: "גרסה",
};

const en: Translations = {
  appName: "Taxi Meter Pro",
  appTagline: "Smart taxi calculator",
  origin: "Origin",
  destination: "Destination",
  originPlaceholder: "Current location...",
  destinationPlaceholder: "Where to?",
  detectingLocation: "Detecting location...",
  locationError: "Unable to detect location",
  useCurrentLocation: "Use current location",
  searchingAddresses: "Searching addresses...",
  vehicleType: "Vehicle type",
  regular: "Regular",
  large: "Large (6+)",
  regularSub: "Up to 4 passengers",
  largeSub: "Up to 8 passengers",
  dateTime: "Ride time",
  now: "Now",
  schedule: "Book ahead",
  pickDateTime: "Select date & time",
  confirm: "Confirm",
  cancel: "Cancel",
  dayLabel: "Day",
  hourLabel: "Hour",
  minuteLabel: "Min",
  rideNow: "Ride now",
  tariff: "Tariff",
  tariff1: "Tariff 1",
  tariff2: "Tariff 2",
  tariff3: "Tariff 3",
  autoDetected: "Auto",
  manualOverride: "Manual",
  tariffNames: ["Tariff 1", "Tariff 2", "Tariff 3"],
  tariffDescs: ["Sun–Thu 05:30–21:00", "Fri eve, Sat, holidays & night", "Intercity rides"],
  surchargesTitle: "Additional charges",
  surchargesLabel: "Extras",
  surchargeLabels: {
    highway6: "Highway 6",
    carmelTunnels: "Carmel Tunnels",
    fastLane: "Fast Lane",
    airport: "Ben Gurion Airport",
    phoneOrder: "Phone Order",
  },
  calculate: "Calculate fare",
  calculating: "Calculating...",
  estimatedFare: "Estimated fare",
  baseFare: "Base fare",
  distanceFare: "Distance fare",
  timeFare: "Time fare",
  largeVehicleSurcharge: "Large vehicle surcharge",
  bookingFee: "Booking fee",
  total: "Total",
  distance: "Distance",
  duration: "Duration",
  minutes: "min",
  km: "km",
  ils: "₪",
  fareDisclaimer: "* Estimated fare only. Final price may vary based on traffic and road conditions.",
  newCalculation: "New calculation",
  shareWhatsApp: "Share on WhatsApp",
  shareGeneral: "Share",
  shareTitle: "Taxi Meter Pro fare estimate",
  shareFrom: "From",
  shareTo: "To",
  whatsappNotInstalled: "WhatsApp is not installed",
  navigateWaze: "Navigate with Waze",
  wazeNotInstalled: "Waze is not installed. Opening in browser...",
  noRoute: "No route found",
  enterDestination: "Please enter a destination",
  addressSuggestions: "Address suggestions",
  searching: "Searching...",
  noResults: "No results found",
  days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  trialLabel: "Free Trial",
  paidLabel: "Subscription",
  daysLeftPlural: "days left",
  dayLeftSingular: "1 day left",
  expiresToday: "expires today!",
  voiceListen: "Speak to search address",
  voiceListening: "Listening... speak now",
  voiceNotSupported: "Voice input not supported in this browser",
  voiceError: "No speech detected — try again",
  settings: "Settings",
  language: "Language",
  appearance: "Appearance",
  aboutApp: "About",
  version: "Version",
};

const ar: Translations = {
  appName: "موניتون",
  appTagline: "حاسبة تاكسي ذكية",
  origin: "نقطة الانطلاق",
  destination: "الوجهة",
  originPlaceholder: "الموقع الحالي...",
  destinationPlaceholder: "إلى أين؟",
  detectingLocation: "جارٍ تحديد الموقع...",
  locationError: "تعذّر تحديد الموقع",
  useCurrentLocation: "استخدم الموقع الحالي",
  searchingAddresses: "جارٍ البحث عن العناوين...",
  vehicleType: "نوع المركبة",
  regular: "عادي",
  large: "كبير (6+)",
  regularSub: "حتى 4 ركاب",
  largeSub: "حتى 8 ركاب",
  dateTime: "وقت الرحلة",
  now: "الآن",
  schedule: "حجز مسبق",
  pickDateTime: "اختر التاريخ والوقت",
  confirm: "تأكيد",
  cancel: "إلغاء",
  dayLabel: "يوم",
  hourLabel: "ساعة",
  minuteLabel: "دقيقة",
  rideNow: "الرحلة الآن",
  tariff: "التعريفة",
  tariff1: "تعريفة 1",
  tariff2: "تعريفة 2",
  tariff3: "تعريفة 3",
  autoDetected: "تلقائي",
  manualOverride: "يدوي",
  tariffNames: ["تعريفة 1", "تعريفة 2", "تعريفة 3"],
  tariffDescs: ["الأحد–الخميس 05:30–21:00", "ليالي الجمعة والسبت والأعياد", "رحلات بين المدن"],
  surchargesTitle: "رسوم إضافية",
  surchargesLabel: "إضافات",
  surchargeLabels: {
    highway6: "طريق 6",
    carmelTunnels: "أنفاق الكرمل",
    fastLane: "المسار السريع",
    airport: "مطار بن غوريون",
    phoneOrder: "طلب هاتفي",
  },
  calculate: "احسب السعر",
  calculating: "جارٍ الحساب...",
  estimatedFare: "السعر التقديري",
  baseFare: "رسوم البدء",
  distanceFare: "رسوم المسافة",
  timeFare: "رسوم الوقت",
  largeVehicleSurcharge: "إضافة المركبة الكبيرة",
  bookingFee: "رسوم الحجز",
  total: "المجموع",
  distance: "المسافة",
  duration: "مدة الرحلة",
  minutes: "دقيقة",
  km: "كم",
  ils: "₪",
  fareDisclaimer: "* السعر تقديري فقط. قد يختلف السعر النهائي حسب حركة المرور وظروف الطريق.",
  newCalculation: "حساب جديد",
  shareWhatsApp: "مشاركة عبر واتساب",
  shareGeneral: "مشاركة",
  shareTitle: "تقدير سعر موניتون",
  shareFrom: "من",
  shareTo: "إلى",
  whatsappNotInstalled: "واتساب غير مثبّت",
  navigateWaze: "التنقل مع Waze",
  wazeNotInstalled: "Waze غير مثبّت. جارٍ الفتح في المتصفح...",
  noRoute: "لم يُعثر على مسار",
  enterDestination: "الرجاء إدخال الوجهة",
  addressSuggestions: "اقتراحات العناوين",
  searching: "جارٍ البحث...",
  noResults: "لا توجد نتائج",
  days: ["أحد", "اثن", "ثلث", "أربع", "خمس", "جمعة", "سبت"],
  trialLabel: "تجربة مجانية",
  paidLabel: "اشتراك",
  daysLeftPlural: "أيام متبقية",
  dayLeftSingular: "يوم واحد متبقٍ",
  expiresToday: "ينتهي اليوم!",
  voiceListen: "تحدث للبحث عن عنوان",
  voiceListening: "جارٍ الاستماع... تحدث الآن",
  voiceNotSupported: "الإدخال الصوتي غير مدعوم في هذا المتصفح",
  voiceError: "لم يُكتشف صوت — حاول مجدداً",
  settings: "الإعدادات",
  language: "اللغة",
  appearance: "المظهر",
  aboutApp: "حول التطبيق",
  version: "الإصدار",
};

const ru: Translations = {
  appName: "Taxi Meter Pro",
  appTagline: "Умный калькулятор такси",
  origin: "Откуда",
  destination: "Куда",
  originPlaceholder: "Текущее местоположение...",
  destinationPlaceholder: "Куда едем?",
  detectingLocation: "Определение местоположения...",
  locationError: "Не удалось определить местоположение",
  useCurrentLocation: "Использовать текущее место",
  searchingAddresses: "Поиск адресов...",
  vehicleType: "Тип транспорта",
  regular: "Стандарт",
  large: "Большое (6+)",
  regularSub: "До 4 пассажиров",
  largeSub: "До 8 пассажиров",
  dateTime: "Время поездки",
  now: "Сейчас",
  schedule: "Заказ заранее",
  pickDateTime: "Дата и время",
  confirm: "Подтвердить",
  cancel: "Отмена",
  dayLabel: "День",
  hourLabel: "Час",
  minuteLabel: "Мин",
  rideNow: "Ехать сейчас",
  tariff: "Тариф",
  tariff1: "Тариф 1",
  tariff2: "Тариф 2",
  tariff3: "Тариф 3",
  autoDetected: "Авто",
  manualOverride: "Вручную",
  tariffNames: ["Тариф 1", "Тариф 2", "Тариф 3"],
  tariffDescs: ["Вс–Чт 05:30–21:00", "Пт вечер, Сб, праздники и ночь", "Межгородские поездки"],
  surchargesTitle: "Дополнительные сборы",
  surchargesLabel: "Доплаты",
  surchargeLabels: {
    highway6: "Шоссе 6",
    carmelTunnels: "Туннели Кармель",
    fastLane: "Скоростная полоса",
    airport: "Аэропорт Бен-Гурион",
    phoneOrder: "Заказ по телефону",
  },
  calculate: "Рассчитать цену",
  calculating: "Расчёт...",
  estimatedFare: "Примерная стоимость",
  baseFare: "Посадочная плата",
  distanceFare: "За расстояние",
  timeFare: "За время",
  largeVehicleSurcharge: "Доплата за большой авто",
  bookingFee: "Сбор за заказ",
  total: "Итого",
  distance: "Расстояние",
  duration: "Время в пути",
  minutes: "мин",
  km: "км",
  ils: "₪",
  fareDisclaimer: "* Стоимость приблизительная. Итоговая цена может отличаться в зависимости от трафика.",
  newCalculation: "Новый расчёт",
  shareWhatsApp: "Отправить в WhatsApp",
  shareGeneral: "Поделиться",
  shareTitle: "Оценка стоимости Taxi Meter Pro",
  shareFrom: "Из",
  shareTo: "До",
  whatsappNotInstalled: "WhatsApp не установлен",
  navigateWaze: "Навигация Waze",
  wazeNotInstalled: "Waze не установлен. Открываю в браузере...",
  noRoute: "Маршрут не найден",
  enterDestination: "Введите пункт назначения",
  addressSuggestions: "Варианты адресов",
  searching: "Поиск...",
  noResults: "Ничего не найдено",
  days: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  trialLabel: "Пробный период",
  paidLabel: "Подписка",
  daysLeftPlural: "дн. осталось",
  dayLeftSingular: "1 день остался",
  expiresToday: "истекает сегодня!",
  voiceListen: "Говорите для поиска адреса",
  voiceListening: "Слушаю... говорите сейчас",
  voiceNotSupported: "Голосовой ввод не поддерживается этим браузером",
  voiceError: "Речь не обнаружена — попробуйте снова",
  settings: "Настройки",
  language: "Язык",
  appearance: "Внешний вид",
  aboutApp: "О приложении",
  version: "Версия",
};

export const TRANSLATIONS: Record<LangCode, Translations> = { he, en, ar, ru };

export const LANGUAGE_META: Record<LangCode, { label: string; flag: string; isRTL: boolean; nativeName: string }> = {
  he: { label: "Hebrew",  flag: "🇮🇱", isRTL: true,  nativeName: "עברית"   },
  en: { label: "English", flag: "🇬🇧", isRTL: false, nativeName: "English"  },
  ar: { label: "Arabic",  flag: "🇸🇦", isRTL: true,  nativeName: "العربية" },
  ru: { label: "Russian", flag: "🇷🇺", isRTL: false, nativeName: "Русский"  },
};
