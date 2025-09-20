import React from 'react';
import { CMSButton } from './CMSButton';
import { SecureMedia } from './SecureMedia';
import { FormattedText } from './FormattedText';

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
  text_formatting?: any;
  title_formatting?: any;
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

  const renderMedia = () => {
    if (!item.media_url || !item.media_type) return null;
    
    return (
      <SecureMedia
        mediaUrl={item.media_url}
        mediaType={item.media_type as 'image' | 'video'}
        altText={item.media_alt_text || item.title || 'Zabezpieczone media'}
        className="w-full max-w-md mx-auto shadow-lg mb-4"
      />
    );
  };

  switch (item.type) {
    case 'header_text':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-gray-600 leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'author':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm text-gray-500"
            as="p"
          />
        </div>
      );

    case 'info_text':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'tip':
      return (
        <div className="mt-3 sm:mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
          {renderMedia()}
          <p className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed">
            <span className="font-medium">💡 Wskazówka: </span>
            <FormattedText
              text={item.description || ''}
              formatting={item.text_formatting}
              as="span"
            />
          </p>
        </div>
      );

    case 'description':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-gray-50 rounded-lg">
          <FormattedText
            text={item.title || ''}
            formatting={item.title_formatting}
            className="font-medium text-sm sm:text-base text-gray-800 mb-2"
            as="h4"
          />
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed whitespace-pre-line"
            as="p"
          />
        </div>
      );

    case 'contact_info':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
          <h4 className="font-medium text-sm sm:text-base text-green-800 mb-2">
            📞 <FormattedText
              text={item.title || ''}
              formatting={item.title_formatting}
              as="span"
            />
          </h4>
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-green-700 leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'support_info':
      return (
        <div className="mt-3 sm:mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <h4 className="font-medium text-sm sm:text-base text-blue-800 mb-2">
            🛟 <FormattedText
              text={item.title || ''}
              formatting={item.title_formatting}
              as="span"
            />
          </h4>
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-blue-700 leading-relaxed"
            as="p"
          />
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