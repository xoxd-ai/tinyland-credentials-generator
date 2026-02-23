


export interface CredentialsCardData {
  username: string;
  displayName: string;
  tempPassword: string;
  totpUri: string;
  issuer?: string;
  qrCode?: string; 
}




export interface CardDesignOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}
