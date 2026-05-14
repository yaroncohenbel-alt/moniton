import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRANSLATIONS, LANGUAGE_META, type LangCode, type Translations } from "@/constants/translations";

const STORAGE_KEY = "@moniton_lang";
const DEFAULT_LANG: LangCode = "he";

interface LanguageContextValue {
  lang: LangCode;
  t: Translations;
  isRTL: boolean;
  setLang: (lang: LangCode) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  t: TRANSLATIONS[DEFAULT_LANG],
  isRTL: true,
  setLang: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  // Load saved language on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in TRANSLATIONS) {
        applyLang(saved as LangCode, false);
      }
    });
  }, []);

  const applyLang = useCallback((newLang: LangCode, save = true) => {
    const meta = LANGUAGE_META[newLang];
    setLangState(newLang);

    // Apply direction
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.dir = meta.isRTL ? "rtl" : "ltr";
        document.documentElement.lang = newLang;
      }
    } else {
      // On native, force RTL layout if needed (takes effect immediately in newer RN)
      I18nManager.allowRTL(meta.isRTL);
      I18nManager.forceRTL(meta.isRTL);
    }

    if (save) {
      void AsyncStorage.setItem(STORAGE_KEY, newLang);
    }
  }, []);

  const setLang = useCallback(async (newLang: LangCode) => {
    applyLang(newLang, true);
  }, [applyLang]);

  const meta = LANGUAGE_META[lang];

  return (
    <LanguageContext.Provider
      value={{ lang, t: TRANSLATIONS[lang], isRTL: meta.isRTL, setLang }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
