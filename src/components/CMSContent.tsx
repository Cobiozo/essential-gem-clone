import React from 'react';
import { CMSButton } from './CMSButton';

interface CMSItem {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
}

interface CMSContentProps {
  item: CMSItem;
  onClick?: (title: string, url?: string) => void;
}

export const CMSContent: React.FC<CMSContentProps> = ({ item, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(item.title || '', item.url || undefined);
    }
  };

  // Render media content if available
  const renderMedia = () => {
    if (!item.media_url) return null;

    const mediaProps = {
      className: "w-full max-w-md mx-auto rounded-lg shadow-sm mb-4",
      style: { maxHeight: '300px', objectFit: 'cover' as const }
    };

    if (item.media_type === 'image') {
      return (
        <img
          src={item.media_url}
          alt={item.media_alt_text || item.title || 'Zdjęcie'}
          {...mediaProps}
        />
      );
    } else if (item.media_type === 'video') {
      return (
        <video
          src={item.media_url}
          controls
          preload="metadata"
          className="w-full max-w-md mx-auto rounded-lg shadow-sm mb-4"
          style={{ maxHeight: '300px' }}
        >
          {item.media_alt_text && <track kind="descriptions" label={item.media_alt_text} />}
          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </video>
      );
    }

    return null;
  };

  switch (item.type) {
    case 'header_text':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 leading-relaxed">
            {item.description}
          </p>
        </div>
      );

    case 'author':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <p className="text-xs sm:text-sm text-gray-500">
            {item.description}
          </p>
        </div>
      );

    case 'info_text':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed">
            {item.description}
          </p>
        </div>
      );

    case 'tip':
      return (
        <div className="mt-3 sm:mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed">
            <span className="font-medium">💡 Wskazówka: </span>
            {item.description}
          </p>
        </div>
      );

    case 'description':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm sm:text-base text-gray-800 mb-2">{item.title}</h4>
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        </div>
      );

    case 'contact_info':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
          <h4 className="font-medium text-sm sm:text-base text-green-800 mb-2">📞 {item.title}</h4>
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-green-700 leading-relaxed">
            {item.description}
          </p>
        </div>
      );

    case 'support_info':
      return (
        <div className="mt-3 sm:mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <h4 className="font-medium text-sm sm:text-base text-blue-800 mb-2">🛟 {item.title}</h4>
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-blue-700 leading-relaxed">
            {item.description}
          </p>
        </div>
      );

    case 'button':
    default:
      const hasDescription = item.description && item.description.length > 50;
      return (
        <div>
          {renderMedia()}
          <CMSButton
            title={item.title || ''}
            description={item.description}
            url={item.url}
            type={hasDescription ? 'detailed' : 'simple'}
            onClick={handleClick}
          />
        </div>
      );
  }
};