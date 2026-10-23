import type { Prisma } from "@prisma/client";
import { materialResourceTypes } from './materialTypes';
export const publicMaterialWhere: Prisma.KnowledgeDocumentWhereInput = {
  publishAfterReview: true,
  status: "NEEDS_REVIEW",
  owner: { role: "ADMIN" },
  resourceType: { in: [...materialResourceTypes] },
  artifacts: { some: {}, every: { status: "APPROVED" } },
};
