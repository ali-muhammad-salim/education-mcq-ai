/**
 * Computed-style fingerprint of the protected Digital Paper view.
 *
 * Playwright screenshots are written to the MCP server's own filesystem and are
 * not reachable from the repo, so computed styles are the durable baseline. They
 * are also stricter than pixel diffs for the failure mode we care about: global
 * CSS or token changes leaking into the Digital Paper.
 *
 * Run verbatim via browser_evaluate on /past-papers/PHY-IX-2024-P1 at 1440x900,
 * once per color scheme, and diff the result against digital-paper-baseline.json.
 */
const probe = () => {
  const pick = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className || '',
      font: s.fontFamily,
      size: s.fontSize,
      weight: s.fontWeight,
      lineHeight: s.lineHeight,
      color: s.color,
      background: s.backgroundColor,
      border: s.border,
      radius: s.borderRadius,
      padding: s.padding,
      margin: s.margin,
      box: [Math.round(r.width), Math.round(r.height)],
      at: [Math.round(r.x), Math.round(r.y + window.scrollY)],
    };
  };

  const sheets = Array.from(document.querySelectorAll('div')).filter((d) =>
    getComputedStyle(d).fontFamily.includes('Times')
  );

  return {
    theme: document.documentElement.dataset.theme || null,
    htmlClass: document.documentElement.className,
    doc: {
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
    },
    body: pick(document.body),
    main: pick(document.querySelector('main.main-content')),
    h1: pick(document.querySelector('h1')),
    pageWrapper: pick(document.querySelector('[class*="module__"][class*="page"]')),
    moduleButtons: Array.from(document.querySelectorAll('a[class*="module__"][class*="button"]')).map(pick),
    inlineButtons: Array.from(document.querySelectorAll('button')).slice(0, 8).map(pick),
    paperSheets: sheets.slice(0, 2).map(pick),
    textFingerprint: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 600),
  };
};
