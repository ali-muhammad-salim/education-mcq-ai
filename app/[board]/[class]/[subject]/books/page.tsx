import SubjectResourceList from "@/components/SubjectResourceList";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ board: string; class: string; subject: string }>;
  searchParams: Promise<{ view?: string; after?: string }>;
}) {
  return (
    <SubjectResourceList
      params={await params}
      type="textbook"
      guide={(await searchParams).view === "guide"}
      after={(await searchParams).after}
    />
  );
}
