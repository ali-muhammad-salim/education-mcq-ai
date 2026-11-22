import { normalizeBoardId } from '@/lib/boardCatalog';

type Task = {
  number: number;
  marks: number;
  prompt?: string;
  responses?: string[];
  drawing?: string;
  observed?: boolean;
};

type Stage = { title: string; prompt: string; note?: string; tasks: Task[] };

const stages: Record<11 | 12, Stage[]> = {
  11: [
    {
      title: 'Stage I',
      prompt: 'Identify slides or specimens 17 and 18. Give one reason for each identification.',
      tasks: [
        { number: 1, marks: 2, responses: ['Identification', 'Reason for identification'] },
        { number: 2, marks: 2, responses: ['Identification', 'Reason for identification'] },
      ],
    },
    {
      title: 'Stage II',
      prompt: 'Prepare a temporary slide of the given material and identify it.',
      tasks: [
        { number: 3, marks: 2, prompt: 'Prepare the slide and bring the material into exact focus under the microscope.', observed: true },
        { number: 4, marks: 1, responses: ['Identification of the material'] },
      ],
    },
    {
      title: 'Stage III',
      prompt: 'Describe the given Brassica campestris flower in biological terms. Write its floral formula and draw its floral diagram.',
      tasks: [
        { number: 5, marks: 2, prompt: 'Describe the inflorescence, flower, calyx, corolla, androecium and gynoecium to the examiner.' },
        { number: 6, marks: 1, responses: ['Floral formula'] },
        { number: 7, marks: 2, drawing: 'Floral diagram' },
      ],
    },
  ],
  12: [
    {
      title: 'Stage I',
      prompt: 'Identify slide 4 and give one reason for your identification.',
      tasks: [
        { number: 1, marks: 2, responses: ['Identification of slide 4', 'Reason for identification'] },
      ],
    },
    {
      title: 'Stage II',
      prompt: 'Prepare a temporary slide of the provided material and draw a labelled diagram of what you see under the microscope.',
      note: 'The provided material may be smooth, skeletal or cardiac muscle from a frog.',
      tasks: [
        { number: 2, marks: 1, prompt: 'Prepare the slide.', observed: true },
        { number: 3, marks: 1, prompt: 'Bring the material into exact focus under the microscope.', observed: true },
        { number: 4, marks: 2, drawing: 'Labelled diagram' },
      ],
    },
    {
      title: 'Stage III',
      prompt: 'Construct four food chains and one food web using the provided list of living organisms.',
      note: 'The exam paper will provide a list of organisms from an ecosystem.',
      tasks: [
        { number: 5, marks: 4, responses: ['Food chain 1 (1 mark)', 'Food chain 2 (1 mark)', 'Food chain 3 (1 mark)', 'Food chain 4 (1 mark)'] },
        { number: 6, marks: 2, drawing: 'Food web' },
      ],
    },
  ],
};

export function hsscBiologyPractical(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== 'akueb' || subject !== 'biology' || (grade !== 11 && grade !== 12)) return null;
  const roman = grade === 11 ? 'XI' : 'XII';
  return {
    roman,
    year: grade === 11 ? 2026 : 2027,
    original: `/materials/hssc/biology/biology-${roman.toLowerCase()}-sample-practical.pdf`,
    stages: stages[grade],
  };
}
