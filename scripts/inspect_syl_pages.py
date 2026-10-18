import pymupdf

doc = pymupdf.open("data/intake/physics_9/syllabus/physics-ssc-syllabus-final.pdf")

print("=== CHECKING TABLE OF CONTENTS & CHAPTER HEADINGS ===")
for p in range(10, 48):
    text = doc[p-1].get_text()
    for line in text.split("\n"):
        line = line.strip()
        if any(line.startswith(f"{i}.") for i in range(1, 21)) and len(line) < 50:
            print(f"Page {p}: {line}")
