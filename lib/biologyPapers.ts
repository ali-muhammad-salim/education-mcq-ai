import { biology2025Papers } from './biology2025';
import { biologyIx2026Papers } from './biologyIx2026';
import { biologyX2026Papers } from './classX2026Papers';
import { biologyIx2021Paper } from './biologyIx2021';
import { biologyIx2019 } from './biologyIx2019';
import { biologyIx2018 } from './biologyIx2018';
import { biologyIx2017 } from './biologyIx2017';
import { biology2023Papers } from './biology2023';
import { biologyX2024Papers } from './biologyX2024';
import { biologyX2019Papers } from './biologyX2019';
import { biologyX2018Papers } from './biologyX2018';
import { biologyX2017Papers } from './biologyX2017';
import { biologyX2021Papers } from './biologyX2021';
import manifest2025 from '@/data/biology/ssc1_2025_source_manifest.json';
import manifest2023 from '@/data/biology/ssc1_2023_source_manifest.json';
import manifestX2024 from '@/data/biology/ssc2_2024_source_manifest.json';
import manifestX2019 from '@/data/biology/ssc2_2019_source_manifest.json';
import manifestX2018 from '@/data/biology/ssc2_2018_source_manifest.json';
import manifestX2017 from '@/data/biology/ssc2_2017_source_manifest.json';
import manifestX2021 from '@/data/biology/ssc2_2021_source_manifest.json';

export {
  biology2025Papers,
  biology2023Papers,
  biologyX2024Papers,
  biologyX2019Papers,
  biologyX2018Papers,
  biologyX2017Papers,
  biologyX2021Papers,
  manifest2025,
  manifest2023,
  manifestX2024,
  manifestX2019,
  manifestX2018,
  manifestX2017,
  manifestX2021,
};

export const biologyIxAnnualArchives = [biologyIx2017, biologyIx2018, biologyIx2019];

export const reviewedBiologyPapers = [
  ...biologyIx2026Papers,
  ...biologyX2026Papers,
  biologyIx2021Paper,
  ...biologyIxAnnualArchives.flatMap(archive => archive.papers),
  ...biology2025Papers,
  ...biology2023Papers,
  ...biologyX2024Papers,
  ...biologyX2019Papers,
  ...biologyX2018Papers,
  ...biologyX2017Papers,
  ...biologyX2021Papers,
];

export const biologyPaperManifests: Record<
  number | string,
  {
    sources: {
      p1: typeof manifest2025.sources.p1;
      key: typeof manifest2025.sources.key;
      p2?: typeof manifest2025.sources.p2;
      em?: typeof manifest2025.sources.em;
    };
    crops: { url: string }[];
  }
> = {
  2025: manifest2025,
  2023: manifest2023 as any,
  '2024-x': manifestX2024 as any,
  '2021-x': manifestX2021 as any,
  '2019-x': manifestX2019 as any,
  '2018-x': manifestX2018 as any,
  '2017-x': manifestX2017 as any,
};

