"use client";

import { useState } from "react";
import { hasSupabaseEnv, insertRows, updateRows, uploadAudio } from "@/lib/supabase/client";

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

      await updateRows("packs", `id=eq.${packId}`, packForm);
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
        start_char_index: typeof phraseForm.startChar === "number" ? phraseForm.startChar : null,
        end_char_index: typeof phraseForm.endChar === "number" ? phraseForm.endChar : null,
        start_sec: typeof phraseForm.startSec === "number" ? phraseForm.startSec : null,
        end_sec: typeof phraseForm.endSec === "number" ? phraseForm.endSec : null,
      });

      setMessage("Phrase + link created");
      setPhraseForm(emptyPhraseForm);
    });
  };

  const onUploadPackAudio = async (file: File | null) => {
    await runAction(async () => {
      if (!hasSupabaseEnv() || !packId || !file) throw new Error("Choose audio after creating the pack");
      const path = `packs/${packForm.slug}/full/v1.mp3`;

      await uploadAudio(path, file);
      await insertRows("audio_assets", {
        pack_id: packId,
        kind: "pack_full",
        storage_path: path,
        mime_type: file.type || "audio/mpeg",
        is_primary: true,
        version: 1,
      });

      setMessage("Pack audio uploaded");
    });
  };

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
        <h2 className="text-lg font-semibold">Pack audio upload</h2>
        <input type="file" accept="audio/*" onChange={(e) => onUploadPackAudio(e.target.files?.[0] ?? null)} />
        <p className="text-xs text-slate-500">Stored as packs/{'{pack_slug}'}/full/v1.mp3 in private bucket `audio`.</p>
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
