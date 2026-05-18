
INSERT INTO public.news_hub_posts (
  type, title, slug, category_id, tags, cover_url, short_description, content,
  media_metadata, is_pinned, is_published, bento_size, published_at,
  style_overrides, content_blocks
)
VALUES (
  'article',
  'Pure Life Team',
  'pure-life-team',
  '0289732d-52ec-4aa3-b534-61e45fc277a6',
  ARRAY['zespół','misja','zdrowie','społeczność','rozwój']::text[],
  '/news-hub-demo/pure-life-team-hero.jpg',
  'Poznaj ludzi, wartości i system pracy, które stoją za Pure Life Team - wspólnotą profesjonalistów zdrowego stylu życia.',
  NULL,
  '{}'::jsonb,
  true,
  true,
  'l',
  now(),
  jsonb_build_object(
    'title', jsonb_build_object('size',48,'weight',800,'color','#ffffff','align','center'),
    'shortDescription', jsonb_build_object('size',20,'color','hsl(45 90% 70%)','align','center'),
    'cover', jsonb_build_object('fit','cover','height',480,'position','center','overlay','#000000','overlayOpacity',0.35),
    'page', jsonb_build_object('maxWidth',1100,'background','linear-gradient(180deg, hsl(220 50% 8%) 0%, hsl(220 40% 12%) 100%)')
  ),
  jsonb_build_array(
    jsonb_build_object('id','b_heading_intro','type','heading',
      'data', jsonb_build_object('level',1,'text','Pure Life Team','align','center','color','hsl(45 90% 65%)'),
      'style', jsonb_build_object('mt',24,'mb',8)),
    jsonb_build_object('id','b_paragraph_lead','type','paragraph',
      'data', jsonb_build_object('html','<p><strong>Pure Life Team</strong> to coś więcej niż zespół - to <em>wspólnota ludzi</em>, którzy łączą pasję do zdrowego życia z konkretnym systemem rozwoju biznesu. Razem budujemy zaufanie, dzielimy się wiedzą i wspieramy tych, którzy dopiero zaczynają. <a href="/aktualnosci">Zobacz nasze aktualności</a></p>'),
      'style', jsonb_build_object('mb',16,'align','center','maxWidth',820)),
    jsonb_build_object('id','b_callout_mission','type','callout',
      'data', jsonb_build_object('variant','info','title','Nasza misja','text','Pomagać ludziom żyć lepiej dzięki czystej wodzie, dobrej energii i mądrym decyzjom. Każdego dnia, bez kompromisów.','icon','Sparkles'),
      'style', jsonb_build_object('mt',8,'mb',24,'radius',16)),
    jsonb_build_object('id','b_h2_what','type','heading',
      'data', jsonb_build_object('level',2,'text','Czym jest Pure Life Team','align','left'),
      'style', jsonb_build_object('mt',16,'mb',12)),
    jsonb_build_object('id','b_image_team','type','image',
      'data', jsonb_build_object('url','/news-hub-demo/pure-life-team-hero.jpg','alt','Zespół Pure Life Team','caption','Nasz zespół na ostatniej konwencji - łączymy doświadczenie z młodą energią.','fit','cover','height',420),
      'style', jsonb_build_object('mb',24,'radius',18)),
    jsonb_build_object('id','b_columns_values','type','columns',
      'data', jsonb_build_object('ratio','1-1','columns', jsonb_build_array(
        jsonb_build_array(
          jsonb_build_object('id','b_col_l_h3','type','heading',
            'data', jsonb_build_object('level',3,'text','Dlaczego ludzie nas wybierają','align','left'),
            'style', jsonb_build_object('mb',8)),
          jsonb_build_object('id','b_col_l_p','type','paragraph',
            'data', jsonb_build_object('html','<p>Stawiamy na <strong>jakość relacji</strong>, transparentność i realne wsparcie. Nowy partner otrzymuje przypisanego mentora, gotowe materiały i konkretny plan pierwszych 30 dni.</p>'))
        ),
        jsonb_build_array(
          jsonb_build_object('id','b_col_r_callout','type','callout',
            'data', jsonb_build_object('variant','success','title','Co zyskujesz','text','Mentora 1:1, dostęp do akademii online, gotowe scenariusze rozmów i zamknięte grupy wsparcia.','icon','CheckCircle2'),
            'style', jsonb_build_object('radius',14))
        )
      )),
      'style', jsonb_build_object('mt',8,'mb',24)),
    jsonb_build_object('id','b_divider_1','type','divider',
      'data', jsonb_build_object('thickness',2,'color','hsl(45 90% 55%)'),
      'style', jsonb_build_object('mt',16,'mb',24,'maxWidth',120,'align','center')),
    jsonb_build_object('id','b_h2_values','type','heading',
      'data', jsonb_build_object('level',2,'text','Nasze wartości w obrazach','align','center'),
      'style', jsonb_build_object('mb',16)),
    jsonb_build_object('id','b_gallery','type','gallery',
      'data', jsonb_build_object('images', jsonb_build_array(
        '/news-hub-demo/pure-life-team-g1.jpg',
        '/news-hub-demo/pure-life-team-g2.jpg',
        '/news-hub-demo/pure-life-team-g3.jpg',
        '/news-hub-demo/pure-life-team-g4.jpg'
      ),'columns',4),
      'style', jsonb_build_object('mb',32,'radius',12)),
    jsonb_build_object('id','b_h2_pillars','type','heading',
      'data', jsonb_build_object('level',2,'text','Cztery filary Pure Life Team','align','left'),
      'style', jsonb_build_object('mb',12)),
    jsonb_build_object('id','b_table_pillars','type','table',
      'data', jsonb_build_object('headerRow',true,'rows', jsonb_build_array(
        jsonb_build_array('Filar','Co dajemy','Efekt dla Ciebie'),
        jsonb_build_array('Mentoring','Indywidualny opiekun przez pierwsze 90 dni','Szybki start bez błędów'),
        jsonb_build_array('Akademia','Ponad 120 lekcji wideo i quizów','Wiedza, gdy jej potrzebujesz'),
        jsonb_build_array('Społeczność','Cotygodniowe spotkania online','Motywacja i wymiana doświadczeń'),
        jsonb_build_array('System','Gotowe narzędzia CRM, kalendarz, materiały','Pełna automatyzacja codziennej pracy')
      )),
      'style', jsonb_build_object('mb',24)),
    jsonb_build_object('id','b_callout_before','type','callout',
      'data', jsonb_build_object('variant','warning','title','Zanim do nas dołączysz','text','Wymagamy etyki, regularności i otwartości na naukę. Jeśli szukasz szybkiego zarobku bez wysiłku - to nie tutaj.','icon','AlertTriangle'),
      'style', jsonb_build_object('mb',24,'radius',16)),
    jsonb_build_object('id','b_video','type','video',
      'data', jsonb_build_object('url','https://www.youtube.com/watch?v=ScMzIvxBSi4','caption','Film prezentacyjny Pure Life Team - 3 minuty o tym, kim jesteśmy.'),
      'style', jsonb_build_object('mb',24,'radius',16)),
    jsonb_build_object('id','b_file','type','file_download',
      'data', jsonb_build_object('url','/news-hub-demo/pure-life-team-hero.jpg','name','Przewodnik Pure Life Team (PDF).pdf','description','Kompletny przewodnik startowy dla nowych członków zespołu.','size',2457600),
      'style', jsonb_build_object('mb',24,'radius',14)),
    jsonb_build_object('id','b_cta','type','button_cta',
      'data', jsonb_build_object('text','Dołącz do Pure Life Team','url','/auth','variant','default','align','center'),
      'style', jsonb_build_object('mt',8,'mb',32)),
    jsonb_build_object('id','b_embed','type','embed',
      'data', jsonb_build_object('html','<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=21.0%2C52.20%2C21.05%2C52.25&layer=mapnik" width="100%" height="320" style="border:0;border-radius:12px" loading="lazy"></iframe>'),
      'style', jsonb_build_object('mb',24)),
    jsonb_build_object('id','b_legacy_html','type','legacy_html',
      'data', jsonb_build_object('html','<p style="font-size:13px;opacity:.7;text-align:center">(c) Pure Life Team - wszystkie prawa zastrzeżone. Materiał wzorcowy, przygotowany jako szablon edytora postów.</p>'),
      'style', jsonb_build_object('mt',16,'mb',8)),
    jsonb_build_object('id','b_divider_end','type','divider',
      'data', jsonb_build_object('thickness',1,'color','hsl(220 20% 30%)'),
      'style', jsonb_build_object('mt',8,'mb',24,'maxWidth',600,'align','center'))
  )
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category_id = EXCLUDED.category_id,
  tags = EXCLUDED.tags,
  cover_url = EXCLUDED.cover_url,
  short_description = EXCLUDED.short_description,
  is_pinned = EXCLUDED.is_pinned,
  is_published = EXCLUDED.is_published,
  bento_size = EXCLUDED.bento_size,
  style_overrides = EXCLUDED.style_overrides,
  content_blocks = EXCLUDED.content_blocks,
  updated_at = now();
