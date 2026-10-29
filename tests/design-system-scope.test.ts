import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const designSystem = path.join(root, 'app', 'design-system.css');
const riseDir = path.join(root, 'components', 'rise');

const ALLOWED_PREFIXES = [
  '.rise-ui',
  '[data-rise]',
  ':where(.rise-ui)',
  ':where([data-rise])',
  'html.dark .rise-ui',
  'html.dark [data-rise]',
  ':root.dark .rise-ui',
  ':root.dark [data-rise]',
];

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function selectorsOf(css: string): string[] {
  const out: string[] = [];
  const blocks = stripComments(css).matchAll(/([^{}]+)\{/g);
  for (const match of blocks) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith('@')) continue;
    for (const selector of prelude.split(',')) {
      const trimmed = selector.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function moduleFiles(): string[] {
  if (!existsSync(riseDir)) return [];
  return readdirSync(riseDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => path.join(riseDir, f));
}

describe('design system scope gate', () => {
  it('every selector in design-system.css is scoped to the rise-ui zone', () => {
    const unscoped = selectorsOf(readFileSync(designSystem, 'utf8')).filter(
      (selector) => !ALLOWED_PREFIXES.some((prefix) => selector.startsWith(prefix))
    );
    expect(unscoped).toEqual([]);
  });

  it('no class name contains "card", which globals.css force-paints in dark mode', () => {
    const files = [designSystem, ...moduleFiles()];
    const offenders: string[] = [];
    for (const file of files) {
      const matches = stripComments(readFileSync(file, 'utf8')).matchAll(/\.([A-Za-z0-9_-]*card[A-Za-z0-9_-]*)/gi);
      for (const match of matches) offenders.push(`${path.basename(file)}: .${match[1]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('rise CSS modules never emit bare element selectors', () => {
    const offenders: string[] = [];
    for (const file of moduleFiles()) {
      for (const selector of selectorsOf(readFileSync(file, 'utf8'))) {
        if (!selector.includes('.')) offenders.push(`${path.basename(file)}: ${selector}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('rise modules are CSS modules so their class names stay hashed', () => {
    const plain = moduleFiles().filter((f) => !f.endsWith('.module.css'));
    expect(plain).toEqual([]);
  });
});
