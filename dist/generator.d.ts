import type { CredentialsCardData, CardDesignOptions } from './types.js';
export declare const DEFAULT_DESIGN: Required<CardDesignOptions>;
export declare function generateCredentialsCard(data: CredentialsCardData, options?: CardDesignOptions): Promise<Buffer>;
export declare function generateTextCredentialsCard(data: CredentialsCardData): Promise<string>;
export declare function generateCredentialsPackage(data: CredentialsCardData, options?: CardDesignOptions): Promise<{
    image: Buffer;
    text: string;
    filename: string;
}>;
//# sourceMappingURL=generator.d.ts.map