import ChapterStudy from "@/components/ChapterStudy";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  return (
    <ChapterStudy params={await params} kind={(await searchParams).kind} />
  );
}
