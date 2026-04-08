import React, { useEffect, useState } from 'react';
import { MessageSquare, Clock, Mail, Phone, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact, EventRegistrationInfo } from './types';

interface GuestMessage {
  id: string;
  content: string;
  sent_at_second: number;
  created_at: string;
  guest_name: string | null;
}

interface ContactExpandedDetailsProps {
  contact: TeamContact;
  registrationInfo?: EventRegistrationInfo;
}

export const ContactExpandedDetails: React.FC<ContactExpandedDetailsProps> = ({
  contact,
  registrationInfo,
}) => {
  const { tf } = useLanguage();
  const [chatMessages, setChatMessages] = useState<GuestMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!contact.email && !registrationInfo?.registration_id) return;
      setLoadingMessages(true);

      let query = supabase
        .from('auto_webinar_guest_messages' as any)
        .select('id, content, sent_at_second, created_at, guest_name');

      if (registrationInfo?.registration_id) {
        query = query.eq('guest_registration_id', registrationInfo.registration_id);
      } else if (contact.email) {
        query = query.eq('guest_email', contact.email.trim().toLowerCase());
      }

      const { data } = await query
        .order('sent_at_second', { ascending: true })
        .limit(50);

      setChatMessages((data as unknown as GuestMessage[]) || []);
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [contact.email, registrationInfo?.registration_id]);

  const formatSeconds = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/30 rounded-b-lg border-t border-border/50">
      {/* Contact details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {contact.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone_number && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{contact.phone_number}</span>
          </div>
        )}
        {contact.notes && (
          <div className="flex items-start gap-2 text-muted-foreground col-span-full">
            <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="text-xs">{contact.notes}</span>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{tf('teamContacts.chatMessages', 'Wiadomości na czacie')}</span>
        </div>

        {loadingMessages ? (
          <p className="text-xs text-muted-foreground pl-5">{tf('teamContacts.loading', 'Ładowanie...')}</p>
        ) : chatMessages.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-5">{tf('teamContacts.noChatMessages', 'Brak wiadomości na czacie')}</p>
        ) : (
          <div className="space-y-1.5 pl-5">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">[{formatSeconds(msg.sent_at_second)}]</span>
                </div>
                <span className="text-foreground break-words">
                  {msg.guest_name && <span className="font-semibold">{msg.guest_name}: </span>}
                  „{msg.content}"
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
