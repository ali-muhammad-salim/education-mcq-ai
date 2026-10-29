import urllib.request
import json

mp_data = json.loads(urllib.request.urlopen('http://localhost:3000/api/model-papers').read().decode('utf-8'))
papers = mp_data.get('papers', [])
print(f"Total Model Papers: {len(papers)}")
for p in papers:
    print(f"  [{p.get('paperCode')}] {p.get('title')} -> {len(p.get('questions', []))} questions")

p1_questions = papers[0].get('questions', []) if papers else []
if p1_questions:
    q1 = p1_questions[0]
    print("\nSample Q1 Verification:")
    print(f"  Question Number: {q1.get('questionNumber')}")
    print(f"  Stem: {q1.get('questionText')}")
    print(f"  Correct Answer: {q1.get('sourceRegion', {}).get('correct_answer')}")
    print(f"  Choices: {q1.get('sourceRegion', {}).get('choices')}")

cur_data = json.loads(urllib.request.urlopen('http://localhost:3000/api/curriculum').read().decode('utf-8'))
subjects = cur_data.get('subjects', [])
print(f"\nTotal Curriculum Subjects: {len(subjects)}")
for s in subjects:
    versions = s.get('syllabusVersions', [])
    topics = versions[0].get('topics', []) if versions else []
    print(f"  {s.get('name')} ({s.get('academicClass', {}).get('name')}): {len(topics)} Units")
    if topics and s.get('academicClass', {}).get('name') == 'Class IX':
        u1 = topics[0]
        print(f"    -> Unit {u1.get('topicNumber')}: {u1.get('name')}")
        for sub in u1.get('subtopics', []):
            print(f"       Subtopic {sub.get('subtopicNum')}: {sub.get('name')} ({len(sub.get('slos', []))} SLOs)")

res_data = json.loads(urllib.request.urlopen('http://localhost:3000/api/resources').read().decode('utf-8'))
resources = res_data.get('resources', [])
print(f"\nTotal Chapter Resource Packs: {len(resources)}")
for r in resources[:5]:
    print(f"  {r.get('classLevel')} - {r.get('chapter')} ({r.get('sloCount')} SLOs, {r.get('mcqCount')} MCQs)")
