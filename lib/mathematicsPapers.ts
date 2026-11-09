import { mathematics2017Papers } from './mathematics2017';
import manifest2017 from '@/data/mathematics/ssc1_2017_source_manifest.json';
import { mathematics2018Papers } from './mathematics2018';
import manifest2018 from '@/data/mathematics/ssc1_2018_source_manifest.json';
import { mathematics2019Papers } from './mathematics2019';
import manifest2019 from '@/data/mathematics/ssc1_2019_source_manifest.json';
import { mathematics2021Papers } from './mathematics2021';
import manifest2021 from '@/data/mathematics/ssc1_2021_source_manifest.json';
import { mathematics2022Papers } from './mathematics2022';
import manifest2022 from '@/data/mathematics/ssc1_2022_source_manifest.json';
import { mathematics2023Papers } from './mathematics2023';
import { mathematics2024Papers } from './mathematics2024';
import { mathematics2025Papers } from './mathematics2025';
import { mathematicsX2017Papers } from './mathematicsX2017';
import { mathematicsX2018Papers } from './mathematicsX2018';
import { mathematicsX2019Papers } from './mathematicsX2019';
import { mathematicsX2021Papers } from './mathematicsX2021';
import { mathematicsX2022Papers } from './mathematicsX2022';
import { mathematicsX2023Papers } from './mathematicsX2023';
import { mathematicsX2024Papers } from './mathematicsX2024';
import { mathematicsX2025Papers } from './mathematicsX2025';
import manifest2023 from '@/data/mathematics/ssc1_2023_source_manifest.json';
import manifest2024 from '@/data/mathematics/ssc1_2024_source_manifest.json';
import manifest2025 from '@/data/mathematics/ssc1_2025_source_manifest.json';
import manifestX2017 from '@/data/mathematics/ssc2_2017_source_manifest.json';
import manifestX2018 from '@/data/mathematics/ssc2_2018_source_manifest.json';
import manifestX2019 from '@/data/mathematics/ssc2_2019_source_manifest.json';
import manifestX2021 from '@/data/mathematics/ssc2_2021_source_manifest.json';
import manifestX2022 from '@/data/mathematics/ssc2_2022_source_manifest.json';
import manifestX2023 from '@/data/mathematics/ssc2_2023_source_manifest.json';
import manifestX2024 from '@/data/mathematics/ssc2_2024_source_manifest.json';
import manifestX2025 from '@/data/mathematics/ssc2_2025_source_manifest.json';

export {
  mathematicsX2017Papers,
  manifestX2017,
  mathematicsX2018Papers,
  manifestX2018,
  mathematicsX2019Papers,
  manifestX2019,
  mathematicsX2021Papers,
  manifestX2021,
  mathematicsX2022Papers,
  manifestX2022,
  mathematicsX2023Papers,
  manifestX2023,
  mathematicsX2024Papers,
  manifestX2024,
  mathematicsX2025Papers,
  manifestX2025,
};

export const reviewedMathematicsPapers = [
  ...mathematics2017Papers,
  ...mathematics2018Papers,
  ...mathematics2019Papers,
  ...mathematics2021Papers,
  ...mathematics2022Papers,
  ...mathematics2023Papers,
  ...mathematics2024Papers,
  ...mathematics2025Papers,
  ...mathematicsX2017Papers,
  ...mathematicsX2018Papers,
  ...mathematicsX2019Papers,
  ...mathematicsX2021Papers,
  ...mathematicsX2022Papers,
  ...mathematicsX2023Papers,
  ...mathematicsX2024Papers,
  ...mathematicsX2025Papers,
];

export const mathematicsPaperManifests: Record<
  number,
  {
    sources: {
      p1: typeof manifest2023.sources.p1;
      key: typeof manifest2023.sources.key;
      p2?: typeof manifest2023.sources.p2;
      em?: typeof manifest2023.sources.em;
    };
    crops: { url: string }[];
  }
> = {
  2017: manifest2017,
  2018: manifest2018,
  2019: manifest2019,
  2021: manifest2021,
  2022: manifest2022,
  2023: manifest2023,
  2024: manifest2024,
  2025: manifest2025,
};
