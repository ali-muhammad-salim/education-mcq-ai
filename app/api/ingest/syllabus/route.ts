import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { versionId, topics } = data;

    if (!versionId || !topics) {
      return NextResponse.json({ error: 'Missing versionId or topics' }, { status: 400 });
    }

    let topicOrder = 1;
    for (const topicData of topics) {
      const topic = await prisma.topic.create({
        data: {
          name: topicData.name,
          topicNumber: String(topicOrder++),
          syllabusVersionId: versionId,
        }
      });

      let subTopicOrder = 1;
      for (const subTopicData of topicData.subtopics) {
        const subTopic = await prisma.subtopic.create({
          data: {
            name: subTopicData.name,
            subtopicNum: String(subTopicOrder++),
            topicId: topic.id,
          }
        });

        for (const sloData of subTopicData.slos) {
          await prisma.sLO.create({
            data: {
              code: sloData.code,
              description: sloData.description,
              subtopicId: subTopic.id,
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Ingestion completed' });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
