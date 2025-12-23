import { EmailBlock } from './types';

const BOX_VARIANTS = {
  info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️' },
  success: { bg: '#dcfce7', border: '#22c55e', icon: '✅' },
  warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️' },
  error: { bg: '#fee2e2', border: '#ef4444', icon: '❌' },
};

export function blocksToHtml(blocks: EmailBlock[]): string {
  const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);
  
  const blocksHtml = sortedBlocks.map(block => {
    switch (block.type) {
      case 'header':
        const logoSrc = block.content.logoUrl || '/logo.png';
        return `
          <div style="background-color: ${block.content.backgroundColor}; padding: 20px; text-align: center;">
            ${block.content.showLogo ? `<img src="${logoSrc}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;" />` : ''}
            <h1 style="color: ${block.content.textColor}; margin: 0; font-size: 24px; font-weight: bold;">
              ${block.content.text}
            </h1>
          </div>
        `;
      
      case 'text':
        return `
          <div style="padding: 15px 20px;">
            ${block.content.html}
          </div>
        `;
      
      case 'button':
        return `
          <div style="padding: 15px 20px; text-align: ${block.content.align};">
            <a href="${block.content.url}" 
               style="display: inline-block; background-color: ${block.content.backgroundColor}; 
                      color: ${block.content.textColor}; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: 500;">
              ${block.content.text}
            </a>
          </div>
        `;
      
      case 'image':
        if (!block.content.src) return '';
        return `
          <div style="padding: 15px 20px; text-align: ${block.content.align};">
            <img src="${block.content.src}" 
                 alt="${block.content.alt}" 
                 style="max-width: ${block.content.width}; height: auto;" />
          </div>
        `;
      
      case 'box':
        const variant = BOX_VARIANTS[block.content.variant as keyof typeof BOX_VARIANTS] || BOX_VARIANTS.info;
        return `
          <div style="margin: 15px 20px; padding: 15px; background-color: ${variant.bg}; 
                      border-left: 4px solid ${variant.border}; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${variant.icon} ${block.content.title}
            </div>
            <div>${block.content.content}</div>
          </div>
        `;
      
      case 'separator':
        return `
          <div style="padding: 10px 20px;">
            <hr style="border: none; border-top: 1px ${block.content.style} ${block.content.color}; margin: 0;" />
          </div>
        `;
      
      case 'spacer':
        return `<div style="height: ${block.content.height}px;"></div>`;
      
      case 'footer':
        return `
          <div style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
            ${block.content.html}
          </div>
        `;
      
      default:
        return '';
    }
  }).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      ${blocksHtml}
    </div>
  `;
}

export function htmlToBlocks(html: string): EmailBlock[] {
  // Simple parser - returns empty array, user builds from scratch
  // In future could parse existing HTML templates
  return [];
}
