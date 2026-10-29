export const materialResourceTypes = ['syllabus','past_paper','model_paper','textbook','answer_key','e_marking','pacing_guide','resource_guide','teacher_guide','listening_material','practical_paper','syllabus_companion'] as const;
export const supportingMaterialLabels = {
  pacing_guide:'Pacing guides',resource_guide:'Resource guides',teacher_guide:'Teacher guides',listening_material:'Listening materials',practical_paper:'Practicals',syllabus_companion:'Other syllabus copies',
} as const;

export type MaterialResourceType=typeof materialResourceTypes[number];
