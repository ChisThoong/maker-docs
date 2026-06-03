import DocView from "@/components/DocView";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocView id={id} />;
}
