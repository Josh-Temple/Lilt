"use client";

import { useState } from "react";
import { progressStore } from "@/lib/progressStore";
import { useProgress } from "@/lib/useProgress";

export default function SettingsPage() {
  const { progress, update } = useProgress();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  if (!progress) return <p>Loading...</p>;

  const onExport = async () => {
    const payload = progressStore.export(progress);
    await navigator.clipboard.writeText(payload);
    setMessage("Progress copied to clipboard.");
  };

  const onImport = () => {
    try {
      const next = progressStore.import(importText);
      update(() => next);
      setMessage("Import completed.");
    } catch {
      setMessage("Import failed. Invalid JSON.");
    }
  };

  const onReset = () => {
    const next = progressStore.reset();
    update(() => next);
    setMessage("Progress reset.");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="card space-y-2">
        <h2 className="font-medium">Progress</h2>
        <button className="btn-secondary" onClick={onExport}>
          Export progress
        </button>
        <textarea
          className="min-h-32 w-full rounded-lg border p-2 font-mono text-xs"
          placeholder="Paste exported JSON"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
        />
        <button className="btn-secondary" onClick={onImport}>
          Import progress
        </button>
        <button className="btn-secondary" onClick={onReset}>
          Reset progress
        </button>
      </section>

      <section className="card">
        <h2 className="font-medium">App info</h2>
        <p className="text-sm text-slate-600">Lilt MVP v0.1 · local-first phrase learning app.</p>
        {message && <p className="pt-2 text-sm">{message}</p>}
      </section>
    </div>
  );
}
