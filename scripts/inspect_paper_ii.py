import fitz

for grade, path in [
    ("SSC-I", r"public\materials\ssc\physics\ssc-1\physics-model-paper-ix-paper-ii.pdf"),
    ("SSC-II", r"public\materials\ssc\physics\ssc-2\physics-model-paper-x-paper-ii.pdf")
]:
    doc = fitz.open(path)
    print(f"\n================ {grade} Paper II ({len(doc)} pages) ================")
    for p_no in range(1, min(4, len(doc))):
        p = doc[p_no]
        text = p.get_text("text")
        print(f"--- Page {p_no + 1} ---")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for l in lines[:25]:
            print("  ", l)
