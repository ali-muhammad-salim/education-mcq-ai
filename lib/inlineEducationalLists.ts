/** Restore the line breaks lost when a PDF's lettered list was extracted as prose. */
export function restoreInlineLetteredLists(text: string): string {
  // Require an introductory colon and two consecutive items before changing layout.
  // This keeps initials, abbreviations, answer choices and isolated references intact.
  if (!/:\s*a\.\s+[^\n]+[,;]\s+b\.\s+/i.test(text)) return text;

  let next = 'a'.charCodeAt(0);
  return text.replace(/([:;,])\s+([a-z])\.\s+/gi, (match, separator: string, letter: string) => {
    const code = letter.toLowerCase().charCodeAt(0);
    if (code !== next) return match;
    next += 1;
    return `${separator}\n${letter}. `;
  });
}
