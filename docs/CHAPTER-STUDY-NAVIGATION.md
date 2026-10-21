# Chapter study navigation

Study material follows the existing board → class → subject navigation. The subject hub links to `/[board]/[class]/[subject]/study`, which lists current curriculum chapters. Each chapter has a separate page with resource-type choices. Choosing a type lists only that chapter's matching published resources, with pagination.

The root `/study` page is a board directory rather than a mixed resource feed. Old query-string links redirect into the hierarchy. Resource readers return directly to their chapter. No database migration or material regeneration is required.

Chapter queries are scoped to board, class, subject and the current syllabus. Availability uses the same source approval, content-hash and complete-edition checks as the public resource API. Unknown chapter IDs cannot open material from another scope. When Physics IX/X has no mapped chapter records, the existing public AKU-EB syllabus supplies chapter names with all resource types marked as being prepared; it does not supply generated content or fabricate availability.

Verification covers published-resource visibility, board/class isolation and source withdrawal in PostgreSQL, plus the existing regression suite. Browser checks cover the chapter list, resource choices, breadcrumbs and return links. Scientific content and publication controls are unchanged.
