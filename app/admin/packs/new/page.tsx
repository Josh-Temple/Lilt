import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackEditor } from "@/components/admin/PackEditor";
import { isServerAdmin } from "@/lib/supabase/adminGuard";

export default async function NewPackPage() {
  const isAdmin = await isServerAdmin();
  if (!isAdmin) {
    redirect("/admin");
  }

  return (
    <AdminShell title="New Pack" subtitle="Create one pack quickly, then add phrases and audio.">
      <PackEditor />
    </AdminShell>
  );
}
