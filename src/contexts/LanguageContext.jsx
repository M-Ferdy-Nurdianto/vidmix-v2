import React, { createContext, useState, useContext, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import idTranslations from '../locales/id.json';

const translations = {
  en: enTranslations,
  id: idTranslations
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('vidmix_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('vidmix_language', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'id' : 'en'));
  };

  const t = (key) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
