/**
 * Browser-safe Smart Search Engine:
 * - Domain synonym & concept expansion (Physics, Chemistry, Biology, Math, CS)
 * - Word-stem normalization
 * - Typo-tolerant Damerau-Levenshtein edit distance & character 3-gram similarity
 * - Multi-word out-of-order token matching
 *
 * Keep database and Node-only imports out of this module so client components
 * can import it directly.
 */

export const CONCEPT_SYNONYM_GROUPS: string[][] = [
  ['voltage', 'potential difference', 'electromotive force', 'emf', 'e.m.f', 'volt', 'volts'],
  ['current', 'ampere', 'amperes', 'electric current', 'conventional current', 'charge flow'],
  ['resistance', 'resistor', 'resistors', 'resistivity', 'ohm', 'ohmic', 'non-ohmic'],
  ['capacitor', 'capacitors', 'capacitance', 'farad', 'microfarad', 'dielectric'],
  ['torque', 'moment', 'moments', 'turning effect', 'couple', 'moment arm', 'pivot', 'fulcrum'],
  ['buoyancy', 'buoyant', 'upthrust', 'archimedes', 'float', 'floating', 'sink', 'immersed'],
  ['heat', 'thermal', 'temperature', 'celsius', 'kelvin', 'fahrenheit', 'thermometer', 'internal energy'],
  ['conduction', 'convection', 'radiation', 'conductor', 'insulator', 'emitter', 'absorber', 'greenhouse', 'thermos', 'vacuum flask'],
  ['melting', 'fusion', 'boiling', 'vaporisation', 'vaporization', 'evaporation', 'latent heat', 'steam', 'ice', 'phase change'],
  ['kinematics', 'motion', 'velocity', 'speed', 'acceleration', 'deceleration', 'retardation', 'displacement', 'distance', 'rest'],
  ['gravity', 'gravitational', 'free fall', 'free-fall', 'freely falling', 'weight', 'mass', 'g = 9.8', 'satellite', 'orbit'],
  ['dynamics', 'newton', 'inertia', 'momentum', 'impulse', 'force', 'forces', 'friction', 'sliding', 'rolling', 'centripetal', 'circular motion'],
  ['equilibrium', 'stability', 'stable', 'unstable', 'neutral', 'centre of gravity', 'center of gravity', 'centre of mass', 'plumbline'],
  ['elasticity', 'hooke', 'hook', 'spring', 'helical spring', 'extension', 'deformation', 'proportionality', 'elastic limit'],
  ['work', 'energy', 'kinetic', 'potential', 'power', 'watt', 'joule', 'efficiency', 'renewable', 'non-renewable', 'solar', 'hydroelectric'],
  ['pressure', 'pascal', 'barometer', 'atmospheric', 'hydraulic', 'density', 'depth', 'liquid pressure', 'hydrostatic', 'dam'],
  ['measurement', 'measurements', 'vernier', 'callipers', 'calipers', 'caliper', 'calliper', 'screw gauge', 'micrometer', 'significant figures', 'scientific notation', 'prefixes', 'scalar', 'vector', 'error', 'accuracy', 'precision', 'si units', 'base quantities', 'derived quantities'],
  ['wave', 'waves', 'oscillation', 'oscillatory', 'shm', 'simple harmonic', 'pendulum', 'transverse', 'longitudinal', 'wavelength', 'frequency', 'time period', 'amplitude', 'ripple tank', 'diffraction', 'wavefront'],
  ['sound', 'echo', 'ultrasound', 'ultrasonic', 'infrasound', 'audible', 'pitch', 'loudness', 'timbre', 'quality', 'intensity', 'decibel', 'noise', 'acoustic', 'compression', 'rarefaction'],
  ['optics', 'optical', 'light', 'reflection', 'refraction', 'snell', 'refractive index', 'total internal reflection', 'critical angle', 'optical fibre', 'optical fiber', 'endoscope', 'prism', 'dispersion', 'rainbow', 'lens', 'lenses', 'mirror', 'mirrors', 'concave', 'convex', 'converging', 'diverging', 'focal length', 'magnifying glass', 'microscope', 'myopia', 'short-sightedness', 'near-sightedness', 'hypermetropia', 'long-sightedness', 'far-sightedness', 'human eye', 'retina'],
  ['electrostatics', 'electrostatic', 'static electricity', 'charge', 'charges', 'coulomb', 'electroscope', 'gold-leaf', 'electric field', 'lightning', 'earthing'],
  ['circuit', 'circuits', 'series', 'parallel', 'dc', 'd.c', 'ac', 'a.c', 'alternating current', 'direct current', 'kilowatt', 'kwh', 'joule law', 'fuse', 'circuit breaker', 'thermistor', 'ldr', 'rheostat', 'potential divider', 'galvanometer', 'ammeter', 'voltmeter'],
  ['magnetism', 'magnetic', 'magnet', 'electromagnet', 'electromagnetism', 'solenoid', 'domain', 'fleming', 'left-hand rule', 'right-hand rule', 'dc motor', 'd.c. motor', 'armature', 'commutator'],
  ['induction', 'electromagnetic induction', 'faraday', 'lenz', 'induced emf', 'ac generator', 'a.c. generator', 'alternator', 'mutual induction', 'self induction', 'transformer', 'step-up', 'step-down', 'high voltage transmission'],
  ['electronics', 'thermionic', 'electron gun', 'cathode ray', 'cro', 'oscilloscope', 'analogue', 'analog', 'digital', 'logic gate', 'logic gates', 'truth table', 'and gate', 'or gate', 'not gate', 'nand', 'nor', 'semiconductor'],
  ['nuclear', 'atomic', 'atom', 'nucleus', 'nucleon', 'proton', 'neutron', 'isotope', 'isotopes', 'radioactivity', 'radioactive', 'alpha', 'beta', 'gamma', 'half-life', 'half life', 'fission', 'fusion', 'background radiation', 'rutherford'],
];

export function normalizeSearchText(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/[\u2010-\u2015-]/g, ' ')
    .replace(/[^a-z0-9.+/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('tion') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('ment') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;

  const dp: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
      if (dp[i][j] < rowMin) rowMin = dp[i][j];
    }
    if (rowMin > maxDist) return maxDist + 1;
  }
  return dp[la][lb];
}

export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  const gramsA = new Set<string>();
  const gramsB = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) gramsA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) gramsB.add(b.slice(i, i + 3));
  let intersection = 0;
  for (const g of gramsA) {
    if (gramsB.has(g)) intersection++;
  }
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

export function getSynonymsForTokenOrPhrase(queryNorm: string, token: string): string[] {
  const tokenStem = stemWord(token);
  const out = new Set<string>();
  for (const group of CONCEPT_SYNONYM_GROUPS) {
    const matched = group.some((item) => {
      const itemNorm = normalizeSearchText(item);
      if (itemNorm === token || itemNorm === queryNorm) return true;
      if (stemWord(itemNorm) === tokenStem) return true;
      if (token.length >= 5 && !itemNorm.includes(' ') && editDistance(token, itemNorm, token.length >= 7 ? 2 : 1) <= (token.length >= 7 ? 2 : 1)) {
        return true;
      }
      return false;
    });
    if (matched) {
      for (const syn of group) out.add(normalizeSearchText(syn));
    }
  }
  return [...out];
}

export function expandQueryWithSynonyms(query: string): string[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  const tokens = norm.split(' ').filter(t => t.length >= 2);
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    for (const syn of getSynonymsForTokenOrPhrase(norm, token)) {
      expanded.add(syn);
    }
  }
  return [...expanded].slice(0, 24);
}

/**
 * Computes a relevance score in [0, 1] between a candidate text (or list of fields)
 * and a user query. Handles:
 * 1. Exact SLO code or substring match (1.0)
 * 2. Multi-word out-of-order token & stem matching (0.85 - 0.95)
 * 3. Domain synonym & concept matching (0.80)
 * 4. Typo-tolerant Damerau-Levenshtein & trigram matching (0.70 - 0.78)
 */
export function smartScore(targetText: string, rawQuery: string, codeField?: string): number {
  const qRaw = (rawQuery || '').trim().toLowerCase();
  if (!qRaw) return 1;

  const tRaw = (targetText || '').toLowerCase();
  const cRaw = (codeField || '').toLowerCase();

  // If the user typed a dotted SLO code like "1.2.2" or "13.1", keep strict code/substring matching
  if (/^\d+(\.\d+)+$/.test(qRaw)) {
    if (cRaw === qRaw) return 1.0;
    if (cRaw.startsWith(qRaw + '.') || tRaw.includes(qRaw)) return 0.95;
    return 0;
  }

  if (tRaw.includes(qRaw) || (cRaw && cRaw.includes(qRaw))) {
    return 1.0;
  }

  const qNorm = normalizeSearchText(qRaw);
  const tNorm = normalizeSearchText(tRaw + ' ' + cRaw);
  if (!qNorm) return 1;
  if (tNorm.includes(qNorm)) return 0.98;

  // Check whole-phrase synonym match first (e.g., "potential difference" <-> "voltage")
  for (const group of CONCEPT_SYNONYM_GROUPS) {
    const groupNorm = group.map(normalizeSearchText);
    if (groupNorm.some(g => g === qNorm || (qNorm.length >= 5 && editDistance(qNorm, g, 2) <= 2))) {
      if (groupNorm.some(g => tNorm.includes(g))) {
        return 0.85;
      }
    }
  }

  const qTokens = qNorm.split(' ').filter(Boolean);
  const tTokens = tNorm.split(' ').filter(Boolean);
  if (!qTokens.length || !tTokens.length) return 0;

  const tStems = tTokens.map(stemWord);
  let totalScore = 0;

  for (const qt of qTokens) {
    let bestTokenScore = 0;
    const qStem = stemWord(qt);

    // 1. Direct substring or prefix in target
    if (tNorm.includes(qt)) {
      bestTokenScore = 0.95;
    } else if (tStems.some(ts => ts === qStem || (qStem.length >= 4 && ts.startsWith(qStem)))) {
      // 2. Stem match
      bestTokenScore = 0.9;
    } else {
      // 3. Synonym match for this token
      const syns = getSynonymsForTokenOrPhrase(qNorm, qt);
      if (syns.some(syn => tNorm.includes(syn) || tStems.includes(stemWord(syn)))) {
        bestTokenScore = 0.82;
      }
    }

    // 4. Typo-tolerant fuzzy match against target tokens
    if (bestTokenScore === 0 && qt.length >= 4) {
      const allowedEdits = qt.length >= 7 ? 2 : 1;
      for (let i = 0; i < tTokens.length; i++) {
        const tt = tTokens[i];
        if (tt.length < 3) continue;
        const dist = editDistance(qt, tt, allowedEdits);
        if (dist <= allowedEdits) {
          bestTokenScore = Math.max(bestTokenScore, dist === 1 ? 0.78 : 0.72);
          break;
        }
        const stemDist = editDistance(qStem, tStems[i], allowedEdits);
        if (stemDist <= allowedEdits) {
          bestTokenScore = Math.max(bestTokenScore, 0.74);
          break;
        }
        if (qt.length >= 5 && tt.length >= 5) {
          const tri = trigramSimilarity(qt, tt);
          if (tri >= 0.55) {
            bestTokenScore = Math.max(bestTokenScore, 0.7);
          }
        }
      }
    }

    if (bestTokenScore === 0) {
      return 0;
    }
    totalScore += bestTokenScore;
  }

  return totalScore / qTokens.length;
}

export function smartMatch(targetText: string, rawQuery: string, codeField?: string, minScore = 0.68): boolean {
  return smartScore(targetText, rawQuery, codeField) >= minScore;
}
