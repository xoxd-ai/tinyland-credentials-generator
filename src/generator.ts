import sharp from 'sharp';
import * as QRCode from 'qrcode';
import * as fs from 'fs/promises';
import type { CredentialsCardData, CardDesignOptions } from './types.js';
import { getConfig } from './config.js';
import { maskPassword, escapeXml } from './helpers.js';

/**
 * Default card design — Stonewall / Tinyland branding.
 */
export const DEFAULT_DESIGN: Required<CardDesignOptions> = {
  width: 800,
  height: 1200,
  backgroundColor: '#ffffff',
  primaryColor: '#1a1a1a',
  accentColor: '#e91e63', // Pink accent for Stonewall branding
  fontFamily: 'Arial, sans-serif',
};

/**
 * Generate a credentials card PNG image with all setup information.
 */
export async function generateCredentialsCard(
  data: CredentialsCardData,
  options: CardDesignOptions = {},
): Promise<Buffer> {
  const design = { ...DEFAULT_DESIGN, ...options };
  const { width, height, backgroundColor, primaryColor, accentColor } = design;

  try {
    // Generate QR code for TOTP
    const qrCodeBuffer = await QRCode.toBuffer(data.totpUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: primaryColor,
        light: backgroundColor,
      },
    });

    // Load logo via DI config (graceful fallback if unavailable)
    let logoBuffer: Buffer | null = null;
    const { logoPath } = getConfig();
    if (logoPath) {
      try {
        logoBuffer = await fs.readFile(logoPath);
      } catch {
        // Logo not found — continue without it
      }
    }

    // Create SVG template for the card
    const cardSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${backgroundColor}"/>

        <!-- Header Section -->
        <rect x="0" y="0" width="${width}" height="120" fill="${accentColor}"/>
        <text x="${width / 2}" y="75" text-anchor="middle" font-family="${design.fontFamily}" font-size="36" font-weight="bold" fill="white">
          Tinyland.dev
        </text>

        <!-- Title -->
        <text x="${width / 2}" y="180" text-anchor="middle" font-family="${design.fontFamily}" font-size="28" font-weight="bold" fill="${primaryColor}">
          Account Credentials
        </text>

        <!-- User Information Section -->
        <rect x="50" y="220" width="${width - 100}" height="2" fill="${accentColor}" opacity="0.3"/>

        <text x="80" y="270" font-family="${design.fontFamily}" font-size="18" font-weight="bold" fill="${primaryColor}">
          Username:
        </text>
        <text x="200" y="270" font-family="${design.fontFamily}" font-size="18" fill="${primaryColor}">
          ${escapeXml(data.username)}
        </text>

        <text x="80" y="310" font-family="${design.fontFamily}" font-size="18" font-weight="bold" fill="${primaryColor}">
          Name:
        </text>
        <text x="200" y="310" font-family="${design.fontFamily}" font-size="18" fill="${primaryColor}">
          ${escapeXml(data.displayName)}
        </text>

        <text x="80" y="350" font-family="${design.fontFamily}" font-size="18" font-weight="bold" fill="${primaryColor}">
          Password:
        </text>
        <rect x="195" y="330" width="200" height="30" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="1" rx="5"/>
        <text x="200" y="350" font-family="monospace" font-size="16" fill="${primaryColor}" letter-spacing="2">
          ${maskPassword(data.tempPassword)}
        </text>

        <!-- QR Code Section -->
        <rect x="50" y="390" width="${width - 100}" height="2" fill="${accentColor}" opacity="0.3"/>

        <text x="${width / 2}" y="430" text-anchor="middle" font-family="${design.fontFamily}" font-size="20" font-weight="bold" fill="${primaryColor}">
          Two-Factor Authentication Setup
        </text>

        <!-- QR Code placeholder - will be composited -->
        <rect x="${(width - 250) / 2}" y="450" width="250" height="250" fill="white" stroke="${primaryColor}" stroke-width="2"/>

        <!-- Instructions -->
        <text x="${width / 2}" y="730" text-anchor="middle" font-family="${design.fontFamily}" font-size="16" fill="${primaryColor}">
          Scan with Google Authenticator, Authy, or similar app
        </text>

        <!-- Setup Steps -->
        <text x="80" y="780" font-family="${design.fontFamily}" font-size="18" font-weight="bold" fill="${primaryColor}">
          Setup Instructions:
        </text>

        <text x="100" y="815" font-family="${design.fontFamily}" font-size="14" fill="${primaryColor}">
          1. Download an authenticator app on your phone
        </text>
        <text x="100" y="840" font-family="${design.fontFamily}" font-size="14" fill="${primaryColor}">
          2. Open the app and scan the QR code above
        </text>
        <text x="100" y="865" font-family="${design.fontFamily}" font-size="14" fill="${primaryColor}">
          3. Enter the 6-digit code from the app when logging in
        </text>
        <text x="100" y="890" font-family="${design.fontFamily}" font-size="14" fill="${primaryColor}">
          4. Change your temporary password after first login
        </text>

        <!-- Security Warning -->
        <rect x="50" y="920" width="${width - 100}" height="2" fill="#ff0000" opacity="0.5"/>

        <text x="${width / 2}" y="960" text-anchor="middle" font-family="${design.fontFamily}" font-size="16" font-weight="bold" fill="#cc0000">
          SECURITY WARNING
        </text>

        <text x="${width / 2}" y="990" text-anchor="middle" font-family="${design.fontFamily}" font-size="12" fill="#cc0000">
          Keep this card secure. Do not share your credentials.
        </text>
        <text x="${width / 2}" y="1010" text-anchor="middle" font-family="${design.fontFamily}" font-size="12" fill="#cc0000">
          Change your password immediately after first login.
        </text>
        <text x="${width / 2}" y="1030" text-anchor="middle" font-family="${design.fontFamily}" font-size="12" fill="#cc0000">
          If compromised, contact admin@stonewallunderground.com
        </text>

        <!-- Footer -->
        <rect x="0" y="1080" width="${width}" height="120" fill="${primaryColor}"/>
        <text x="${width / 2}" y="1140" text-anchor="middle" font-family="${design.fontFamily}" font-size="14" fill="white">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </text>
        <text x="${width / 2}" y="1165" text-anchor="middle" font-family="${design.fontFamily}" font-size="12" fill="white">
          &copy; ${new Date().getFullYear()} Tinyland.dev - Confidential
        </text>
      </svg>
    `;

    // Convert SVG to image
    const svgBuffer = Buffer.from(cardSvg);
    const baseImage = sharp(svgBuffer);

    // Composite the QR code onto the card
    const composites: sharp.OverlayOptions[] = [
      {
        input: qrCodeBuffer,
        top: 450,
        left: Math.floor((width - 250) / 2),
      },
    ];

    // Add logo if available
    if (logoBuffer) {
      const resizedLogo = await sharp(logoBuffer)
        .resize(60, 60, { fit: 'inside' })
        .toBuffer();

      composites.push({
        input: resizedLogo,
        top: 30,
        left: 50,
      });
    }

    // Generate final image
    const finalImage = await baseImage.composite(composites).png().toBuffer();

    return finalImage;
  } catch (error) {
    console.error('Failed to generate credentials card:', error);
    throw new Error('Failed to generate credentials card');
  }
}

/**
 * Generate a simplified text-based credentials card (fallback).
 */
export async function generateTextCredentialsCard(
  data: CredentialsCardData,
): Promise<string> {
  const border = '\u2550'.repeat(60);
  const divider = '\u2500'.repeat(60);

  return `
${border}
                    Tinyland.dev
                    Account Credentials
${border}

Username:     ${data.username}
Display Name: ${data.displayName}
Password:     ${maskPassword(data.tempPassword)}

${divider}
                 Two-Factor Authentication

${data.totpUri}

Scan the above URL with your authenticator app
or enter it manually.

${divider}
                    Setup Instructions

1. Download an authenticator app (Google Authenticator, Authy)
2. Scan the QR code or enter the URL above
3. Enter the 6-digit code when logging in
4. Change your temporary password after first login

${divider}
                   \u26A0\uFE0F  SECURITY WARNING \u26A0\uFE0F

\u2022 Keep this information secure
\u2022 Do not share your credentials
\u2022 Change your password immediately after first login
\u2022 If compromised, contact admin@stonewallunderground.com

${border}
Generated: ${new Date().toISOString()}
\u00A9 ${new Date().getFullYear()} Tinyland.dev - Confidential
${border}
`;
}

/**
 * Generate both image and text versions of the credentials card.
 */
export async function generateCredentialsPackage(
  data: CredentialsCardData,
  options?: CardDesignOptions,
): Promise<{
  image: Buffer;
  text: string;
  filename: string;
}> {
  const [image, text] = await Promise.all([
    generateCredentialsCard(data, options),
    generateTextCredentialsCard(data),
  ]);

  const filename = `credentials-${data.username}-${Date.now()}`;

  return {
    image,
    text,
    filename,
  };
}
