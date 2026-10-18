import urllib.request

downloads = [
    '/api/resources?export=all&class=9',
    '/api/resources?export=all&class=10',
    '/api/resources?export=all&class=all',
    '/api/resources/class_ix_unit_3_dynamics?download=json',
    '/api/resources/class_ix_unit_3_dynamics?download=md',
    '/api/resources/class_ix_unit_3_dynamics?download=csv',
    '/api/curriculum?download=csv',
    '/api/curriculum?download=json',
    '/api/model-papers?download=json',
    '/api/model-papers?download=csv',
    '/api/model-papers?paperCode=PHY-IX-P1&download=json',
    '/api/model-papers?paperCode=PHY-IX-P1&download=csv',
]

print("=== TESTING ALL DOWNLOAD & VIEWABLE ENDPOINTS ===")
for d in downloads:
    url = f"http://localhost:3000{d}"
    try:
        res = urllib.request.urlopen(url)
        cd = res.headers.get("Content-Disposition", "none")
        ct = res.headers.get("Content-Type", "none").split(";")[0]
        data = res.read()
        print(f"PASS: {d:54} | {len(data):7} B | CT: {ct:16} | CD: {cd[:45]}")
    except Exception as e:
        print(f"FAIL: {d:54} | Error: {e}")
