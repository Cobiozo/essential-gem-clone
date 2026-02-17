import { useLanguage } from '@/contexts/LanguageContext';

export function Disclaimer() {
  const { tf } = useLanguage();

  return (
    <p className="text-xs text-center text-muted-foreground">
      {tf('calculator.disclaimer', 'Symulacja ma charakter poglądowy. Kwoty są kwotami brutto/netto w zależności od formy rozliczenia. W obliczeniach przyjęto minimalną stawkę 20€ za klienta. Kursy walut mogą wpływać na ostateczny wynik w PLN.')}
    </p>
  );
}
