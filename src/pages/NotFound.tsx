import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useSecurityPreventions } from "@/hooks/useSecurityPreventions";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  // Enable security preventions for public pages
  useSecurityPreventions();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">{t('error.notFound')}</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          {t('error.returnHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
