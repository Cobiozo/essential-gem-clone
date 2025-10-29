import React from 'react';
import dropletIcon from '@/assets/pure-life-droplet.png';

const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={dropletIcon} alt="" className="w-6 h-6" />
            <span className="text-primary font-bold text-lg">PURE LIFE</span>
          </div>
          
          {/* Copyright */}
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Pure Life. Wszystkie prawa zastrzeżone.
          </p>
          
          {/* Links */}
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Polityka prywatności
            </a>
            <span className="text-muted-foreground/50">•</span>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Regulamin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
