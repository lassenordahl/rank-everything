import { describe, it, expect } from 'vitest';
import { generateQRCode, generateQRCodeSVG } from './index';

describe('QR Code Generation', () => {
  it('should generate a data URL for a simple URL', async () => {
    const result = await generateQRCode('https://example.com');

    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(result.length).toBeGreaterThan(100);
  });

  it('should generate an SVG string', async () => {
    const result = await generateQRCodeSVG('https://example.com');

    expect(result).toContain('<svg');
    expect(result).toContain('</svg>');
  });

  it('should respect custom size option', async () => {
    const smallQR = await generateQRCode('https://example.com', { size: 100 });
    const largeQR = await generateQRCode('https://example.com', { size: 800 });

    // Larger QR should have more data
    expect(largeQR.length).toBeGreaterThan(smallQR.length);
  });

  it('should handle room join URLs', async () => {
    const result = await generateQRCode('https://rank-everything.pages.dev/ABCD');

    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
