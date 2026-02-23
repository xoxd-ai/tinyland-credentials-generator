




export function maskPassword(password: string): string {
  if (password.length <= 4) {
    return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  }

  const first = password.substring(0, 2);
  const last = password.substring(password.length - 2);
  const masked = '\u2022'.repeat(password.length - 4);

  return `${first}${masked}${last}`;
}




export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
