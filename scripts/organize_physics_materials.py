import os
import shutil
import fitz

SOURCE_DIR = r"C:\Users\Mak Tech\OneDrive\Desktop\Study Material Manually\SSC\Physics"
BASE_TARGET = r"public\materials\ssc\physics"

SSC1_TARGET = os.path.join(BASE_TARGET, "ssc-1")
SSC2_TARGET = os.path.join(BASE_TARGET, "ssc-2")

os.makedirs(SSC1_TARGET, exist_ok=True)
os.makedirs(SSC2_TARGET, exist_ok=True)

print(f"Organizing files from: {SOURCE_DIR}")

# 1. Copy original full files to both folders for complete reference
full_syllabus_src = os.path.join(SOURCE_DIR, "physics-ssc-syllabus-final.pdf")
full_resource_src = os.path.join(SOURCE_DIR, "resources-guide-2025-ssc-physics-final.pdf")

shutil.copy2(full_syllabus_src, os.path.join(SSC1_TARGET, "physics-ssc-full-syllabus-2025.pdf"))
shutil.copy2(full_syllabus_src, os.path.join(SSC2_TARGET, "physics-ssc-full-syllabus-2025.pdf"))
shutil.copy2(full_resource_src, os.path.join(SSC1_TARGET, "resources-guide-2025-ssc-physics-full.pdf"))
shutil.copy2(full_resource_src, os.path.join(SSC2_TARGET, "resources-guide-2025-ssc-physics-full.pdf"))

# 2. SSC-1 specific files
shutil.copy2(os.path.join(SOURCE_DIR, "pacing-guide-2025-for-ssc-i-physics.pdf"), os.path.join(SSC1_TARGET, "pacing-guide-2025-for-ssc-i-physics.pdf"))
shutil.copy2(os.path.join(SOURCE_DIR, "physics-model-paper-ix-paper-i.pdf"), os.path.join(SSC1_TARGET, "physics-model-paper-ix-paper-i.pdf"))
shutil.copy2(os.path.join(SOURCE_DIR, "physics-model-paper-ix-paper-ii.pdf"), os.path.join(SSC1_TARGET, "physics-model-paper-ix-paper-ii.pdf"))
shutil.copy2(os.path.join(SOURCE_DIR, "ssc-i-physics-sample-practical.pdf"), os.path.join(SSC1_TARGET, "ssc-i-physics-sample-practical.pdf"))

# 3. SSC-2 specific files
shutil.copy2(os.path.join(SOURCE_DIR, "pacing-guide-for-ssc-ii-physics.pdf"), os.path.join(SSC2_TARGET, "pacing-guide-for-ssc-ii-physics.pdf"))
shutil.copy2(os.path.join(SOURCE_DIR, "physics-model-paper-x-paper-i.pdf"), os.path.join(SSC2_TARGET, "physics-model-paper-x-paper-i.pdf"))
shutil.copy2(os.path.join(SOURCE_DIR, "physics-model-paper-x-paper-ii.pdf"), os.path.join(SSC2_TARGET, "physics-model-paper-x-paper-ii.pdf"))

# 4. Generate Dedicated Standalone Split PDFs using PyMuPDF

# A. Syllabus Split
syl_doc = fitz.open(full_syllabus_src)

# SSC-1 Syllabus: Pages 0-25 (Cover, preface, intro, Grade 9 SLOs), 47-48 (Grade 9 Practicals), 51 (Grade 9 Assessment), 53-57 (Annexures/acknowledgements)
ssc1_pages = list(range(0, 26)) + [47, 48, 51] + list(range(53, min(58, len(syl_doc))))
doc_ssc1_syl = fitz.open()
doc_ssc1_syl.insert_pdf(syl_doc, from_page=0, to_page=0) # dummy
doc_ssc1_syl.delete_page(0)
for p in ssc1_pages:
    if p < len(syl_doc):
        doc_ssc1_syl.insert_pdf(syl_doc, from_page=p, to_page=p)
doc_ssc1_syl.save(os.path.join(SSC1_TARGET, "physics-ssc-i-syllabus-grade-9-dedicated.pdf"))
doc_ssc1_syl.close()

# SSC-2 Syllabus: Pages 0-9 (Cover, preface, intro), 26-46 (Grade 10 SLOs), 49-50 (Grade 10 Practicals), 52 (Grade 10 Assessment), 53-57 (Acknowledgements)
ssc2_pages = list(range(0, 10)) + list(range(26, 47)) + [49, 50, 52] + list(range(53, min(58, len(syl_doc))))
doc_ssc2_syl = fitz.open()
doc_ssc2_syl.insert_pdf(syl_doc, from_page=0, to_page=0)
doc_ssc2_syl.delete_page(0)
for p in ssc2_pages:
    if p < len(syl_doc):
        doc_ssc2_syl.insert_pdf(syl_doc, from_page=p, to_page=p)
doc_ssc2_syl.save(os.path.join(SSC2_TARGET, "physics-ssc-ii-syllabus-grade-10-dedicated.pdf"))
doc_ssc2_syl.close()
syl_doc.close()

# B. Resource Guide Split
res_doc = fitz.open(full_resource_src)
# Pages 0 to 9 are Grade IX (10 pages)
doc_ssc1_res = fitz.open()
doc_ssc1_res.insert_pdf(res_doc, from_page=0, to_page=9)
doc_ssc1_res.save(os.path.join(SSC1_TARGET, "resources-guide-2025-ssc-i-physics-dedicated.pdf"))
doc_ssc1_res.close()

# Pages 10 to 19 are Grade X (10 pages)
doc_ssc2_res = fitz.open()
doc_ssc2_res.insert_pdf(res_doc, from_page=10, to_page=min(19, len(res_doc)-1))
doc_ssc2_res.save(os.path.join(SSC2_TARGET, "resources-guide-2025-ssc-ii-physics-dedicated.pdf"))
doc_ssc2_res.close()
res_doc.close()

print("Successfully separated and generated dedicated files for SSC-I and SSC-II!")
print("SSC-I files:", os.listdir(SSC1_TARGET))
print("SSC-II files:", os.listdir(SSC2_TARGET))
