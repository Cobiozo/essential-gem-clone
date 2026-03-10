import React from 'react';
import { AutoWebinarEmbed } from '@/components/auto-webinar/AutoWebinarEmbed';
import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';

/**
 * Public auto-webinar watch page — no login required.
 * Route: /auto-webinar/watch/:slug
 * Guests access this page from email "Dołącz teraz" links.
 */
const AutoWebinarPublicPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header with logo */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={newPureLifeLogo} alt="Pure Life" className="h-8 object-contain" />
          <span className="text-sm font-medium text-muted-foreground">Webinar na żywo</span>
        </div>
      </header>

      {/* Player */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <AutoWebinarEmbed />
      </main>
    </div>
  );
};

export default AutoWebinarPublicPage;
