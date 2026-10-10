import CaseDetail from "@/components/collect/CaseDetail";

export default async function CollectCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetail id={id} />;
}
