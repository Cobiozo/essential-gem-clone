import React from 'react';
import { CMSButton } from './CMSButton';

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  is_active: boolean;
}

interface CMSContentProps {
  item: CMSItem;
  onButtonClick: (title: string, url?: string) => void;
}

export const CMSContent: React.FC<CMSContentProps> = ({ item, onButtonClick }) => {
  const { type, title, description, url } = item;

  switch (type) {
    case 'button':
      const hasDescription = description && description.length > 50;
      return (
        <CMSButton
          title={title || ''}
          description={description}
          url={url}
          type={hasDescription ? 'detailed' : 'simple'}
          onClick={() => onButtonClick(title || '', url || undefined)}
        />
      );

    case 'info_text':
      return (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="text-sm text-blue-800">
            {title && <div className="font-medium mb-2">{title}</div>}
            {description && <div className="whitespace-pre-line">{description}</div>}
          </div>
        </div>
      );

    case 'tip':
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="text-sm text-yellow-800">
            {title && <div className="font-medium mb-1">💡 {title}</div>}
            {description && <div>{description}</div>}
          </div>
        </div>
      );

    case 'description':
      return (
        <div className="text-sm text-gray-600 mb-4 leading-relaxed">
          {title && <div className="font-medium mb-2">{title}</div>}
          {description && <div className="whitespace-pre-line">{description}</div>}
        </div>
      );

    case 'contact_info':
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-700">
            {title && <div className="font-medium mb-2">📞 {title}</div>}
            {description && <div className="whitespace-pre-line">{description}</div>}
          </div>
        </div>
      );

    case 'support_info':
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-green-800">
            {title && <div className="font-medium mb-2">🆘 {title}</div>}
            {description && <div className="whitespace-pre-line">{description}</div>}
          </div>
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-600 mb-3">
          {title && <div className="font-medium">{title}</div>}
          {description && <div>{description}</div>}
        </div>
      );
  }
};