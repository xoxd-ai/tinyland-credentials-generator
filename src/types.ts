/**
 * Data required to generate a credentials card.
 */
export interface CredentialsCardData {
  username: string;
  displayName: string;
  tempPassword: string;
  totpUri: string;
  issuer?: string;
  qrCode?: string; // Base64 QR code data URL (optional)
}

/**
 * Styling options for the credentials card image.
 */
export interface CardDesignOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}
