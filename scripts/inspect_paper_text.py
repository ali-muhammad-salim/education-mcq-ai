import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-model-paper-ix-paper-i.pdf")
print(f"Total pages: {len(doc)}")
p = doc[1] # Page 2
print("--- Page 2 Raw Text ---")
with open(r"scripts\paper_p2_text.txt", "w", encoding="utf-8") as f:
    f.write(p.get_text("text"))

print("Saved Page 2 raw text to scripts/paper_p2_text.txt")
