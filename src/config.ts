




export interface CredentialsGeneratorConfig {
  
  logoPath?: string;
}

let _config: CredentialsGeneratorConfig = {};




export function configure(config: Partial<CredentialsGeneratorConfig>): void {
  _config = { ..._config, ...config };
}




export function getConfig(): CredentialsGeneratorConfig {
  return { ..._config };
}




export function resetConfig(): void {
  _config = {};
}
