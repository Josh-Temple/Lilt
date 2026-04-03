"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackEditor } from "@/components/admin/PackEditor";
import { hasSupabaseEnv, selectRows } from "@/lib/supabase/client";

type EditablePack = {
  title: string;
  slug: string;
  description: string;
  level: string;
  topic: string;
  transcript: string;
  status: string;
};

export default function EditPackPage() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<EditablePack | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || !id) return;

    selectRows<EditablePack[]>("packs", `select=title,slug,description,level,topic,transcript,status&id=eq.${id}&limit=1`)
      .then((rows) => {
        const row = rows[0];
        if (!row) return;

        setPack({
          title: row.title,
          slug: row.slug,
          description: row.description ?? "",
          level: row.level ?? "B1",
          topic: row.topic ?? "",
          transcript: row.transcript,
          status: row.status,
        });
      })
      .catch(() => setPack(null));
  }, [id]);

  return (
    <AdminShell title="Edit Pack" subtitle="Update metadata, add phrases, and upload audio.">
      {pack ? <PackEditor packId={id} initial={pack} /> : <p>Loading...</p>}
    </AdminShell>
  );
}
