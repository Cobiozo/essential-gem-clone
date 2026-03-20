import React from 'react';
import { Facebook, Instagram, Youtube, Linkedin, Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

const SOCIAL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  messenger: MessageCircle,
  whatsapp: Phone,
  telegram: Send,
};

const SOCIAL_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  messenger: '#A259FF',
  whatsapp: '#25D366',
  telegram: '#0088cc',
};

export const FooterSection: React.FC<Props> = ({ config }) => {
  const {
    company_name, address, phone, email, links, social,
    bg_color, text_color, copyright_text,
  } = config;

  const socialLinks: Array<{ platform: string; url: string }> = social || [];
  const footerLinks: Array<{ text: string; url: string }> = links || [];

  return (
    <footer
      className="py-12"
      style={{ backgroundColor: bg_color || '#0a1628', color: text_color || '#ffffff' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Company info */}
          <div className="space-y-3">
            {company_name && <h3 className="text-lg font-bold" style={{ whiteSpace: 'pre-line' }}>{company_name}</h3>}
            {address && (
              <div className="flex items-start gap-2 text-sm opacity-80">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{address}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-sm opacity-80">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2 text-sm opacity-80">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href={`mailto:${email}`} className="hover:underline">{email}</a>
              </div>
            )}
          </div>

          {/* Links */}
          {footerLinks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider opacity-60">Linki</h4>
              <ul className="space-y-2">
                {footerLinks.map((link, i) => (
                  <li key={i}>
                    <a href={link.url} className="text-sm opacity-80 hover:opacity-100 hover:underline transition-opacity">
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social */}
          {socialLinks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider opacity-60">Social Media</h4>
              <div className="flex gap-3 flex-wrap">
                {socialLinks.filter(s => s.url).map((s, i) => {
                  const Icon = SOCIAL_ICONS[s.platform];
                  const color = SOCIAL_COLORS[s.platform] || '#ffffff';
                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {Icon ? <Icon className="w-5 h-5 text-white" /> : <span className="text-xs text-white font-bold">{s.platform.charAt(0).toUpperCase()}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {config.inner_elements?.length > 0 && (
          <div className="mt-8">
            {config.inner_elements.map((el: any) => <InnerElementRenderer key={el.id} element={el} />)}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs opacity-50">
          {copyright_text || `© ${new Date().getFullYear()} ${company_name || 'Firma'}. Wszelkie prawa zastrzeżone.`}
        </div>
      </div>
    </footer>
  );
};
