# Initial supervised trial — 24 October 2026

One Class IX Computer Science resource-guide page was tested in Gemini's displayed Flash mode (menu label 3.8 Flash), using the original page PNG and one-page PDF. This is a qualitative trial, not an accuracy or throughput benchmark.

The previous prompt produced added citation tokens, an image placeholder and three invented table rows. The first task-specific prompt removed the citations and placeholder and preserved the printed single data row, but still emitted unsupported superscript HTML, wrapped URLs and an abbreviated watermark.

After one targeted correction, the response parsed as JSON, retained one five-column data row, contained all five printed PDF link targets exactly, and contained no generated citations, image placeholders or unsupported HTML. Logo lettering remained unresolved and the watermark was still abbreviated. The page therefore remains **unverified and unpublished**. Passing formatting checks does not establish scientific or transcription accuracy.

The saved transcription template was tightened with an explicit URL-wrap example, an HTML restriction and a final unresolved-span check. That final consolidated version has not yet received a fresh independent trial. The other specialist templates also require representative trials before any claim about accuracy or unattended publication. Preserve the original and require source review in the meantime.

Raw prompts, responses, source identifiers and detailed checks are saved in the local import output ledger. They are not silently rewritten to improve the reported result.
