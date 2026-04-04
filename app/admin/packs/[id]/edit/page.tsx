import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackEditor } from "@/components/admin/PackEditor";
import { isServerAdmin } from "@/lib/supabase/adminGuard";
import { hasSupabaseServerEnv, selectServerRows } from "@/lib/supabase/server";

type EditablePack = {
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  topic: string | null;
  transcript: string;
  status: string;
};

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!(await isServerAdmin())) {
    redirect("/admin");
  }

  if (!hasSupabaseServerEnv()) {
    redirect("/admin");
  }

  const rows = await selectServerRows<EditablePack[]>(
    "packs",
    `select=title,slug,description,level,topic,transcript,status&id=eq.${encodeURIComponent(id)}&limit=1`,
  );

  const pack = rows[0];
  if (!pack) {
    redirect("/admin");
  }

  return (
    <AdminShell title="Edit Pack" subtitle="Update metadata, add phrases, and upload audio.">
      <PackEditor
        packId={id}
        initial={{
          title: pack.title,
          slug: pack.slug,
          description: pack.description ?? "",
          level: pack.level ?? "B1",
          topic: pack.topic ?? "",
          transcript: pack.transcript,
          status: pack.status,
        }}
      />
    </AdminShell>
  );
}
