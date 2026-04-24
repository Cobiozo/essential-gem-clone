import React from 'react';

const PURELIFE_LOGO = "https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png";
const EQOLOGY_LOGO = "/lovable-uploads/eqology-ibp-logo.png";

/**
 * Pasek brandingu wyświetlany na stronach potwierdzenia / anulowania rejestracji
 * oraz innych stronach publicznych systemu eventów.
 * Pokazuje logo Pure Life i logo Eqology Independent Business Partner obok siebie.
 */
export const DualBrandHeader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center gap-6 py-6 px-4 rounded-t-lg ${className}`}
      style={{
        background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
      }}
    >
      <img
        src={PURELIFE_LOGO}
        alt="Pure Life"
        className="h-12 md:h-14 w-auto object-contain"
        loading="eager"
      />
      <div className="h-10 w-px bg-black/20" aria-hidden />
      <img
        src={EQOLOGY_LOGO}
        alt="Eqology Independent Business Partner"
        className="h-12 md:h-14 w-auto object-contain"
        loading="eager"
        onError={(e) => {
          // Graceful fallback jeśli plik logo nie został jeszcze wgrany
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
};

export default DualBrandHeader;
