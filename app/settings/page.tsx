"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
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
    <div>
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="section space-y-4">
        <div className="flex gap-6">
          <button className="btn" onClick={onExport} aria-label="Export progress">
            <Icon name="download" />
          </button>
          <button className="btn" onClick={onImport} aria-label="Import progress">
            <Icon name="upload" />
          </button>
          <button className="btn" onClick={onReset} aria-label="Reset progress">
            <Icon name="refresh" />
          </button>
        </div>
        <textarea
          className="min-h-36 w-full border border-slate-200 p-3 font-mono text-xs"
          placeholder="Paste exported JSON"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
        />
      </section>

      <section className="section text-sm text-slate-500">
        <p>Lilt MVP v0.1 · local-first phrase learning app.</p>
        {message && <p className="pt-2 text-ink">{message}</p>}
      </section>
    </div>
  );
}
