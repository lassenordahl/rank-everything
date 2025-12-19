/**
 * QR Code Generation Package
 *
 * Lightweight wrapper around the `qrcode` npm package for generating
 * QR codes as base64 data URLs. Works in both browser and Node.js.
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
  /** Width/height of the QR code in pixels (default: 400) */
  size?: number;
  /** Margin around the QR code in modules (default: 2) */
  margin?: number;
  /** Dark color (default: #000000) */
  darkColor?: string;
  /** Light color (default: #ffffff) */
  lightColor?: string;
}

/**
 * Generate a QR code as a base64 data URL (PNG format)
 *
 * @param url - The URL to encode in the QR code
 * @param options - Optional customization options
 * @returns Promise resolving to a base64 data URL string
 */
export async function generateQRCode(url: string, options: QRCodeOptions = {}): Promise<string> {
  const { size = 400, margin = 2, darkColor = '#000000', lightColor = '#ffffff' } = options;

  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });

  return dataUrl;
}

/**
 * Generate a QR code as an SVG string
 *
 * @param url - The URL to encode in the QR code
 * @param options - Optional customization options
 * @returns Promise resolving to an SVG string
 */
export async function generateQRCodeSVG(url: string, options: QRCodeOptions = {}): Promise<string> {
  const { size = 400, margin = 2, darkColor = '#000000', lightColor = '#ffffff' } = options;

  const svg = await QRCode.toString(url, {
    type: 'svg',
    width: size,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });

  return svg;
}
