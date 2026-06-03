import DocReader from "@/components/reader/DocReader";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocReader id={id} />;
}
