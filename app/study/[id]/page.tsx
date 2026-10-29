import StudyReader from "@/components/StudyReader";
export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudyReader id={id} />;
}
