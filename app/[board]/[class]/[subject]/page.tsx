import SubjectMaterials from "@/components/SubjectMaterials";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
}) {
  return <SubjectMaterials params={await params} />;
}
