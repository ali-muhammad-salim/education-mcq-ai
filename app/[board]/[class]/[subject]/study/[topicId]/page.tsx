import ChapterStudy from "@/components/ChapterStudy";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    board: string;
    class: string;
    subject: string;
    topicId: string;
  }>;
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <ChapterStudy
      params={await params}
      kind={
        typeof query.kind === "string"
          ? query.kind
          : query.kind
            ? "INVALID"
            : undefined
      }
    />
  );
}
