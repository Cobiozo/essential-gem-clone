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
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-black">KONTAKT</h2>
          <p className="text-gray-600">
            W tym miejscu znajdziesz informacje o kontakcie do Pure Life
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {contacts.map((contact, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center">
                  <contact.icon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black">{contact.label}</h3>
              {contact.link ? (
                <a 
                  href={contact.link} 
                  className="text-gray-600 hover:text-[hsl(45,100%,51%)] transition-colors text-sm"
                >
                  {contact.value}
                </a>
              ) : (
                <p className="text-gray-600 text-sm">{contact.value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="text-center border-t pt-8">
          <h3 className="text-lg font-semibold mb-2 text-black">Osoba do kontaktu</h3>
          <p className="text-gray-600">Sebastian Snopek</p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
