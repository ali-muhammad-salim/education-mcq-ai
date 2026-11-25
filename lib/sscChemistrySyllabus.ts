import units from "@/data/chemistry/ssc1_exact_syllabus.json";
import practicals from "@/data/chemistry/ssc1_practicals.json";

export const sscChemistryIxSections = {
  original: "/materials/ssc/chemistry/ssc-1/chemistry-ssc-full-syllabus-2025.pdf",
  assessmentPage: 50,
  practicalPage: 45,
  firstExam: 2026,
  paperI: 40,
  paperII: 25,
  paperIII: 10,
  erqMarks: 6,
  cognitiveWeight: "R 10–15% · U 55–60% · A and beyond 20–30%",
  chapters: units.map(({ unitNumber, examSpec }) => ({
    number: unitNumber,
    mcqs: examSpec.mcqs,
    crqMarks: examSpec.crqMarks ?? 0,
  })),
  erqPairs: [[2, 5], [7, 8]],
  practicals: practicals.map(({ expNumber, topic, description, apparatus }) => {
    const [equipment, chemicals] = apparatus.replace(/^Equipment: /, "").split(" · Chemicals: ");
    return {
      number: expNumber,
      chapter: Number(topic.split(" ")[1].replace(":", "")),
      activity: description,
      apparatus: equipment,
      chemicals,
    };
  }),
};
