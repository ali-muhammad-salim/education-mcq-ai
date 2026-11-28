import biologySyllabus from '@/data/biology/ssc_syllabus_2025.json';
import biologyMcqs from '@/data/biology/ssc2_2026_mcqs.json';
import computerScienceMcqs from '@/data/computer-science/ssc2_2026_mcqs.json';
import type { PaperData, QuestionData } from './paperDataService';
import { paperQuestionNumber } from './paperPresentation';

// Annual papers sometimes reuse the same item with different option order or code formatting.
const repeatedQuestions = [
  ['CS-X-2026-P1/12', 'CS-X-2024-P1/7', 'CS-X-2022-P1/9'],
  ['CS-X-2026-P1/13', 'CS-X-2023-P1/11'],
  ['CS-X-2026-P1/29', 'CS-X-2023-P1/27'],
  ['CS-X-2026-P1/30', 'CS-X-2022-P1/34'],
  ['CS-X-2026-P1/31', 'CS-X-2023-P1/29'],
  ['CS-X-2026-P1/38', 'CS-X-2024-P1/35'],
  ['CS-X-2026-P1/39', 'CS-X-2019-P1/2'],
  ['BIO-X-2026-P1/1', 'BIO-X-2023-P1/1'],
  ['BIO-X-2026-P1/10', 'BIO-X-2022-P1/7'],
];

const repeatedQuestionKeys = new Map(repeatedQuestions.flatMap(group => group.map(reference => [reference, group[0]] as const)));

export function classX2026DuplicateKey(paperCode: string | null, number: string) {
  return repeatedQuestionKeys.get(paperCode + '/' + paperQuestionNumber(number));
}

type WrittenQuestion = {
  number: string;
  page: number;
  marks: number;
  outcome: string | null;
  stem: string;
  answer: string;
  figure?: string;
};

const computerScienceWritten: WrittenQuestion[] = [
  {
    number: '1', page: 2, marks: 2, outcome: '2.3.2',
    stem: 'Give one example algorithm step for each flowchart symbol: decision (diamond) and input/output (parallelogram).',
    answer: '1. **Decision:** Is the score at least 50? This condition has a Yes branch and a No branch.\n2. **Input/output:** Read the score. Displaying the score is also a valid example.',
  },
  {
    number: '2', page: 2, marks: 3, outcome: '10.4.3',
    stem: 'An employee qualifies for a bonus after working at least 40 hours in one week. Write a C program using if–else that prints “Eligible for Bonus” when the condition is met and “Not Eligible” otherwise.',
    answer: '```c\n#include <stdio.h>\n\nint main(void) {\n    double hours;\n    if (scanf("%lf", &hours) != 1) return 1;\n    if (hours >= 40) {\n        puts("Eligible for Bonus");\n    } else {\n        puts("Not Eligible");\n    }\n    return 0;\n}\n```',
  },
  {
    number: '3', page: 3, marks: 3, outcome: '10.5.5',
    stem: 'Write a C program for an attendance check. Use a loop and a break statement to stop as soon as the roll number entered is 0.',
    answer: '```c\n#include <stdio.h>\n\nint main(void) {\n    int roll;\n    while (scanf("%d", &roll) == 1) {\n        if (roll == 0) break;\n        printf("Recorded: %d\\n", roll);\n    }\n    return 0;\n}\n```',
  },
  {
    number: '4', page: 4, marks: 5, outcome: null, figure: 'q4',
    stem: 'Write the logic expression for the circuit shown, then complete a truth table for output Z for all eight combinations of inputs X, Y and W.',
    answer: 'The OR gate takes inputs X and Y. Its output and the negation of W feed the AND gate. Thus Z = (X OR Y) AND (NOT W).\n\n| X | Y | W | Z |\n| --- | --- | --- | --- |\n| 0 | 0 | 0 | 0 |\n| 0 | 0 | 1 | 0 |\n| 0 | 1 | 0 | 1 |\n| 0 | 1 | 1 | 0 |\n| 1 | 0 | 0 | 1 |\n| 1 | 0 | 1 | 0 |\n| 1 | 1 | 0 | 1 |\n| 1 | 1 | 1 | 0 |',
  },
  {
    number: '5a', page: 5, marks: 6, outcome: null, figure: 'q5a',
    stem: 'Write a C program for a library membership record. The paper asks for the full name with gets(), the integer user ID with scanf(), a hidden section character with getch() and an echoed Y/N confirmation with getche(). Format the output as shown.',
    answer: 'The paper refers to legacy C functions. Use bounded `fgets()` for the full name, since `gets()` has no buffer size and was removed from standard C. This example assumes a teaching compiler that supplies `getch()` and `getche()` in `conio.h`.\n\n```c\n#include <stdio.h>\n#include <string.h>\n#include <conio.h>\n\nint main(void) {\n    char name[80];\n    int id, ch;\n    printf("Name: ");\n    if (!fgets(name, sizeof name, stdin)) return 1;\n    if (!strchr(name, \'\\n\')) {\n        while ((ch = getchar()) != \'\\n\' && ch != EOF) {}\n    }\n    name[strcspn(name, "\\n")] = \'\\0\';\n    printf("ID: ");\n    if (scanf("%d", &id) != 1) return 1;\n    while ((ch = getchar()) != \'\\n\' && ch != EOF) {}\n    printf("Section Code: ");\n    int section = getch();\n    printf("\\nMembership (Y/N): ");\n    int membership = getche();\n    printf("\\n--- User Record ---\\n");\n    printf("Name: %s\\nID: %d\\nSection Code: %c\\nMembership: %c\\n",\n           name, id, section, membership);\n    return 0;\n}\n```',
  },
  {
    number: '5b', page: 5, marks: 6, outcome: '10.5.3',
    stem: 'Use a for loop in C to display the integers 1 to 10, calculate and display their sum, and display only the even integers from 1 to 10.',
    answer: '```c\n#include <stdio.h>\n\nint main(void) {\n    int sum = 0;\n    for (int i = 1; i <= 10; ++i) {\n        printf("%d ", i);\n        sum += i;\n    }\n    printf("\\nSum: %d\\nEven numbers: ", sum);\n    for (int i = 2; i <= 10; i += 2) {\n        printf("%d ", i);\n    }\n    puts("");\n    return 0;\n}\n```\n\nThe sum is 55. The even numbers are 2, 4, 6, 8 and 10.',
  },
  {
    number: '6a', page: 7, marks: 6, outcome: '6.3.1',
    stem: 'Explain any three types of malware.',
    answer: '1. **Trojan horse.** Malicious software disguised as a legitimate program or file.\n2. **Spyware.** Software that secretly monitors activity or collects information without consent.\n3. **Adware.** Software that displays unwanted advertisements. Some adware also tracks browsing activity.',
  },
  {
    number: '6b', page: 7, marks: 6, outcome: '6.3.2',
    stem: 'Describe authentication and authorisation. Then describe any two methods of two-factor authentication (2FA).',
    answer: '**Authentication** verifies the identity of a user. **Authorisation** determines what an identified user may access or do.\n\n1. A password and an authenticator-app code combine something the user knows with something they possess.\n2. A password and a fingerprint scan combine something the user knows with a physical characteristic.',
  },
];

const biologyWritten: WrittenQuestion[] = [
  {
    number: '1', page: 2, marks: 3, outcome: '11.2.3',
    stem: 'Name the organelle involved in forming the mitotic spindle in animal cells. Give two differences between animal-cell and plant-cell cytokinesis.',
    answer: 'The **centrosome**, which contains a pair of centrioles, organises spindle microtubules in animal cells.\n\n| Animal cell | Plant cell |\n| --- | --- |\n| A contractile ring forms a cleavage furrow. | Vesicles collect at the centre and form a cell plate. |\n| The furrow deepens inwards from the edge. | The plate grows outwards and becomes part of the new cell wall. |',
  },
  {
    number: '2', page: 2, marks: 4, outcome: '12.4.4', figure: 'q2',
    stem: 'Identify the parts of the nephron labelled X and Y. Give one function of each.',
    answer: '**X is the proximal convoluted tubule.** It reabsorbs useful solutes such as glucose from the filtrate.\n\n**Y is the loop of Henle.** It establishes the salt concentration gradient in the kidney medulla, which helps the kidney conserve water.',
  },
  {
    number: '3', page: 3, marks: 3, outcome: '14.1.4',
    stem: 'Compare bone and cartilage in terms of their cells and texture. Explain why a fracture usually heals more quickly than damaged cartilage.',
    answer: '| Feature | Bone | Cartilage |\n| --- | --- | --- |\n| Cells | Osteocytes | Chondrocytes |\n| Texture | Hard, rigid and mineralised | Firm, smooth and more flexible |\n\nBone has a blood supply that delivers nutrients and repair cells. Cartilage has little or no direct blood supply, so repair tends to be slower.',
  },
  {
    number: '4', page: 3, marks: 3, outcome: '16.4.5',
    stem: 'A heterozygous blood-group A man and a heterozygous blood-group B woman have children. Use a Punnett square to determine the possible genotypes and phenotypes.',
    answer: 'The parents are Iᴬi and Iᴮi.\n\n| | Iᴮ | i |\n| --- | --- | --- |\n| Iᴬ | IᴬIᴮ (AB) | Iᴬi (A) |\n| i | Iᴮi (B) | ii (O) |\n\nEach genotype has a 25% chance. The four blood groups occur in an expected 1:1:1:1 ratio.',
  },
  {
    number: '5a', page: 4, marks: 6, outcome: '13.5.2', figure: 'q5a',
    stem: 'Identify the endocrine gland labelled X. Describe its structure and the functions of the hormones it secretes.',
    answer: 'X is an **adrenal gland**. The adrenal glands lie above the kidneys. Each has an outer cortex and an inner medulla.\n\n- The cortex produces cortisol, which helps regulate metabolism and the stress response, and aldosterone, which helps control salt and water balance.\n- The medulla produces adrenaline, which prepares the body for immediate action by increasing heart rate and making more energy available.',
  },
  {
    number: '5b', page: 4, marks: 6, outcome: '15.2.1',
    stem: 'Explain three methods of asexual reproduction in plants. Give one example of each.',
    answer: '1. **Runners.** Horizontal stems grow along the soil and form new plants where nodes root, as in strawberry.\n2. **Tubers.** Buds on swollen underground stems sprout and produce plants, as in potato.\n3. **Stem cuttings.** A stem segment forms new roots and shoots when planted in suitable conditions, as in rose.',
  },
  {
    number: '6a', page: 6, marks: 6, outcome: '16.5.7',
    stem: 'Explain in four points how differential survival leads to evolution. Then relate antibiotic resistance in bacteria to natural selection.',
    answer: '1. Individuals in a population show heritable variation.\n2. More offspring can be produced than the environment can support.\n3. Individuals with traits better suited to the environment tend to survive and reproduce more.\n4. Those traits become more frequent over generations, changing the population.\n\nA bacterial population can contain resistant variants. When an antibiotic kills susceptible bacteria, resistant ones are more likely to survive and reproduce. The resistant trait therefore becomes more common.',
  },
  {
    number: '6b', page: 6, marks: 6, outcome: '17.3.1',
    stem: 'Describe any three stages of the nitrogen cycle.',
    answer: '1. **Nitrogen fixation.** Certain bacteria convert atmospheric nitrogen into ammonia or ammonium compounds.\n2. **Nitrification.** Soil microorganisms convert ammonium to nitrite and then to nitrate.\n3. **Denitrification.** Certain bacteria reduce nitrate to nitrogen gas, which returns to the atmosphere.',
  },
];

type Mcq = (typeof biologyMcqs)[number] | (typeof computerScienceMcqs)[number];

const biologyOutcomes = new Map(biologySyllabus[10].flatMap(unit =>
  unit.subtopics.flatMap(topic => topic.slos.map(slo =>
    [slo.code, { ...slo, unitNumber: unit.unitNumber, topic: unit.name }] as const))));

function buildPapers(subject: 'Computer Science' | 'Biology', mcqs: Mcq[], written: WrittenQuestion[]): PaperData[] {
  const biology = subject === 'Biology';
  const code = biology ? 'BIO' : 'CS';
  const slug = biology ? 'biology' : 'computer-science';
  const root = `/materials/ssc/${slug}/ssc-2/${slug}-x-2026-paper-`;

  function question(
    part: 1 | 2, number: string, stem: string, marks: number, outcomeCode: string | null,
    sourceRegion: QuestionData['sourceRegion'],
  ): QuestionData {
    const alternative = /[ab]$/.test(number);
    const outcome = biology && outcomeCode ? biologyOutcomes.get(outcomeCode) : undefined;
    if (biology && outcomeCode && !outcome) throw new Error(`Missing Class X Biology SLO ${outcomeCode}`);
    return {
      id: `${code.toLowerCase()}-x-2026-p${part}-q${number}`,
      questionNumber: number,
      questionText: stem,
      questionType: part === 1 ? 'MULTIPLE_CHOICE' : alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
      marks,
      difficulty: outcome?.cognitiveLevel ?? sourceRegion.cognitive_level ?? (part === 2 ? 'A' : undefined),
      diagramBased: Boolean(sourceRegion.diagramUrl),
      topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unitNumber } }] : undefined,
      slos: outcome ? [{ slo: { code: outcome.code, description: outcome.description } }] : undefined,
      sourceRegion: {
        ...sourceRegion,
        current_slo: outcomeCode,
        ...(outcome ? {
          current_mapping: [{ code: outcome.code, description: outcome.description, topic: outcome.topic, grade: 10 }],
          mapping_scope: { board: 'AKU-EB', grade: 10, subject },
          current_syllabus_reviewed: true,
          syllabus_reviewed: true,
          in_syllabus: true,
          cognitive_level: outcome.cognitiveLevel,
        } : {}),
        choice_instruction: alternative ? `Attempt either ${number[0]}(a) or ${number[0]}(b).` : undefined,
      },
    };
  }

  return ([1, 2] as const).map(part => {
    const paperCode = `${code}-X-2026-P${part}`;
    const roman = part === 1 ? 'I' : 'II';
    const figure = (name?: string) => name ? `/paper-crops/${paperCode}/${name}.webp` : undefined;
    const questions = part === 1 ? mcqs.map(row => question(1, String(row.number), row.stem, 1, row.outcome, {
      choices: row.choices,
      correct_answer: row.answer ?? undefined,
      answer_origin: 'PROJECT_SOLVED',
      cognitive_level: 'level' in row ? row.level : undefined,
      single_answer_review_required: row.answer === null,
      explanation: row.explanation,
      diagramUrl: figure(row.figure),
      pageNumber: row.page,
    })) : written.map(row => question(2, row.number, row.stem, row.marks, row.outcome, {
      model_answer: row.answer,
      model_answer_origin: 'RiseLearner worked solution',
      diagramUrl: figure(row.figure),
      pageNumber: row.page,
    }));
    return {
      id: paperCode, paperCode, title: `${subject} Class X 2026 Annual Examination Paper ${roman}`,
      examYear: 2026, examSession: 'Annual Examination 2026', examType: 'ANNUAL',
      fileUrl: root + roman.toLowerCase() + '.pdf',
      printedCode: `S2602-${biology ? '192' : '092'}${part === 1 ? '1110' : '1120'}`,
      totalMarks: part === 1 ? 40 : 25,
      durationMinutes: part === 1 ? 70 : 110,
      questionCount: part === 1 ? 40 : 6,
      rubricInstruction: part === 2 ? 'Answer all six questions. Attempt either (a) or (b) for each of Questions 5 and 6.' : undefined,
      academicClass: { name: 'Class X', level: 10 },
      subject: { id: slug + '-x', name: subject, code },
      questions,
    };
  });
}

export const computerScienceX2026Papers = buildPapers('Computer Science', computerScienceMcqs, computerScienceWritten);
export const biologyX2026Papers = buildPapers('Biology', biologyMcqs, biologyWritten);
