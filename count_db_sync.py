from prisma import Prisma

def main():
    client = Prisma()
    client.connect()
    
    board = client.board.count()
    programme = client.programme.count()
    class_count = client.academicclass.count()
    subject = client.subject.count()
    version = client.syllabusversion.count()
    topic = client.topic.count()
    subtopic = client.subtopic.count()
    slo = client.slo.count()
    
    print(f'Board: {board}')
    print(f'Programme: {programme}')
    print(f'Class: {class_count}')
    print(f'Subject: {subject}')
    print(f'SyllabusVersion: {version}')
    print(f'Topic: {topic}')
    print(f'Subtopic: {subtopic}')
    print(f'SLO: {slo}')
    
    client.disconnect()

if __name__ == "__main__":
    main()
