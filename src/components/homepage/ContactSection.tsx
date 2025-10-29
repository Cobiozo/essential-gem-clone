import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactSection = () => {
  const contacts = [
    {
      icon: Mail,
      label: 'Email',
      value: 'kontakt@purelife.info.pl',
      link: 'mailto:kontakt@purelife.info.pl'
    },
    {
      icon: Phone,
      label: 'Telefon',
      value: '+48 123 456 789',
      link: 'tel:+48123456789'
    },
    {
      icon: MapPin,
      label: 'Lokalizacja',
      value: 'Polska',
      link: null
    }
  ];

  return (
    <section className="py-20 px-4 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-foreground uppercase tracking-wide">
            Kontakt
          </h2>
          <p className="text-muted-foreground text-lg">
            W tym miejscu znajdziesz informacje o kontakcie do Pure Life
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {contacts.map((contact, index) => {
            const IconComponent = contact.icon;
            return (
              <div 
                key={index} 
                className="text-center group hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <IconComponent className="w-10 h-10 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{contact.label}</h3>
                {contact.link ? (
                  <a 
                    href={contact.link} 
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {contact.value}
                  </a>
                ) : (
                  <p className="text-muted-foreground font-medium">{contact.value}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center border-t border-border pt-12">
          <h3 className="text-xl font-bold mb-3 text-foreground">Osoba do kontaktu</h3>
          <p className="text-muted-foreground text-lg">Sebastian Snopek</p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
