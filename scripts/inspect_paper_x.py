import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-2\physics-model-paper-x-paper-i.pdf")
print(f"Total pages: {len(doc)}")
p = doc[1] # Page 2
with open(r"scripts\paper_x_p2_text.txt", "w", encoding="utf-8") as f:
    f.write(p.get_text("text"))

print("Saved Grade X Paper I Page 2 text to scripts/paper_x_p2_text.txt")
