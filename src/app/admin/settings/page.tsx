import { ConnectionsForm } from "@/components/admin/ConnectionsForm";
import { PageHead } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/auth/admin";
import { getConnections } from "@/server/settings";

export default async function SettingsPage() {
  const { csrf } = await requireAdminPage();
  const connections = await getConnections();
  return (
    <div className="a-page narrow">
      <PageHead title="Settings" />
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 650 }}>Connections</h2>
        <p className="a-sub">Advertising pixels, analytics and search engine verification. They load on the public website only, never in this admin.</p>
      </div>
      <ConnectionsForm initial={connections} csrf={csrf} />
    </div>
  );
}
