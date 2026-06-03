import { notFound } from "next/navigation";
import DocReader from "@/components/reader/DocReader";
import { listDocs } from "@/lib/docs";
import { resolveDocIdByPath } from "@/lib/doc-paths";

const RESERVED_ROOT = new Set([
  "doc",
  "profile",
  "settings",
  "view",
  "p",
  "api",
  "login",
]);

/** Standalone document view at a readable path (no app shell). */
export default async function PathViewPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  if (!path?.length || RESERVED_ROOT.has(path[0].toLowerCase())) {
    notFound();
  }

  const metas = await listDocs();
  const id = resolveDocIdByPath(path, metas);
  if (!id) notFound();

  return <DocReader id={id} />;
}
