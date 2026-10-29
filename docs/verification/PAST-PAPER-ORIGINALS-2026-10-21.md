# Original PDF deployment correction

The live check after PR #10 found that the 2025 Physics IX annual originals were referenced under `public/uploads`, an ignored runtime directory. They existed locally but were absent from clean production builds. All 15 previously bundled syllabus/model/resource-guide PDFs passed live HEAD checks.

Unchanged original bytes are now bundled under `public/materials/ssc/physics/ssc-1`, matching the existing versioned materials convention. The fallback paper metadata uses these canonical URLs. Permanent redirects preserve old URLs and database references. No content, answers, schema or publication permissions change.

- Paper I: 412,723 bytes; SHA-256 `0cbae90b5b2e7964d014c66a2f9b66549bc6acef80c889a7841601e15ba627a4`.
- Paper II: 262,573 bytes; SHA-256 `b67e2772dc66efe580c8cdff3ae90238550330748328d2ed9b4798c46b2f9c6f`.
- Focused validation: 11 paper presentation, syllabus and bundled-original tests passed. Clean-checkout CI verifies these exact original bytes are included.

The current UI release and additive migration are already live. This correction requires only the normal GitHub/Dokploy release, with no further database migration.
