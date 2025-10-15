import React from 'react';
import dropletIcon from '@/assets/pure-life-droplet.png';

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={dropletIcon} alt="" className="w-6 h-6" />
            <span className="text-[hsl(45,100%,51%)] font-bold text-lg">PURE LIFE</span>
          </div>
          
          {/* Copyright */}
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Pure Life. Wszystkie prawa zastrzeżone.
          </p>
          
          {/* Links */}
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="text-gray-600 hover:text-[hsl(45,100%,51%)] transition-colors">
              Polityka prywatności
            </a>
            <span className="text-gray-400">•</span>
            <a href="#" className="text-gray-600 hover:text-[hsl(45,100%,51%)] transition-colors">
              Regulamin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
