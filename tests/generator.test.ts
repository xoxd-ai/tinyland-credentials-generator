import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';





vi.mock('sharp', () => {
  const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from('mock-png'));
  const mockPng = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
  const mockComposite = vi.fn().mockReturnValue({ png: mockPng });
  const mockResize = vi.fn().mockReturnValue({
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-resized-logo')),
  });

  const instance = {
    resize: mockResize,
    composite: mockComposite,
    png: mockPng,
    toBuffer: mockToBuffer,
  };

  const mockSharp = vi.fn(() => instance);
  return { default: mockSharp };
});

vi.mock('qrcode', () => ({
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-qr')),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-logo')),
}));





import {
  maskPassword,
  escapeXml,
  configure,
  getConfig,
  resetConfig,
  generateCredentialsCard,
  generateTextCredentialsCard,
  generateCredentialsPackage,
  DEFAULT_DESIGN,
} from '../src/index.js';

import type {
  CredentialsCardData,
  CardDesignOptions,
} from '../src/index.js';


import sharp from 'sharp';
import * as QRCode from 'qrcode';
import * as fsPromises from 'fs/promises';


const mockSharp = vi.mocked(sharp);
const mockQRCodeToBuffer = vi.mocked(QRCode.toBuffer);
const mockReadFile = vi.mocked(fsPromises.readFile);


function getSharpInstance() {
  
  const inst = mockSharp.mock.results[0]?.value;
  return inst as {
    resize: ReturnType<typeof vi.fn>;
    composite: ReturnType<typeof vi.fn>;
    png: ReturnType<typeof vi.fn>;
    toBuffer: ReturnType<typeof vi.fn>;
  };
}





function makeCardData(overrides: Partial<CredentialsCardData> = {}): CredentialsCardData {
  return {
    username: 'testuser',
    displayName: 'Test User',
    tempPassword: 'SuperSecret123!',
    totpUri: 'otpauth://totp/Tinyland:testuser?secret=ABC123&issuer=Tinyland',
    ...overrides,
  };
}





describe('Types', () => {
  it('should accept a minimal CredentialsCardData object', () => {
    const data: CredentialsCardData = makeCardData();
    expect(data).toHaveProperty('username');
    expect(data).toHaveProperty('displayName');
    expect(data).toHaveProperty('tempPassword');
    expect(data).toHaveProperty('totpUri');
  });

  it('should accept CredentialsCardData with optional issuer', () => {
    const data: CredentialsCardData = makeCardData({ issuer: 'Tinyland' });
    expect(data.issuer).toBe('Tinyland');
  });

  it('should accept CredentialsCardData with optional qrCode', () => {
    const data: CredentialsCardData = makeCardData({ qrCode: 'data:image/png;base64,...' });
    expect(data.qrCode).toBeDefined();
  });

  it('should accept CredentialsCardData with both optional fields', () => {
    const data: CredentialsCardData = makeCardData({ issuer: 'X', qrCode: 'Y' });
    expect(data.issuer).toBe('X');
    expect(data.qrCode).toBe('Y');
  });

  it('should accept a CardDesignOptions with all optional fields', () => {
    const opts: CardDesignOptions = {
      width: 1000,
      height: 1500,
      backgroundColor: '#000',
      primaryColor: '#fff',
      accentColor: '#f00',
      fontFamily: 'monospace',
    };
    expect(opts.width).toBe(1000);
  });

  it('should accept an empty CardDesignOptions', () => {
    const opts: CardDesignOptions = {};
    expect(opts.width).toBeUndefined();
  });

  it('should have DEFAULT_DESIGN with all required fields', () => {
    expect(DEFAULT_DESIGN).toHaveProperty('width');
    expect(DEFAULT_DESIGN).toHaveProperty('height');
    expect(DEFAULT_DESIGN).toHaveProperty('backgroundColor');
    expect(DEFAULT_DESIGN).toHaveProperty('primaryColor');
    expect(DEFAULT_DESIGN).toHaveProperty('accentColor');
    expect(DEFAULT_DESIGN).toHaveProperty('fontFamily');
  });
});





describe('Config DI', () => {
  afterEach(() => {
    resetConfig();
  });

  it('should return an empty config by default', () => {
    expect(getConfig()).toEqual({});
  });

  it('should set logoPath via configure', () => {
    configure({ logoPath: '/tmp/logo.png' });
    expect(getConfig().logoPath).toBe('/tmp/logo.png');
  });

  it('should merge partial updates into existing config', () => {
    configure({ logoPath: '/a.png' });
    configure({ logoPath: '/b.png' });
    expect(getConfig().logoPath).toBe('/b.png');
  });

  it('should not mutate returned config objects', () => {
    configure({ logoPath: '/x.png' });
    const c1 = getConfig();
    c1.logoPath = '/mutated.png';
    expect(getConfig().logoPath).toBe('/x.png');
  });

  it('should reset config to empty state', () => {
    configure({ logoPath: '/something.png' });
    resetConfig();
    expect(getConfig()).toEqual({});
  });

  it('should handle configure called with empty object', () => {
    configure({});
    expect(getConfig()).toEqual({});
  });

  it('should handle multiple resets', () => {
    configure({ logoPath: '/a.png' });
    resetConfig();
    resetConfig();
    expect(getConfig()).toEqual({});
  });

  it('should allow setting logoPath to undefined explicitly', () => {
    configure({ logoPath: '/a.png' });
    configure({ logoPath: undefined });
    expect(getConfig().logoPath).toBeUndefined();
  });

  it('should return a new object each time from getConfig', () => {
    configure({ logoPath: '/x.png' });
    const a = getConfig();
    const b = getConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('should preserve logoPath across multiple getConfig calls', () => {
    configure({ logoPath: '/stable.png' });
    expect(getConfig().logoPath).toBe('/stable.png');
    expect(getConfig().logoPath).toBe('/stable.png');
  });

  it('should handle very long logoPath strings', () => {
    const longPath = '/a/' + 'b'.repeat(5000) + '.png';
    configure({ logoPath: longPath });
    expect(getConfig().logoPath).toBe(longPath);
  });

  it('should handle logoPath with special characters', () => {
    const path = '/tmp/my logo (1).png';
    configure({ logoPath: path });
    expect(getConfig().logoPath).toBe(path);
  });
});





describe('maskPassword', () => {
  it('should fully mask passwords of 4 characters or fewer', () => {
    expect(maskPassword('abcd')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('should fully mask passwords of 3 characters', () => {
    expect(maskPassword('abc')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('should fully mask passwords of 2 characters', () => {
    expect(maskPassword('ab')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('should fully mask single character passwords', () => {
    expect(maskPassword('a')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('should fully mask empty string', () => {
    expect(maskPassword('')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  });

  it('should show first 2 and last 2 chars for 5-char password', () => {
    const result = maskPassword('Hello');
    expect(result).toBe('He\u2022lo');
  });

  it('should show first 2 and last 2 chars for 6-char password', () => {
    const result = maskPassword('Secret');
    expect(result).toBe('Se\u2022\u2022et');
  });

  it('should show first 2 and last 2 chars for normal password', () => {
    const result = maskPassword('SuperSecret123!');
    
    expect(result.startsWith('Su')).toBe(true);
    expect(result.endsWith('3!')).toBe(true);
    expect(result.length).toBe(15);
  });

  it('should produce correct bullet count for 8-char password', () => {
    const result = maskPassword('12345678');
    
    expect(result).toBe('12\u2022\u2022\u2022\u202278');
  });

  it('should handle very long passwords', () => {
    const long = 'A'.repeat(100);
    const result = maskPassword(long);
    expect(result.length).toBe(100);
    expect(result.startsWith('AA')).toBe(true);
    expect(result.endsWith('AA')).toBe(true);
    expect(result.substring(2, 98)).toBe('\u2022'.repeat(96));
  });

  it('should handle passwords with special characters', () => {
    const result = maskPassword('!@#$%^&*()');
    expect(result.startsWith('!@')).toBe(true);
    expect(result.endsWith('()')).toBe(true);
  });

  it('should handle passwords with spaces', () => {
    const result = maskPassword('my password');
    expect(result.startsWith('my')).toBe(true);
    expect(result.endsWith('rd')).toBe(true);
  });

  it('should handle unicode characters', () => {
    const result = maskPassword('\u00E9\u00E8\u00EA\u00EB\u00E0');
    
    expect(result.startsWith('\u00E9\u00E8')).toBe(true);
    expect(result.endsWith('\u00EB\u00E0')).toBe(true);
  });

  it('should handle passwords with numbers only', () => {
    const result = maskPassword('123456');
    expect(result).toBe('12\u2022\u202256');
  });

  it('should return 8 bullets for exactly 4 chars', () => {
    expect(maskPassword('1234')).toBe('\u2022'.repeat(8));
  });

  it('should produce different output for 4 vs 5 char passwords', () => {
    const four = maskPassword('1234');
    const five = maskPassword('12345');
    expect(four).not.toBe(five);
  });
});





describe('escapeXml', () => {
  it('should escape ampersand', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
  });

  it('should escape less-than', () => {
    expect(escapeXml('a<b')).toBe('a&lt;b');
  });

  it('should escape greater-than', () => {
    expect(escapeXml('a>b')).toBe('a&gt;b');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('a"b')).toBe('a&quot;b');
  });

  it('should escape apostrophes', () => {
    expect(escapeXml("a'b")).toBe('a&apos;b');
  });

  it('should escape multiple special characters', () => {
    expect(escapeXml('<a>&"b\'')).toBe('&lt;a&gt;&amp;&quot;b&apos;');
  });

  it('should return empty string unchanged', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should return safe strings unchanged', () => {
    expect(escapeXml('Hello World 123')).toBe('Hello World 123');
  });

  it('should handle strings with only special chars', () => {
    expect(escapeXml('&<>"\'&')).toBe('&amp;&lt;&gt;&quot;&apos;&amp;');
  });

  it('should handle multiple ampersands', () => {
    expect(escapeXml('&&&&')).toBe('&amp;&amp;&amp;&amp;');
  });

  it('should handle XML-like tags', () => {
    expect(escapeXml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('should handle unicode characters without escaping them', () => {
    expect(escapeXml('caf\u00E9')).toBe('caf\u00E9');
  });

  it('should handle newlines without escaping them', () => {
    expect(escapeXml('line1\nline2')).toBe('line1\nline2');
  });

  it('should handle mixed content with special and normal chars', () => {
    expect(escapeXml('Hello <World> & "Friends"')).toBe(
      'Hello &lt;World&gt; &amp; &quot;Friends&quot;',
    );
  });

  it('should escape already-escaped ampersand (no idempotency)', () => {
    
    expect(escapeXml('&amp;')).toBe('&amp;amp;');
  });

  it('should handle very long strings', () => {
    const long = '<'.repeat(1000);
    const result = escapeXml(long);
    expect(result).toBe('&lt;'.repeat(1000));
    expect(result.length).toBe(4000);
  });

  it('should handle tab characters without escaping', () => {
    expect(escapeXml('a\tb')).toBe('a\tb');
  });
});





describe('generateCredentialsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfig();
  });

  it('should return a Buffer', async () => {
    const result = await generateCredentialsCard(makeCardData());
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should call QRCode.toBuffer with the TOTP URI', async () => {
    const data = makeCardData();
    await generateCredentialsCard(data);
    expect(mockQRCodeToBuffer).toHaveBeenCalledWith(
      data.totpUri,
      expect.objectContaining({
        errorCorrectionLevel: 'M',
        width: 250,
      }),
    );
  });

  it('should pass default design colors to QR code generation', async () => {
    await generateCredentialsCard(makeCardData());
    expect(mockQRCodeToBuffer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        color: {
          dark: DEFAULT_DESIGN.primaryColor,
          light: DEFAULT_DESIGN.backgroundColor,
        },
      }),
    );
  });

  it('should use custom design colors for QR code when provided', async () => {
    await generateCredentialsCard(makeCardData(), {
      primaryColor: '#ff0000',
      backgroundColor: '#00ff00',
    });
    expect(mockQRCodeToBuffer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        color: { dark: '#ff0000', light: '#00ff00' },
      }),
    );
  });

  it('should create a sharp instance from SVG buffer', async () => {
    await generateCredentialsCard(makeCardData());
    expect(mockSharp).toHaveBeenCalled();
    const firstArg = mockSharp.mock.calls[0][0];
    expect(Buffer.isBuffer(firstArg)).toBe(true);
  });

  it('should call composite with QR code buffer', async () => {
    await generateCredentialsCard(makeCardData());
    const inst = getSharpInstance();
    expect(inst.composite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          input: Buffer.from('mock-qr'),
          top: 450,
        }),
      ]),
    );
  });

  it('should call png() for PNG output', async () => {
    await generateCredentialsCard(makeCardData());
    const inst = getSharpInstance();
    expect(inst.png).toHaveBeenCalled();
  });

  it('should call toBuffer() to get final image', async () => {
    await generateCredentialsCard(makeCardData());
    const inst = getSharpInstance();
    expect(inst.toBuffer).toHaveBeenCalled();
  });

  it('should not read logo file when logoPath is not configured', async () => {
    await generateCredentialsCard(makeCardData());
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('should read logo file when logoPath is configured', async () => {
    configure({ logoPath: '/tmp/logo.png' });
    await generateCredentialsCard(makeCardData());
    expect(mockReadFile).toHaveBeenCalledWith('/tmp/logo.png');
  });

  it('should include logo in composites when logo is loaded', async () => {
    configure({ logoPath: '/tmp/logo.png' });
    await generateCredentialsCard(makeCardData());
    const inst = getSharpInstance();
    expect(inst.composite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ top: 30, left: 50 }),
      ]),
    );
  });

  it('should resize logo to 60x60', async () => {
    configure({ logoPath: '/tmp/logo.png' });
    await generateCredentialsCard(makeCardData());
    
    expect(mockSharp).toHaveBeenCalledTimes(2);
    const logoSharpInst = mockSharp.mock.results[1].value;
    expect(logoSharpInst.resize).toHaveBeenCalledWith(60, 60, { fit: 'inside' });
  });

  it('should gracefully handle logo read failure', async () => {
    configure({ logoPath: '/tmp/missing.png' });
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
    const result = await generateCredentialsCard(makeCardData());
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should have only QR composite when logo fails to load', async () => {
    configure({ logoPath: '/tmp/missing.png' });
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
    await generateCredentialsCard(makeCardData());
    const inst = getSharpInstance();
    const compositeArgs = inst.composite.mock.calls[0][0];
    expect(compositeArgs).toHaveLength(1);
    expect(compositeArgs[0].top).toBe(450);
  });

  it('should include username in SVG', async () => {
    const data = makeCardData({ username: 'alice_wonder' });
    await generateCredentialsCard(data);
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('alice_wonder');
  });

  it('should include escaped display name in SVG', async () => {
    const data = makeCardData({ displayName: 'Alice & Bob' });
    await generateCredentialsCard(data);
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('Alice &amp; Bob');
  });

  it('should include masked password in SVG', async () => {
    const data = makeCardData({ tempPassword: 'LongPassword99' });
    await generateCredentialsCard(data);
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    
    expect(svgString).toContain('Lo');
    expect(svgString).toContain('99');
  });

  it('should use default width/height when no options provided', async () => {
    await generateCredentialsCard(makeCardData());
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('width="800"');
    expect(svgString).toContain('height="1200"');
  });

  it('should use custom width/height from options', async () => {
    await generateCredentialsCard(makeCardData(), { width: 1000, height: 1500 });
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('width="1000"');
    expect(svgString).toContain('height="1500"');
  });

  it('should use default accent color in SVG', async () => {
    await generateCredentialsCard(makeCardData());
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('#e91e63');
  });

  it('should use custom accent color when provided', async () => {
    await generateCredentialsCard(makeCardData(), { accentColor: '#00bcd4' });
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('#00bcd4');
  });

  it('should contain Tinyland.dev branding in SVG', async () => {
    await generateCredentialsCard(makeCardData());
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('Tinyland.dev');
  });

  it('should contain security warning in SVG', async () => {
    await generateCredentialsCard(makeCardData());
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('SECURITY WARNING');
  });

  it('should contain setup instructions in SVG', async () => {
    await generateCredentialsCard(makeCardData());
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('Setup Instructions');
  });

  it('should throw on QR code generation failure', async () => {
    mockQRCodeToBuffer.mockRejectedValueOnce(new Error('QR fail'));
    await expect(generateCredentialsCard(makeCardData())).rejects.toThrow(
      'Failed to generate credentials card',
    );
  });

  it('should throw on sharp processing failure', async () => {
    const inst = mockSharp({} as any);
    inst.toBuffer.mockRejectedValueOnce(new Error('sharp fail'));
    mockSharp.mockClear();
    await expect(generateCredentialsCard(makeCardData())).rejects.toThrow(
      'Failed to generate credentials card',
    );
  });
});





describe('generateTextCredentialsCard', () => {
  it('should return a string', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(typeof result).toBe('string');
  });

  it('should contain the username', async () => {
    const result = await generateTextCredentialsCard(makeCardData({ username: 'bob42' }));
    expect(result).toContain('bob42');
  });

  it('should contain the display name', async () => {
    const result = await generateTextCredentialsCard(
      makeCardData({ displayName: 'Bob Johnson' }),
    );
    expect(result).toContain('Bob Johnson');
  });

  it('should contain a masked password', async () => {
    const result = await generateTextCredentialsCard(
      makeCardData({ tempPassword: 'MySecret88!' }),
    );
    
    expect(result).toContain('My');
    expect(result).toContain('8!');
    expect(result).toContain('\u2022');
  });

  it('should contain the TOTP URI', async () => {
    const uri = 'otpauth://totp/Test:user?secret=XYZ';
    const result = await generateTextCredentialsCard(makeCardData({ totpUri: uri }));
    expect(result).toContain(uri);
  });

  it('should contain setup instructions', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('Setup Instructions');
  });

  it('should contain step 1 instruction', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('1. Download an authenticator app');
  });

  it('should contain step 2 instruction', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('2. Scan the QR code');
  });

  it('should contain step 3 instruction', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('3. Enter the 6-digit code');
  });

  it('should contain step 4 instruction', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('4. Change your temporary password');
  });

  it('should contain security warning', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('SECURITY WARNING');
  });

  it('should contain border decoration characters', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    
    expect(result).toContain('\u2550');
  });

  it('should contain divider decoration characters', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('\u2500');
  });

  it('should contain a timestamp', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('Generated:');
  });

  it('should contain the Tinyland.dev brand', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('Tinyland.dev');
  });

  it('should contain Confidential notice', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('Confidential');
  });

  it('should contain admin contact email', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('admin@stonewallunderground.com');
  });

  it('should contain "Two-Factor Authentication" section', async () => {
    const result = await generateTextCredentialsCard(makeCardData());
    expect(result).toContain('Two-Factor Authentication');
  });
});





describe('generateCredentialsPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfig();
  });

  it('should return an object with image, text, and filename', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(result).toHaveProperty('image');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('filename');
  });

  it('should return a Buffer for image', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(Buffer.isBuffer(result.image)).toBe(true);
  });

  it('should return a string for text', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(typeof result.text).toBe('string');
  });

  it('should return a string for filename', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(typeof result.filename).toBe('string');
  });

  it('should include the username in the filename', async () => {
    const result = await generateCredentialsPackage(makeCardData({ username: 'jane_doe' }));
    expect(result.filename).toContain('jane_doe');
  });

  it('should include "credentials" prefix in the filename', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(result.filename.startsWith('credentials-')).toBe(true);
  });

  it('should include a numeric timestamp in the filename', async () => {
    const before = Date.now();
    const result = await generateCredentialsPackage(makeCardData());
    const after = Date.now();
    
    const parts = result.filename.split('-');
    const ts = parseInt(parts[parts.length - 1], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('should pass custom design options to the image generator', async () => {
    const customDesign: CardDesignOptions = { width: 900, accentColor: '#abcdef' };
    await generateCredentialsPackage(makeCardData(), customDesign);
    const svgBuffer = mockSharp.mock.calls[0][0] as Buffer;
    const svgString = svgBuffer.toString();
    expect(svgString).toContain('width="900"');
    expect(svgString).toContain('#abcdef');
  });

  it('should generate image and text in parallel (both exist)', async () => {
    const result = await generateCredentialsPackage(makeCardData());
    expect(result.image).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it('should contain the username in the text output', async () => {
    const result = await generateCredentialsPackage(makeCardData({ username: 'parallel_user' }));
    expect(result.text).toContain('parallel_user');
  });
});
