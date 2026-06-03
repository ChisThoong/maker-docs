import { redirect } from "next/navigation";

/** Legacy public links — redirect to login; docs require authentication. */
export default function LegacyPublicPage() {
  redirect("/login");
}
