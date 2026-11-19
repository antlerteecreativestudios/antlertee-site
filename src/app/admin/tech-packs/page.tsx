import { LeadsList } from "@/components/admin/LeadsList";
import type { Search } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/auth/admin";

export default async function TechPacksPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  return <LeadsList searchParams={searchParams} kind="techpack" />;
}
