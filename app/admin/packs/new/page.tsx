import { AdminShell } from "@/components/admin/AdminShell";
import { PackEditor } from "@/components/admin/PackEditor";

export default function NewPackPage() {
  return (
    <AdminShell title="New Pack" subtitle="Create one pack quickly, then add phrases and audio.">
      <PackEditor />
    </AdminShell>
  );
}
