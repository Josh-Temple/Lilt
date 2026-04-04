"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteRows, hasSupabaseEnv, insertRows, selectRows, updateRows, uploadAudio } from "@/lib/supabase/client";

type PackEditorProps = {
  packId?: string;
  initial?: {
    title: string;
    slug: string;
    description: string;
    level: string;
    topic: string;
    transcript: string;
    status: string;
  };
};

type PackFormState = {
  title: string;
  slug: string;
  description: string;
  level: string;
  topic: string;
  transcript: string;
  status: string;
};

type PhraseFormState = {
  phraseText: string;
  phraseSlug: string;
  meaningJa: string;
  corePattern: string;
  meaningEn: string;
  notes: string;
  difficulty: number;
  tags: string;
  sortOrder: number;
  role: string;
  startChar: number | "";
  endChar: number | "";
  startSec: number | "";
  endSec: number | "";
};

type ExistingPhrase = {
  id: string;
  slug: string;
  text: string;
};

type LinkedPhraseRow = {
  id: string;
  sort_order: number;
  role: "main" | "support";
  start_char_index: number | null;
  end_char_index: number | null;
  start_sec: number | null;
  end_sec: number | null;
  phrase: {
    id: string;
    slug: string;
    text: string;
  } | null;
};

type AudioAsset = {
  id: string;
  storage_path: string;
  version: number;
  is_primary: boolean;
};

const emptyPhraseForm: PhraseFormState = {
  phraseText: "",
  phraseSlug: "",
  meaningJa: "",
  corePattern: "",
  meaningEn: "",
  notes: "",
  difficulty: 2,
  tags: "",
  sortOrder: 0,
  role: "main",
  startChar: "",
  endChar: "",
  startSec: "",
  endSec: "",
};

const toNullableNumber = (value: number | "") => (typeof value === "number" ? value : null);

export function PackEditor({ packId, initial }: PackEditorProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [packForm, setPackForm] = useState<PackFormState>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    level: initial?.level ?? "B1",
    topic: initial?.topic ?? "",
    transcript: initial?.transcript ?? "",
    status: initial?.status ?? "draft",
  });
  const [phraseForm, setPhraseForm] = useState<PhraseFormState>(emptyPhraseForm);
  const [existingPhraseQuery, setExistingPhraseQuery] = useState("");
  const [existingPhrases, setExistingPhrases] = useState<ExistingPhrase[]>([]);
  const [linkedPhrases, setLinkedPhrases] = useState<LinkedPhraseRow[]>([]);

  const runAction = async (action: () => Promise<void>) => {
    try {
      setMessage(null);
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  };

  const updatePack = (key: keyof PackFormState, value: string) => {
    setPackForm((current) => ({ ...current, [key]: value }));
  };

  const updatePhrase = <K extends keyof PhraseFormState>(key: K, value: PhraseFormState[K]) => {
    setPhraseForm((current) => ({ ...current, [key]: value }));
  };

  const loadLinkedPhrases = useCallback(async () => {
    if (!hasSupabaseEnv() || !packId) return;

    const rows = await selectRows<LinkedPhraseRow[]>(
      "pack_phrases",
      `select=id,sort_order,role,start_char_index,end_char_index,start_sec,end_sec,phrase:phrases(id,slug,text)&pack_id=eq.${encodeURIComponent(packId)}&order=sort_order.asc`,
    );

    setLinkedPhrases(rows);
  }, [packId]);

  useEffect(() => {
    loadLinkedPhrases().catch(() => undefined);
  }, [loadLinkedPhrases]);

  useEffect(() => {
    if (!hasSupabaseEnv() || !existingPhraseQuery.trim()) {
      setExistingPhrases([]);
      return;
    }

    const term = existingPhraseQuery.trim().replace(/,/g, "");
    const q = encodeURIComponent(`*${term}*`);
    selectRows<ExistingPhrase[]>(
      "phrases",
      `select=id,slug,text&or=(slug.ilike.${q},text.ilike.${q})&order=created_at.desc&limit=15`,
    )
      .then(setExistingPhrases)
      .catch(() => setExistingPhrases([]));
  }, [existingPhraseQuery]);

  const savePack = async () => {
    await runAction(async () => {
      if (!hasSupabaseEnv()) throw new Error("Supabase env vars missing");
      if (!packForm.title || !packForm.slug || !packForm.transcript) {
        throw new Error("title/slug/transcript are required");
      }

      if (!packId) {
        const rows = await insertRows<Array<{ id: string }>>("packs", packForm);
        const createdId = rows[0]?.id;
        if (!createdId) throw new Error("Pack created but id was not returned");
        window.location.href = `/admin/packs/${createdId}/edit`;
        return;
      }

      await updateRows("packs", `id=eq.${encodeURIComponent(packId)}`, packForm);
      setMessage("Pack saved");
    });
  };

  const addPhrase = async () => {
    await runAction(async () => {
      if (!hasSupabaseEnv() || !packId) throw new Error("Create pack first");
      if (!phraseForm.phraseText || !phraseForm.phraseSlug || !phraseForm.meaningJa) {
        throw new Error("phrase text/slug/meaning_ja are required");
      }

      const phraseRows = await insertRows<Array<{ id: string }>>("phrases", {
        text: phraseForm.phraseText,
        slug: phraseForm.phraseSlug,
        meaning_ja: phraseForm.meaningJa,
        core_pattern: phraseForm.corePattern,
        meaning_en: phraseForm.meaningEn,
        notes: phraseForm.notes,
        difficulty: phraseForm.difficulty,
        tags: phraseForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });

      const phraseId = phraseRows[0]?.id;
      if (!phraseId) throw new Error("Phrase created but id was not returned");

      await insertRows("pack_phrases", {
        pack_id: packId,
        phrase_id: phraseId,
        sort_order: phraseForm.sortOrder,
        role: phraseForm.role,
        start_char_index: toNullableNumber(phraseForm.startChar),
        end_char_index: toNullableNumber(phraseForm.endChar),
        start_sec: toNullableNumber(phraseForm.startSec),
        end_sec: toNullableNumber(phraseForm.endSec),
      });

      setMessage("Phrase + link created");
      setPhraseForm(emptyPhraseForm);
      await loadLinkedPhrases();
    });
  };

  const linkExistingPhrase = async (phraseId: string) => {
    await runAction(async () => {
      if (!hasSupabaseEnv() || !packId) throw new Error("Create pack first");

      await insertRows("pack_phrases", {
        pack_id: packId,
        phrase_id: phraseId,
        sort_order: linkedPhrases.length,
        role: "support",
      });

      setMessage("Existing phrase linked");
      await loadLinkedPhrases();
    });
  };

  const updateLink = async (id: string, payload: Record<string, unknown>) => {
    await runAction(async () => {
      await updateRows("pack_phrases", `id=eq.${encodeURIComponent(id)}`, payload);
      setMessage("Link updated");
      await loadLinkedPhrases();
    });
  };

  const removeLink = async (id: string) => {
    await runAction(async () => {
      await deleteRows("pack_phrases", `id=eq.${encodeURIComponent(id)}`);
      setMessage("Phrase unlinked from pack");
      await loadLinkedPhrases();
    });
  };

  const onUploadPackAudio = async (file: File | null) => {
    await runAction(async () => {
      if (!hasSupabaseEnv() || !packId || !file) throw new Error("Choose audio after creating the pack");

      const existing = await selectRows<AudioAsset[]>(
        "audio_assets",
        `select=id,storage_path,version,is_primary&pack_id=eq.${encodeURIComponent(packId)}&kind=eq.pack_full&order=version.desc`,
      );
      const nextVersion = (existing[0]?.version ?? 0) + 1;
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "mp3";
      const path = `packs/${packForm.slug}/full/v${nextVersion}.${extension}`;

      await uploadAudio(path, file);

      const previousPrimary = existing.filter((asset) => asset.is_primary);
      await Promise.all(
        previousPrimary.map((asset) =>
          updateRows("audio_assets", `id=eq.${encodeURIComponent(asset.id)}`, { is_primary: false }),
        ),
      );

      await insertRows("audio_assets", {
        pack_id: packId,
        kind: "pack_full",
        storage_path: path,
        mime_type: file.type || "audio/mpeg",
        is_primary: true,
        version: nextVersion,
      });

      setMessage(`Pack audio uploaded (v${nextVersion})`);
    });
  };

  const linkedPhraseIds = useMemo(() => new Set(linkedPhrases.map((row) => row.phrase?.id).filter(Boolean)), [linkedPhrases]);

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Pack</h2>
        <input className="w-full rounded-xl border p-2" placeholder="Title" value={packForm.title} onChange={(e) => updatePack("title", e.target.value)} />
        <input className="w-full rounded-xl border p-2" placeholder="Slug" value={packForm.slug} onChange={(e) => updatePack("slug", e.target.value)} />
        <textarea className="w-full rounded-xl border p-2" placeholder="Description" value={packForm.description} onChange={(e) => updatePack("description", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-xl border p-2" placeholder="Level" value={packForm.level} onChange={(e) => updatePack("level", e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Topic" value={packForm.topic} onChange={(e) => updatePack("topic", e.target.value)} />
        </div>
        <select className="rounded-xl border p-2" value={packForm.status} onChange={(e) => updatePack("status", e.target.value)}>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <textarea
          className="min-h-32 w-full rounded-xl border p-2"
          placeholder="Transcript"
          value={packForm.transcript}
          onChange={(e) => updatePack("transcript", e.target.value)}
        />
        <button className="btn-primary" onClick={savePack}>Save pack</button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Add phrase + link</h2>
        <input className="w-full rounded-xl border p-2" placeholder="Phrase text" value={phraseForm.phraseText} onChange={(e) => updatePhrase("phraseText", e.target.value)} />
        <input className="w-full rounded-xl border p-2" placeholder="Phrase slug" value={phraseForm.phraseSlug} onChange={(e) => updatePhrase("phraseSlug", e.target.value)} />
        <input className="w-full rounded-xl border p-2" placeholder="meaning_ja" value={phraseForm.meaningJa} onChange={(e) => updatePhrase("meaningJa", e.target.value)} />
        <input className="w-full rounded-xl border p-2" placeholder="core pattern" value={phraseForm.corePattern} onChange={(e) => updatePhrase("corePattern", e.target.value)} />
        <input className="w-full rounded-xl border p-2" placeholder="meaning_en" value={phraseForm.meaningEn} onChange={(e) => updatePhrase("meaningEn", e.target.value)} />
        <textarea className="w-full rounded-xl border p-2" placeholder="notes" value={phraseForm.notes} onChange={(e) => updatePhrase("notes", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className="rounded-xl border p-2" placeholder="difficulty" value={phraseForm.difficulty} onChange={(e) => updatePhrase("difficulty", Number(e.target.value) || 2)} />
          <input className="rounded-xl border p-2" placeholder="tags: a,b,c" value={phraseForm.tags} onChange={(e) => updatePhrase("tags", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" className="rounded-xl border p-2" placeholder="sort_order" value={phraseForm.sortOrder} onChange={(e) => updatePhrase("sortOrder", Number(e.target.value) || 0)} />
          <select className="rounded-xl border p-2" value={phraseForm.role} onChange={(e) => updatePhrase("role", e.target.value)}>
            <option value="main">main</option>
            <option value="support">support</option>
          </select>
          <span />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className="rounded-xl border p-2" placeholder="start_char_index" value={phraseForm.startChar} onChange={(e) => updatePhrase("startChar", e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded-xl border p-2" placeholder="end_char_index" value={phraseForm.endChar} onChange={(e) => updatePhrase("endChar", e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded-xl border p-2" placeholder="start_sec" value={phraseForm.startSec} onChange={(e) => updatePhrase("startSec", e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded-xl border p-2" placeholder="end_sec" value={phraseForm.endSec} onChange={(e) => updatePhrase("endSec", e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
        <button className="btn-secondary" onClick={addPhrase}>Add phrase to pack</button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Link existing phrase</h2>
        <input
          className="w-full rounded-xl border p-2"
          placeholder="Search by slug or text"
          value={existingPhraseQuery}
          onChange={(e) => setExistingPhraseQuery(e.target.value)}
        />
        <div className="space-y-2">
          {existingPhrases.map((phrase) => (
            <div key={phrase.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
              <div>
                <p className="text-sm font-medium">{phrase.text}</p>
                <p className="text-xs text-slate-500">{phrase.slug}</p>
              </div>
              <button
                className="btn-secondary"
                disabled={linkedPhraseIds.has(phrase.id)}
                onClick={() => linkExistingPhrase(phrase.id)}
              >
                {linkedPhraseIds.has(phrase.id) ? "Linked" : "Link"}
              </button>
            </div>
          ))}
          {!existingPhrases.length && existingPhraseQuery.trim() ? <p className="text-xs text-slate-500">No phrases found.</p> : null}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Linked phrases</h2>
        <div className="space-y-3">
          {linkedPhrases.map((link) => (
            <div key={link.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="font-medium">{link.phrase?.text ?? "Unknown phrase"}</p>
              <p className="text-xs text-slate-500">{link.phrase?.slug ?? "-"}</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="rounded-xl border p-2" defaultValue={link.sort_order} onBlur={(e) => updateLink(link.id, { sort_order: Number(e.target.value) || 0 })} />
                <select className="rounded-xl border p-2" defaultValue={link.role} onChange={(e) => updateLink(link.id, { role: e.target.value })}>
                  <option value="main">main</option>
                  <option value="support">support</option>
                </select>
                <input type="number" className="rounded-xl border p-2" defaultValue={link.start_char_index ?? ""} placeholder="start_char_index" onBlur={(e) => updateLink(link.id, { start_char_index: e.target.value === "" ? null : Number(e.target.value) })} />
                <input type="number" className="rounded-xl border p-2" defaultValue={link.end_char_index ?? ""} placeholder="end_char_index" onBlur={(e) => updateLink(link.id, { end_char_index: e.target.value === "" ? null : Number(e.target.value) })} />
                <input type="number" className="rounded-xl border p-2" defaultValue={link.start_sec ?? ""} placeholder="start_sec" onBlur={(e) => updateLink(link.id, { start_sec: e.target.value === "" ? null : Number(e.target.value) })} />
                <input type="number" className="rounded-xl border p-2" defaultValue={link.end_sec ?? ""} placeholder="end_sec" onBlur={(e) => updateLink(link.id, { end_sec: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <button className="text-xs text-rose-600" onClick={() => removeLink(link.id)}>Unlink phrase</button>
            </div>
          ))}
          {!linkedPhrases.length ? <p className="text-xs text-slate-500">No linked phrases yet.</p> : null}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Pack audio upload</h2>
        <input type="file" accept="audio/*" onChange={(e) => onUploadPackAudio(e.target.files?.[0] ?? null)} />
        <p className="text-xs text-slate-500">Stored as packs/{"{pack_slug}"}/full/vN.ext in private bucket `audio`, with newest asset marked primary.</p>
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
