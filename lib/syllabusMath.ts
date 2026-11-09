// Syllabus sources store formulas as plain ASCII (x^m, log_a, x^(m+n), √(a^2+b^2)).
// Convert those spans to KaTeX so the rendered SLO text is typeset instead of literal carets.

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sec', 'cosec', 'csc', 'cot',
  'log', 'ln', 'sqrt', 'conjugate', 'lim', 'max', 'min'
]);

const NAMED_GREEK = new Set(['alpha', 'beta', 'gamma', 'delta', 'theta', 'phi', 'pi', 'sigma', 'omega']);

const PROSE_WORDS = new Set([
  'or', 'is', 'of', 'by', 'in', 'to', 'as', 'at', 'be', 'an',
  'we', 'if', 'no', 'on', 'it', 'so', 'do', 'up', 'us'
]);

const SYMBOLS: Record<string, string> = {
  '·': '\\cdot',
  '×': '\\times',
  '÷': '\\div',
  '±': '\\pm',
  '≤': '\\le',
  '≥': '\\ge',
  '≠': '\\ne',
  '↔': '\\leftrightarrow',
  '→': '\\to',
  '∞': '\\infty',
  'θ': '\\theta',
  'π': '\\pi',
  'Σ': '\\Sigma',
  '∪': '\\cup',
  '∩': '\\cap',
  '∈': '\\in',
  '∉': '\\notin',
  '⊂': '\\subset',
  '⊆': '\\subseteq',
  '⊃': '\\supset',
  '⊇': '\\supseteq',
  '∅': '\\emptyset',
  '°': '^{\\circ}'
};

const STRONG_MARKER = /[/\^_=≠≤≥±·×÷√↔→|<>∞∪∩∈∉⊂⊆⊃⊇∅]/;

function isIdentifierChar(ch: string): boolean {
  return /[A-Za-z\u0370-\u03FF\u1D00-\u1DBF\u0300-\u036F\u2070-\u209F\u00B2\u00B3\u00B9]/.test(ch);
}

function readBalanced(text: string, index: number, open: string, close: string): { inner: string; end: number } | null {
  if (text[index] !== open) return null;
  let depth = 0;
  for (let i = index; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return { inner: text.slice(index + 1, i), end: i + 1 };
    }
  }
  return null;
}

function readScriptOperand(source: string, index: number, isSubscript: boolean): { value: string; end: number } | null {
  let i = index;
  while (source[i] === ' ') i++;
  if (source[i] === '{') {
    const group = readBalanced(source, i, '{', '}');
    if (group) return { value: group.inner, end: group.end };
  }
  if (source[i] === '(') {
    const group = readBalanced(source, i, '(', ')');
    if (group) return { value: group.inner, end: group.end };
  }
  if (source[i] === '-' || source[i] === '+') {
    let end = i + 1;
    while (/[0-9]/.test(source[end] || '')) end++;
    if (end > i + 1) return { value: source.slice(i, end), end };
  }
  if (/[0-9]/.test(source[i] || '')) {
    let end = i;
    while (/[0-9]/.test(source[end] || '')) end++;
    return { value: source.slice(i, end), end };
  }
  if (/[A-Za-z\u0370-\u03FF]/.test(source[i] || '')) {
    const limit = isSubscript ? 3 : 1;
    let end = i;
    while (end < source.length && end - i < limit && /[A-Za-z\u0370-\u03FF]/.test(source[end])) end++;
    return { value: source.slice(i, end), end };
  }
  return null;
}

export function asciiMathToLatex(expression: string, latexGroups = false): string {
  let source = expression
    .replace(/([A-Za-z])\u033F/g, '\\overline{\\overline{$1}}')
    .replace(/([A-Za-z])\u0304/g, '\\bar{$1}');

  // Split only at the current grouping level, so a fraction keeps its
  // numerator/denominator and an exponent such as p^(x+2) stays together.
  if (source.includes('/')) {
    let depth = 0;
    const separators: number[] = [], divisions: {at:number;size:number;operator:string}[] = [];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\\') {
        const environment = /^\\begin\{(bmatrix|pmatrix|matrix|vmatrix|Vmatrix|Bmatrix|array)\}[\s\S]*?\\end\{\1\}/.exec(source.slice(i));
        if (environment) { i += environment[0].length - 1; continue; }
      }
      if ('([{'.includes(source[i])) depth++;
      else if (')]}'.includes(source[i])) depth--;
      else if (!depth && /[/*·×÷]/.test(source[i])) divisions.push({at:i,size:1,operator:source[i]});
      else if (!depth && source[i] === '\\') {
        const operator = /^\\(?:times|cdot|div)\b/.exec(source.slice(i));
        if (operator) { divisions.push({at:i,size:operator[0].length,operator:operator[0]}); i += operator[0].length - 1; }
      }
      else if (!depth && /[=±≠≤≥<>+,;]/.test(source[i])) separators.push(i);
      else if (!depth && source[i] === '-' && i > 0 && !/[=+*/^(]/.test(source.slice(0,i).trim().slice(-1))) separators.push(i);
    }
    if (separators.length) {
      let start = 0, result = '';
      for (const at of separators) {
        result += asciiMathToLatex(source.slice(start, at), latexGroups) + asciiMathToLatex(source[at], latexGroups);
        start = at + 1;
      }
      return result + asciiMathToLatex(source.slice(start), latexGroups);
    }
    if (divisions.length) {
      const {at,size,operator} = divisions[divisions.length - 1];
      if (operator !== '/') return asciiMathToLatex(source.slice(0,at), latexGroups) + (SYMBOLS[operator] || operator) + ' ' + asciiMathToLatex(source.slice(at+size), latexGroups);
      const ungroup = (s: string) => {
        const trimmed = s.trim(), group = trimmed.startsWith('(') ? readBalanced(trimmed, 0, '(', ')') : null;
        return group?.end === trimmed.length ? group.inner : trimmed;
      };
      return '\\frac{' + asciiMathToLatex(ungroup(source.slice(0, at)), latexGroups) + '}{' + asciiMathToLatex(ungroup(source.slice(at + 1)), latexGroups) + '}';
    }
  }

  let out = '';
  for (let i = 0; i < source.length;) {
    const ch = source[i];

    if (ch === '\\') {
      const environment = /^\\begin\{(bmatrix|pmatrix|matrix|vmatrix|Vmatrix|Bmatrix|array)\}([\s\S]*?)\\end\{\1\}/.exec(source.slice(i));
      if (environment) {
        out += '\\begin{' + environment[1] + '}' + environment[2].split(/\\\\/).map(row => row.split('&').map(cell => asciiMathToLatex(cell, true)).join('&')).join('\\\\') + '\\end{' + environment[1] + '}';
        i += environment[0].length;
        continue;
      }
      const command = /^\\(?:[A-Za-z]+|[^A-Za-z])/.exec(source.slice(i));
      if (command) {
        out += command[0]; i += command[0].length;
        if (/^\\(?:text|textrm|texttt|mathrm|operatorname|url)$/.test(command[0])) {
          const group = readBalanced(source, i, '{', '}');
          if (group) { out += '{' + group.inner + '}'; i = group.end; }
        }
        continue;
      }
    }

    if (ch === '[' && source[i + 1] === '[') {
      const matrix = readBalanced(source, i, '[', ']');
      if (matrix) {
        const rows = matrix.inner.trim().slice(1, -1).split(/\]\s*,\s*\[/);
        out += '\\begin{bmatrix}' + rows.map(row => row.split(',').map(cell => asciiMathToLatex(cell.trim(), latexGroups)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
        i = matrix.end;
        continue;
      }
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      const close = ch === '(' ? ')' : ch === '[' ? ']' : '}';
      const group = readBalanced(source, i, ch, close);
      if (group) {
        const argument = latexGroups || (ch === '{' && /\\[A-Za-z]+\s*$/.test(source.slice(0,i)));
        out += (ch === '{' && !argument ? '\\{' : ch) + asciiMathToLatex(group.inner, latexGroups) + (ch === '{' && !argument ? '\\}' : close);
        i = group.end;
        continue;
      }
    }

    if (ch === '√') {
      let j = i + 1;
      while (source[j] === ' ') j++;
      if (source[j] === '(') {
        const group = readBalanced(source, j, '(', ')');
        if (group) {
          out += '\\sqrt{' + asciiMathToLatex(group.inner, latexGroups) + '}';
          i = group.end;
          continue;
        }
      }
      if (/[A-Za-z0-9\u0370-\u03FF]/.test(source[j] || '')) {
        out += '\\sqrt{' + asciiMathToLatex(source[j]) + '}';
        i = j + 1;
        continue;
      }
      out += '\\surd';
      i++;
      continue;
    }

    if (ch === '^' || ch === '_') {
      const operand = readScriptOperand(source, i + 1, ch === '_');
      if (operand) {
        out += (ch === '^' ? '^{' : '_{') + asciiMathToLatex(operand.value, true) + '}';
        i = operand.end;
      } else {
        out += ch;
        i++;
      }
      continue;
    }

    if (isIdentifierChar(ch)) {
      let end = i;
      while (end < source.length && isIdentifierChar(source[end])) end++;
      const word = source.slice(i, end);
      const lower = word.toLowerCase();
      if (NAMED_GREEK.has(word)) out += '\\' + word + ' ';
      else if (FUNCTIONS.has(lower)) {
        if (lower === 'sqrt') {
          let at = end;
          while (source[at] === ' ') at++;
          const group = readBalanced(source, at, '(', ')');
          if (group) {
            out += '\\sqrt{' + asciiMathToLatex(group.inner, latexGroups) + '}';
            i = group.end;
            continue;
          }
          out += '\\sqrt';
        }
        else if (lower === 'cosec' || lower === 'csc') out += '\\csc';
        else if (lower === 'conjugate') {
          let at = end;
          while (source[at] === ' ') at++;
          const group = readBalanced(source, at, '(', ')');
          if (group) {
            out += '\\overline{' + asciiMathToLatex(group.inner, latexGroups) + '}';
            i = group.end;
            continue;
          }
          out += '\\operatorname{conjugate}';
        }
        else out += '\\' + lower;
      } else {
        out += word;
      }
      i = end;
      continue;
    }

    if (SYMBOLS[ch]) {
      out += SYMBOLS[ch];
      if (/[A-Za-z]$/.test(SYMBOLS[ch]) && isIdentifierChar(source[i + 1] || '')) out += ' ';
      i++;
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

function scanMathCandidate(line: string, start: number): number | null {
  let i = start;
  let depth = 0;
  let lastTokenEnd = start;
  let hasIdentifier = false;

  while (i < line.length) {
    const ch = line[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '$' || ch === '`') break;
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      i++;
      lastTokenEnd = i;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break;
      depth--;
      i++;
      lastTokenEnd = i;
      continue;
    }
    if (ch === ',' || ch === ';' || ch === ':' || ch === '.') {
      if (!depth || ch === '.') break;
      i++; lastTokenEnd = i; continue;
    }
    if (ch === '{' || ch === '}') {
      i++;
      lastTokenEnd = i;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let end = i;
      while (/[0-9.]/.test(line[end] || '')) end++;
      i = end;
      lastTokenEnd = i;
      continue;
    }
    if (isIdentifierChar(ch)) {
      let end = i;
      while (end < line.length && isIdentifierChar(line[end])) end++;
      const word = line.slice(i, end);
      const lower = word.toLowerCase();
      const baseWord = word.replace(/[\u2070-\u209F\u00B2\u00B3\u00B9]/g, '');
      if (FUNCTIONS.has(lower) || NAMED_GREEK.has(word) || baseWord.length === 1) {
        hasIdentifier = true;
        i = end;
        lastTokenEnd = i;
        continue;
      }
      if (baseWord.length === 2 && !PROSE_WORDS.has(lower)) {
        hasIdentifier = true;
        i = end;
        lastTokenEnd = i;
        continue;
      }
      if (/^[A-Z]{2,3}$/.test(word)) {
        hasIdentifier = true;
        i = end;
        lastTokenEnd = i;
        continue;
      }
      break;
    }
    if (/[\^_=≠≤≥±·×÷√↔→|<>+\-*/∞∪∩∈∉⊂⊆⊃⊇∅]/.test(ch)) {
      i++;
      lastTokenEnd = i;
      continue;
    }
    break;
  }

  if (depth !== 0) return null;
  const body = line.slice(start, lastTokenEnd);
  if (/[\^_]\s*$/.test(body)) return null;
  if ((!hasIdentifier && !/\d\s*\/\s*\d|\[\[/.test(body)) || !/[A-Za-z0-9\u0370-\u03FF]/.test(body)) return null;
  const operandCount = (body.match(/[A-Za-z0-9\u0370-\u03FF]+/g) || []).length;
  const structural = /[\^_√|\u0304\u033f]|\[\[|(?:sqrt|sin|cos|tan|sec|cosec|csc|cot|log|ln)\b|conjugate\s*\(/i.test(body)
    || /(?:alpha|beta|gamma|delta|theta|phi|pi|sigma|omega)\b/.test(body);
  if (operandCount < 2 && !structural) return null;
  if (!STRONG_MARKER.test(body) && !/[+\-]/.test(body) && !structural) return null;
  return lastTokenEnd;
}

function findMathCandidates(line: string): Array<{ start: number; end: number; latex: string }> {
  const candidates: Array<{ start: number; end: number; latex: string }> = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '$') {
      const close = line.indexOf('$', i + 1);
      if (close === -1) {
        i++;
        continue;
      }
      i = close + 1;
      continue;
    }
    if (line[i] === '`') {
      const close = line.indexOf('`', i + 1);
      i = close === -1 ? i + 1 : close + 1;
      continue;
    }
    if (i > 0 && (isIdentifierChar(line[i - 1]) || /[0-9]/.test(line[i - 1]))) {
      i++;
      continue;
    }

    const end = scanMathCandidate(line, i);
    if (end === null) {
      i++;
      continue;
    }

    let start = i;
    while (start < end && /\s/.test(line[start])) start++;
    let realEnd = end;
    while (realEnd > start && /\s/.test(line[realEnd - 1])) realEnd--;
    while (realEnd > start && /[.,;:]/.test(line[realEnd - 1])) realEnd--;

    if (realEnd > start) {
      const span = line.slice(start, realEnd);
      candidates.push({ start, end: realEnd, latex: asciiMathToLatex(span) });
    }
    i = end;
  }

  return candidates;
}

export function formatSyllabusMath(text: string): string {
  if (!text || !/[0-9A-Za-z]/.test(text)) return text;
  return text.replace(/\bwhere I is\b/g, 'where $I$ is').split('\n').map((line) => {
    const candidates = findMathCandidates(line);
    if (!candidates.length) return line;
    let out = '';
    let last = 0;
    for (const candidate of candidates) {
      out += line.slice(last, candidate.start);
      out += '$' + candidate.latex.trim() + '$';
      last = candidate.end;
    }
    out += line.slice(last);
    return out;
  }).join('\n');
}



export function repairMathEscapes(text: string): string {
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part,i) => i % 2 ? part : part
    .replace(/\u000c(?=rac\b)/g, '\\f')
    .replace(/\u0008(?=egin\b|ar\b|eta\b)/g, '\\b')
    .replace(/\u0007(?=ngle\b|lpha\b)/g, '\\a')
    .replace(/\u0009(?=imes\b|ext\{|heta\b)/g, '\\t')
    .replace(/\u000d(?=ight\b|ightarrow\b|ho\b)/g, '\\r')
  ).join('');
}

/** Shared display formatting: source text and assessment values are never edited. */
export function formatEducationalMath(text: string): string {
  // Code, explicit equations, links, e-mail addresses, paths and dates are opaque.
  const protectedSpans = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|```[\s\S]*?```|`[^`\n]*`|https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]+|[A-Za-z]:\\[^\s]+|\b\d{1,4}\/\d{1,2}\/\d{2,4}\b|\b(?:19|20)\d{2}\/\d{2,4}\b)/g;
  return repairMathEscapes(text).split(protectedSpans).map((part, i) => {
    if (i % 2) return part;
    part = part.replace(/\b(m\s*\/\s*s|kg\s*\/\s*m)([23])\b|(\d\s+m)([23])\b/g, (_, compound, power, length, lengthPower) =>
      (compound ?? length) + ((power ?? lengthPower) === '2' ? '²' : '³'));
    if (/[₀-₉⁰-⁹⁺⁻]/.test(part) && !/[\/^_√\u0304\u033f]/.test(part)) return part;
    return formatSyllabusMath(part);
  }).join('');
}

/** Existing LaTeX remains intact; only the affected notation needs conversion. */
export function formatExplicitMath(expression: string): string {
  const restored = repairMathEscapes(expression)
    .replace(/\\'(?=$|[\s\\',;)=])/g, "'")
    .replace(/\\overarc\{([^{}]+)\}/g, '\\overset{\\frown}{$1}')
    .replace(/\\text\{\s*\\mu\s*([A-Za-z]+)\}/g, '\\mu\\,\\mathrm{$1}')
    .replace(/_{2,}/g, blank => '\\text{' + blank.replace(/_/g, '\\_') + '}');
  return /\/|\u0304|\u033f|conjugate\s*\(|\[\[|[·×÷]|\^\s*\(|(?<![\\A-Za-z])(?:sqrt|alpha|beta|gamma|delta|theta|phi|pi|sigma|omega)\b/.test(restored)
    ? asciiMathToLatex(restored, true) : restored;
}
