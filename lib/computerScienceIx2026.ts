import type { PaperData, QuestionData } from './paperDataService';

const paperCode = 'CS-IX-2026-P2';

type WrittenQuestion = {
  number: string;
  page: number;
  marks: number;
  outcome: string;
  stem: string;
  answer: string;
  image?: string;
};

const questions: WrittenQuestion[] = [
  {
    number: '1', page: 2, marks: 3, outcome: '2.2.2',
    stem: 'Write an algorithm that converts a temperature from Celsius to Fahrenheit using $F = C \\times \\frac{9}{5} + 32$.',
    answer: '1. Read the temperature $C$ in degrees Celsius.\n2. Compute $F = C \\times (9/5) + 32$.\n3. Display $F$ in degrees Fahrenheit.',
  },
  {
    number: '2', page: 2, marks: 2, outcome: '3.11.2',
    stem: 'Complete the JavaScript inside the HTML template. Initialise a variable named `price` to 50, double it using the multiplication assignment operator (`*=`), then display the updated value on the page.\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Multiplication Assignment</title>\n</head>\n<body>\n  <h2>Updated Price:</h2>\n  <script>\n    // Write your code here.\n  </script>\n</body>\n</html>\n```',
    answer: '```javascript\nlet price = 50;\nprice *= 2;\ndocument.write(price);\n```\n\nThe page displays 100.',
  },
  {
    number: '3', page: 3, marks: 2, outcome: '3.10.7',
    stem: 'Inside a `<script>` tag, declare a JavaScript constant named `PI` with the value 3.14. Display it on the web page using `document.write()`.',
    answer: '```html\n<script>\n  const PI = 3.14;\n  document.write(PI);\n</script>\n```',
  },
  {
    number: '4', page: 3, marks: 3, outcome: '3.6.1',
    stem: 'Write the HTML code that produces the web page shown in the screenshot.',
    image: '/paper-crops/CS-IX-2026-P2/q4.png',
    answer: '```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>hyperlink.html</title>\n</head>\n<body>\n  <h1>Hyperlink</h1>\n  <a href="https://www.google.com/">Visit Google.com!</a>\n</body>\n</html>\n```',
  },
  {
    number: '5', page: 4, marks: 3, outcome: '7.2.4',
    stem: 'A company plans to offer an online service where readers pay a monthly fee to access e-books. Apply three relevant components of the Business Model Canvas to this service.',
    answer: '1. **Customer segments.** Target frequent e-book readers who want ongoing access to a digital library.\n2. **Value proposition.** Offer convenient access to a varied e-book catalogue for a predictable monthly fee.\n3. **Revenue streams.** Collect recurring monthly subscription payments from readers.',
  },
  {
    number: '6a', page: 5, marks: 6, outcome: '1.8.1',
    stem: 'Explain the functions of a modem, a switch and a router. Give a suitable example for each.',
    answer: '1. **Modem.** Converts signals between the internet provider’s connection and the equipment that uses it. A cable modem connects a home network’s router to a provider over a coaxial cable.\n2. **Switch.** Connects devices on the same local network and forwards Ethernet frames to the port for the destination device. A school lab uses a switch to connect several computers and a network printer.\n3. **Router.** Forwards IP packets between distinct networks. A home router forwards traffic between the home network and the internet.',
  },
  {
    number: '6b', page: 5, marks: 6, outcome: '4.1.1',
    stem: 'A supermarket chain wants to study customer purchases and shopping trends and forecast sales. Explain data analysis, statistics and probability, and predictive modelling. Give one example from the scenario for each.',
    answer: '1. **Data analysis.** Examines data to find patterns. Compare receipts to see which products shoppers often buy together.\n2. **Statistics and probability.** Statistics summarises data and probability describes how likely an event is. Use past weekend sales to estimate the chance that a store will sell more than 100 cartons of milk on a Saturday.\n3. **Predictive model.** Uses patterns in past data to estimate future outcomes. Train a model on weekly sales, holidays and promotions to forecast next week’s bread sales.',
  },
  {
    number: '7a', page: 6, marks: 6, outcome: '5.3.1',
    stem: 'Describe the three cloud computing deployment models covered by the syllabus.',
    answer: '1. **Public cloud.** A provider offers cloud infrastructure to multiple customers over a network, usually the internet.\n2. **Private cloud.** The cloud infrastructure is dedicated to a single organisation, which controls its use and access.\n3. **Community cloud.** Several organisations with shared security, compliance or operational requirements share cloud infrastructure.',
  },
  {
    number: '7b', page: 6, marks: 6, outcome: '6.1.2',
    stem: 'Describe one positive and two negative impacts of computing on society.',
    answer: '1. **Access to education.** Online classes and materials let students study without travelling to a classroom.\n2. **Privacy risks.** Services can store sensitive personal information that may be exposed through misuse or a data breach.\n3. **Unequal access.** People without suitable devices or reliable internet can miss out on online education, government services and job opportunities.',
  },
];

export const computerScienceIx2026PaperII: PaperData = {
  id: paperCode,
  paperCode,
  title: 'Computer Science SSC-I 2026 Annual Examination Paper II (CRQ & ERQ)',
  examYear: 2026,
  examSession: 'Annual Examination 2026',
  examType: 'ANNUAL',
  totalMarks: 25,
  durationMinutes: 110,
  questionCount: 7,
  printedCode: 'S2601-0911120',
  rubricInstruction: 'Answer all seven questions. Attempt either (a) or (b) for each of Questions 6 and 7.',
  fileUrl: '/materials/ssc/computer-science/ssc-1/computer-science-ix-2026-paper-ii.pdf',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'computer-science-ix', name: 'Computer Science', code: 'CS' },
  questions: questions.map((question): QuestionData => {
    const isAlternative = /[ab]$/.test(question.number);

    return {
      id: `cs-ix-2026-p2-q${question.number}`,
      questionNumber: question.number,
      questionText: question.stem,
      questionType: isAlternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
      marks: question.marks,
      diagramBased: Boolean(question.image),
      sourceRegion: {
        pageNumber: question.page,
        current_slo: question.outcome,
        model_answer: question.answer,
        diagramUrl: question.image,
        choice_instruction: isAlternative ? `Attempt either ${question.number[0]}(a) or ${question.number[0]}(b).` : undefined,
      },
    };
  }),
};
