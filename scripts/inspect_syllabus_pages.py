import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

print("Checking pages 25 to 48 for Unit headings:")
for p in range(25, min(48, len(doc))):
    text = doc[p].get_text()
    for line in text.split("\n"):
        line_clean = line.strip()
        if any(line_clean.startswith(f"{i}.") for i in range(11, 21)):
            print(f"Page {p+1}: {line_clean}")
