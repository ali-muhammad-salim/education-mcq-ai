import ChapterStudy from "@/components/ChapterStudy";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  return <ChapterStudy params={await params} />;
}
