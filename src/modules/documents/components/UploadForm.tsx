"use client";

import { useRef, useState } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; fileName: string }
  | { status: "error"; message: string };

export function UploadForm() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file || file.size === 0) {
      setState({ status: "error", message: "Select a PDF file first." });
      return;
    }

    setState({ status: "uploading" });

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ error: "Upload failed." }));
      setState({ status: "error", message: body.error ?? "Upload failed." });
      return;
    }

    setState({ status: "success", fileName: file.name });
    form.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4"
    >
      <label
        htmlFor="file"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Upload a PDF
      </label>
      <input
        ref={fileInputRef}
        id="file"
        name="file"
        type="file"
        accept="application/pdf"
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
      />
      <button
        type="submit"
        disabled={state.status === "uploading"}
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {state.status === "uploading" ? "Uploading…" : "Upload"}
      </button>
      {state.status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {state.fileName} uploaded successfully.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
