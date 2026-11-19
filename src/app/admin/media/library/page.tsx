import { FilesTabs } from "@/components/admin/FilesTabs";
import { PageHead } from "@/components/admin/ui";
import { LibraryManager } from "@/components/admin/LibraryManager";
import { requireAdminPage } from "@/server/auth/admin";
import { listLibrary } from "@/server/media";

export default async function LibraryPage() {
  const { csrf } = await requireAdminPage();
  const items = await listLibrary();
  return (
    <div className="a-page wide">
      <PageHead title="Files" />
      <FilesTabs current="library" />
      <p className="a-sub">Extra photos and videos. Upload them here, give each a name and a description, and copy the link when you need it.</p>
      <section className="a-card">
        <LibraryManager csrf={csrf} items={items} />
      </section>
    </div>
  );
}
