import type { HsscQuizQuestion } from '@/lib/hsscMcqsData';

const image = (name: string, description: string) => `![${description}](/paper-crops/BIO-XI-STUDY/${name}.png)`;

type Mcq = {
  id: string; page: number; slo: string; stem: string; options: string[]; answers: string[]; explanation: string; year?: number;
};
type Written = {
  id: string; page: number; slo: string; stem: string; answer: string; year?: number; marks?: number; extended?: boolean;
};

const mcq = (
  id: string, page: number, slo: string, stem: string, options: string[], answer: string, explanation: string, year?: number,
): Mcq => ({ id, page, slo, stem, options, answers: [...answer], explanation, year });

const written = (
  id: string, page: number, slo: string, stem: string, answer: string, year?: number, marks?: number, extended?: boolean,
): Written => ({ id, page, slo, stem, answer, year, marks, extended });

const annual = (year: number, part: 1 | 2, page: number, ...numbers: string[]) => numbers.map(number => ({
  page, label: `${year} Paper ${part === 1 ? 'I' : 'II'} · Q${number}`,
  href: `/past-papers/BIO-XI-${year}-P${part}#question-${number.replace(/[ab]$/, part === 2 && Number.parseInt(number, 10) < 10 ? '' : '$&')}`,
}));

export const hsscBiologyStudyResources = [
  {
    slug: 'kingdom-protista', title: 'Kingdom Protista', unit: 6, pages: 32,
    topics: 'Protist diversity, photosynthetic protists, slime molds and water molds.',
    references: [],
    mcqs: [
      mcq('practice-1', 6, '6.2.2', 'Why are protists described as a polyphyletic group?', ['They form one exclusive evolutionary lineage.', 'They represent several evolutionary lineages.', 'They all share one form of locomotion.', 'They are all unicellular.'], 'B', 'The traditional grouping brings together organisms from several evolutionary lineages.'),
      mcq('practice-2', 12, '6.4.1', 'Which structure helps Euglena detect the direction of light?', ['Pellicle', 'Contractile vacuole', 'Eyespot', 'Nucleus'], 'C', 'The eyespot and associated photoreceptor help Euglena orient to light.'),
      mcq('practice-3', 13, '6.4.1', 'Interlocking cellulose plates are characteristic of which group?', ['Diatoms', 'Dinoflagellates', 'Brown algae', 'Red algae'], 'B', 'Many dinoflagellates have cellulose plates. Diatom shells contain silica.'),
      mcq('practice-4', 20, '6.4.2', 'What role do photosynthetic protists play at the base of an aquatic food web?', ['Primary producers', 'Primary consumers', 'Detritivores', 'Parasites'], 'A', 'They convert light energy into organic matter that supports consumers.'),
      mcq('practice-5', 25, '6.5.2', 'The spreading, multinucleate feeding stage of a plasmodial slime mold is called a', ['zoospore.', 'frustule.', 'plasmodium.', 'pellicle.'], 'C', 'A plasmodium is a multinucleate mass of cytoplasm.'),
      mcq('practice-6', 31, '6.5.5', 'Which organism causes late blight of potato?', ['Physarum polycephalum', 'Ulva', 'Chlorella', 'Phytophthora infestans'], 'D', 'Phytophthora infestans is an oomycete that causes potato late blight.'),
    ],
    written: [
      written('practice-7', 14, '6.4.1', 'Describe the structure and composition of a diatom’s shell.', 'The silica shell, or frustule, consists of two overlapping halves.'),
      written('practice-8', 20, '6.4.2', 'Explain why a dense algal bloom can lower dissolved oxygen in water.', 'As bloom organisms die, decomposers break down the organic matter and consume dissolved oxygen during respiration.'),
      written('practice-9', 32, '6.5.4', 'Give one feature shared by oomycetes and true fungi and one difference between them.', 'Both can form hyphae and obtain nutrients by absorption. Oomycete walls generally contain cellulose and glucans, while true fungal walls generally contain chitin and glucans.'),
    ],
  },
  {
    slug: 'animal-like-protists', title: 'Animal-Like Protists', author: 'Sharmeen Rahim', unit: 6, pages: 29,
    topics: 'Protoctist diversity, groups of protozoa, their ecological roles, and past-paper examples.',
    references: [
      ...annual(2024, 1, 18, '25', '26'), ...annual(2023, 1, 19, '25', '26'),
      ...annual(2022, 1, 20, '15', '16'), ...annual(2021, 1, 21, '15', '16'), ...annual(2021, 1, 22, '17'),
      ...annual(2018, 1, 23, '13', '14'), ...annual(2017, 1, 24, '15'),
      ...annual(2017, 2, 25, '4a'), ...annual(2017, 2, 26, '4b'), ...annual(2023, 1, 27, '26'),
    ],
    mcqs: [
      mcq('2016-14', 27, '6.4.1', 'The body of algae is called a thallus. What does this mean?', ['They show a notable range of growth forms.', 'They strictly survive in damp or wet environments.', 'They possess a variety of photosynthetic pigments.', 'Their body is not differentiated into roots and stems.'], 'D', 'A thallus lacks distinct true roots, stems and leaves.', 2016),
      mcq('2016-16', 27, '', 'A eukaryotic organism is described as multinucleate, with a cellulose cell wall and a plasmodium as its feeding stage. Where should it be placed?', ['True fungi', 'Oomycetes', 'Myxomycetes', 'Apicomplexans'], '', 'The given traits conflict. A plasmodium points to a plasmodial slime mold, whose feeding stage lacks a cell wall. This item has no scored answer.', 2016),
    ],
    written: [
      written('2016-4', 28, '6.2.1', 'Describe four features in which protists have diversified over their evolutionary history.', 'Examples include modes of locomotion (cilia, flagella or pseudopodia), modes of nutrition (including mixotrophy), cell coverings or shells, and the acquisition of photosynthesis in different lineages.', 2016, 4),
    ],
  },
  {
    slug: 'kingdom-animalia', title: 'Kingdom Animalia', author: 'Sharmeen Rahim', unit: 9, pages: 99,
    topics: 'Animal body plans, invertebrate phyla, chordates, vertebrate classes, and past-paper practice.',
    references: [
      ...annual(2024, 1, 58, '16'), ...annual(2024, 1, 59, '17', '18'), ...annual(2024, 1, 60, '19'), ...annual(2024, 2, 61, '4'),
      ...annual(2023, 1, 62, '16', '17'), ...annual(2023, 1, 63, '18', '19'), ...annual(2023, 2, 64, '4'),
      ...annual(2022, 1, 65, '5', '6'), ...annual(2022, 1, 66, '7'), ...annual(2022, 1, 67, '8'), ...annual(2022, 1, 68, '9', '10'), ...annual(2022, 1, 69, '11', '12'),
      ...annual(2021, 1, 70, '7'), ...annual(2021, 1, 71, '8', '9', '10'), ...annual(2021, 1, 72, '11', '12'),
      ...annual(2019, 1, 73, '20', '21'), ...annual(2019, 1, 74, '22', '23'), ...annual(2019, 2, 75, '10b'),
      ...annual(2018, 1, 76, '19'), ...annual(2018, 2, 77, '11a'), ...annual(2017, 1, 78, '20'),
      { page: 85, label: 'Class XI Model Paper I · Q30', href: '/akueb/XI/biology/model-papers/paper-i#question-30' },
    ],
    mcqs: [
      mcq('2016-21', 80, '9.4.3', 'How do cephalochordates differ from urochordates?', ['A tunic encloses their notochord.', 'Their notochord develops into a vertebral column.', 'Their notochord and dorsal nerve cord persist throughout life.', 'They retain a notochord and nerve cord only in the larval stage.'], 'C', 'Lancelets retain both chordate features as adults.', 2016),
      mcq('2016-22', 80, '9.2.1', 'In which group is the type of symmetry shown in the diagram found?\n\n' + image('radial', 'Planes through the centre of a circle'), ['Annelids', 'Molluscs', 'Arthropods', 'Coelenterates'], 'D', 'The diagram represents radial symmetry, characteristic of cnidarians.', 2016),
      mcq('2015-20', 85, '9.3.5', [
        'Which row correctly compares the three annelid classes?',
        '',
        '| Option | Characteristic | Polychaeta | Oligochaeta | Hirudinea |',
        '| --- | --- | --- | --- | --- |',
        '| A | Distinct head | Absent | Absent | Present |',
        '| B | Larvae | Absent | Absent | Present |',
        '| C | Locomotory organs | Present | Absent | Absent |',
        '| D | Hermaphroditism | Absent | Present | Present |',
      ].join('\n'), ['Row A', 'Row B', 'Row C', 'Row D'], 'D', 'Typical polychaetes have separate sexes. Earthworms and leeches are hermaphroditic.', 2015),
      mcq('2014-19', 87, '9.3.3', 'Which is an exception to the adaptations for parasitism in acoelomate flatworms?', ['Well-developed suckers and hooks', 'Absence of an epidermal layer', 'Degeneration of the muscular system', 'Complex digestive system'], 'D', 'Parasitic flatworms typically have a reduced gut, and tapeworms lack a digestive tract.', 2014),
      mcq('2014-20', 87, '9.5.6', 'Which feature limits the success of typical amphibians on land?', ['Glands in the skin instead of scales', 'Lungs in place of adult gills', 'External fertilisation instead of internal fertilisation', 'Limbs in place of fins'], 'C', 'In many amphibians, external fertilisation and early development depend on water.', 2014),
      mcq('2013-19', 89, '9.3.10', 'A triploblastic, bilaterally symmetrical, unsegmented animal has a mantle. To which phylum does it belong?', ['Echinodermata', 'Arthropoda', 'Mollusca', 'Annelida'], 'C', 'A mantle is characteristic of molluscs.', 2013),
      mcq('2012-19', 91, '9.3.6', 'Which group consists entirely of arthropods?', ['Annelids, insects and myriapods', 'Arachnids, crustaceans and myriapods', 'Crustaceans, insects and molluscs', 'Insects, myriapods and nematodes'], 'B', 'Arachnids, crustaceans and myriapods all belong to Arthropoda.', 2012),
      mcq('2012-20', 91, '4.2.1', 'The organisms shown are classified in the same\n\n' + image('phyla', 'Four animals from different phyla'), ['genus.', 'species.', 'phylum.', 'kingdom.'], 'D', 'They all belong to Kingdom Animalia.', 2012),
      mcq('2012-21', 92, '9.2.1', 'Which of the illustrated animals does not possess a true coelom?', ['Planarian', 'Roundworm', 'Octopus', 'Sea star'].map((name, i) => image('coelom-' + 'abcd'[i], name)), 'AB', 'A is acoelomate. B has a pseudocoelom, a cavity not fully lined by mesoderm. Both lack a true coelom.', 2012),
      mcq('2011-20', 94, '9.3.6', 'The paper describes a segmented arthropod with a haemocoel and four pairs of jointed walking legs. Which group is intended?', ['Myriapoda', 'Arachnida', 'Crustacea', 'Insecta'], 'B', 'Four pairs of walking legs identify the intended arachnid group. The original stem’s reference to compound eyes is misleading for typical arachnids.', 2011),
      mcq('2011-21', 94, '9.5.6', 'Which process typically requires water in amphibians with external reproduction?', ['Nutrition', 'Excretion', 'Respiration', 'Fertilisation'], 'D', 'Water allows externally released gametes to meet. The original wording overgeneralises across amphibians.', 2011),
      mcq('2010-20', 96, '9.2.1', 'What is an animal whose body develops from two germinal layers called?', ['Coelomate', 'Diploblastic', 'Acoelomate', 'Triploblastic'], 'B', 'Diploblastic animals develop from ectoderm and endoderm.', 2010),
      mcq('2010-21', 96, '9.2.1', 'Which of the illustrated animals is radially symmetrical?', ['Flatworm', 'Crab', 'Segmented worm', 'Hydra'].map((name, i) => image('symmetry-' + 'abcd'[i], name)), 'D', 'Hydra has radial symmetry around its oral–aboral axis.', 2010),
      mcq('2009-21', 98, '9.3.1', 'In sponges, water enters through pores called', ['oscula.', 'oral suckers.', 'ventral suckers.', 'ostia.'], 'D', 'Water enters through ostia and leaves through an osculum.', 2009),
    ],
    written: [
      written('2017-6b', 79, '9.3.2', 'In which body form does the illustrated radially symmetrical invertebrate exist?\n\n![Sea anemone](/paper-crops/BIO-XI-2017-P2/question-6.png)', 'Polyp. It has a cylindrical, attached body with an upward-facing mouth surrounded by tentacles.', 2017, 1),
      written('2016-sponges', 81, '9.3.1', 'State one use of sponges.', 'Some natural bath sponges are used for washing and cleaning.', 2016, 1),
      written('2016-body-cavities', 82, '9.2.1', 'Draw cross-sections of an acoelomate, pseudocoelomate and coelomate, showing the structural differences.', 'Show no body cavity in the acoelomate, a cavity only partly lined by mesoderm in the pseudocoelomate, and a cavity fully lined by mesoderm in the coelomate.', 2016),
      written('2016-echinoderms', 82, '9.3.11', 'Describe five features that distinguish echinoderms from other invertebrates.', 'Examples include a water vascular system, tube feet, a calcareous endoskeleton, typically five-part adult radial symmetry, and bilaterally symmetrical larvae.', 2016, undefined, true),
      written('2015-6', 86, '9.3.3', 'Name the definitive and intermediate hosts of the illustrated tapeworm and give three adaptations for parasitism.\n\n' + image('tapeworm', 'Segmented tapeworm with scolex'), 'Humans are the definitive host. Pigs are the intermediate host of the pork tapeworm, while cattle serve that role for the beef tapeworm. Adaptations include attachment suckers (and hooks in the pork tapeworm), nutrient absorption through the tegument, and high reproductive output.', 2015, 5, true),
      written('2014-polymorphism', 88, '9.3.2', 'Give an account of polymorphism in coelenterates.', 'Different forms can occur within the same species. For example, a cnidarian may have a typically sessile polyp and a swimming medusa, or a colony may have specialised zooids.', 2014, 2),
      written('2013-platypus', 90, '9.5.13', 'To which mammalian subclass does the duck-billed platypus belong? Name traits it shares with reptiles and with other mammals.', 'The platypus is a monotreme (Prototheria). It lays eggs and has a cloaca. Mammalian traits include fur and milk production.', 2013, 3),
      written('2012-pseudocoelom', 93, '9.2.1', 'Give two reasons why a nematode pseudocoelom is not homologous to a true coelom.', 'It develops from the embryonic blastocoel and is not completely lined by mesoderm. A true coelom develops within mesoderm and is fully lined by it.', 2012, 2),
      written('2011-scorpion', 95, '9.3.6', 'Give three features of the illustrated scorpion that distinguish it from other arthropods.\n\n' + image('scorpion', 'Scorpion with pincers and a curved tail'), 'Scorpions have enlarged pincer-bearing pedipalps, paired comb-like sensory organs called pectines on the underside, and a segmented tail that ends in a venomous sting.', 2011, 3),
      written('2010-7', 97, '9.3.2', 'For the pictured animal, give the number of germinal layers, symmetry, mode of feeding, defence and another organism in its phylum.\n\n' + image('jellyfish', 'Jellyfish in medusa form'), 'Two germinal layers, radial symmetry, carnivorous feeding, stinging nematocysts, and Hydra as another cnidarian.', 2010, 5, true),
      written('2009-birds', 98, '9.5.10', 'Describe bird characteristics with particular emphasis on flight adaptations.', 'Examples include wings and flight feathers for lift, a streamlined body, a light skeleton, a keeled sternum and strong flight muscles in many flying birds, and an efficient respiratory system with air sacs.', 2009, 5, true),
    ],
  },
].map(resource => ({
  ...resource,
  href: '/resources/biology-xi-' + resource.slug,
  pdf: '/materials/hssc/biology/study-resources/' + resource.slug + '.pdf',
}));

export function biologyStudyResourceQuiz(resource: (typeof hsscBiologyStudyResources)[number]): HsscQuizQuestion[] {
  return resource.mcqs.filter(question => question.answers.length > 0).map(question => ({
    id: `${resource.slug}-${question.id}`, questionNumber: question.id, questionText: question.stem,
    questionType: 'MULTIPLE_CHOICE', marks: 1,
    diagramBased: [question.stem, ...question.options].some(text => text.includes('![')),
    sourceRegion: {
      choices: Object.fromEntries(question.options.map((choice, index) => ['ABCD'[index], choice])),
      current_slo: question.slo, correct_answer: question.answers[0], explanation: question.explanation,
      accepted_options: question.answers, score_accepted_options: question.answers.length > 1,
    },
  }));
}
