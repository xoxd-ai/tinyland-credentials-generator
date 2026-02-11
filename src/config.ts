/**
 * Configuration for the credentials generator.
 * Uses a dependency-injection pattern so callers can set the logo path
 * without coupling to any framework or directory convention.
 */
export interface CredentialsGeneratorConfig {
  /** Full filesystem path to a logo image (PNG recommended). */
  logoPath?: string;
}

let _config: CredentialsGeneratorConfig = {};

/**
 * Merge additional configuration values into the current config.
 */
export function configure(config: Partial<CredentialsGeneratorConfig>): void {
  _config = { ..._config, ...config };
}

/**
 * Return a shallow copy of the current configuration.
 */
export function getConfig(): CredentialsGeneratorConfig {
  return { ..._config };
}

/**
 * Reset the configuration to its default (empty) state.
 */
export function resetConfig(): void {
  _config = {};
}
