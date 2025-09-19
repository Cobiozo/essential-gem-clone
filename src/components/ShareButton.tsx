import React from 'react';
import { GreenButton } from './GreenButton';

interface ShareButtonProps {
  text: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ text, icon, onClick }) => {
  return (
    <GreenButton onClick={onClick} icon={icon} variant="outline">
      {text}
    </GreenButton>
  );
};