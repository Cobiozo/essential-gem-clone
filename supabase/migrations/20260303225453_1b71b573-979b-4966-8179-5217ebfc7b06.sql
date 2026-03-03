UPDATE email_templates 
SET body_html = REPLACE(body_html, 'href="#"', 'href="https://purelife.info.pl/auth"')
WHERE internal_name = 'welcome_registration';