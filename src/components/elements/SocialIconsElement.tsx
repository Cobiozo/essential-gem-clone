import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialIcon {
  platform: string;
  url: string;
}

interface SocialIconsElementProps {
  icons: SocialIcon[];
  size?: number;
  className?: string;
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  email: Mail,
};

export const SocialIconsElement: React.FC<SocialIconsElementProps> = ({
  icons,
  size = 24,
  className,
}) => {
  if (!icons || icons.length === 0) {
    return (
      <div className="flex gap-2 text-muted-foreground">
        <p className="text-sm">Dodaj ikony społecznościowe</p>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', className)}>
      {icons.map((icon, index) => {
        const IconComponent = iconMap[icon.platform.toLowerCase()] || Mail;
        return (
          <a
            key={index}
            href={icon.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
          >
            <IconComponent style={{ width: size, height: size }} />
          </a>
        );
      })}
    </div>
  );
};
