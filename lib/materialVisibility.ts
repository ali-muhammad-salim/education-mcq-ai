import type { Prisma } from "@prisma/client";
export const publicMaterialWhere: Prisma.KnowledgeDocumentWhereInput = {
  publishAfterReview: true,
  status: "NEEDS_REVIEW",
  owner: { role: "ADMIN" },
  resourceType: { in: ["syllabus", "textbook", "past_paper", "model_paper"] },
  artifacts: { some: {}, every: { status: "APPROVED" } },
};
