import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Pure Life. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
