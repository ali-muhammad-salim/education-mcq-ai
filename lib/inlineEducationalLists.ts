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

/** Distinguish a ninth lettered item from a nested Roman list. */
export function educationalLines(text: string) {
  let expectedLetter = 'a';
  return restoreInlineLetteredLists(text).split('\n').map(line => {
    const trimmed = line.trim();
    const letter = /^([a-z]\.)\s+([\s\S]*)$/i.exec(trimmed);
    const roman = /^([ivxlcdm]+\.)\s+([\s\S]*)$/i.exec(trimmed);
    if (letter && (!roman || letter[1][0].toLowerCase() === expectedLetter)) {
      expectedLetter = String.fromCharCode(letter[1].toLowerCase().charCodeAt(0) + 1);
      return { marker: letter[1], body: letter[2], kind: 'letter' as const };
    }
    if (roman) return { marker: roman[1], body: roman[2], kind: 'roman' as const };
    if (trimmed.startsWith('•')) return { marker: '•', body: trimmed.replace(/^•\s*/, ''), kind: 'bullet' as const };
    return { marker: '', body: line, kind: 'text' as const };
  });
}
