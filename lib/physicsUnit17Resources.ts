const assetRoot = '/materials/ssc/physics/ssc-2';
const chapterHref = '/akueb/X/physics';
const mcqSlug = 'magnetism-and-electromagnetism';

export const physicsUnit17Resource = {
  unit: 17,
  title: 'Magnetism and Electromagnetism',
  href: '/resources/physics-x-unit-17-magnetism',
  chapterHref,
  mcqSlug,
  mcqsHref: `${chapterHref}/mcqs/chapter-wise/${mcqSlug}`,
  mcqSourceCode: 'PHY-X-UNIT-17-2-NOTES',
  topics: [
    { id: '17.2', title: 'Magnetic Fields and Flux', pdf: assetRoot + '/unit-17-2-magnetism.pdf', revisionPage: 8 },
    { id: '17.3', title: 'Magnetic Effect of Electric Current', pdf: assetRoot + '/unit-17-3-magnetism.pdf' },
    { id: '17.4', title: 'Magnetic Force on Conductors', pdf: assetRoot + '/unit-17-4-magnetism.pdf', revisionPage: 11 },
    { id: '17.5', title: 'D.C. Motors and Torque', pdf: assetRoot + '/unit-17-5-magnetism.pdf', revisionPage: 7 },
  ],
} as const;
