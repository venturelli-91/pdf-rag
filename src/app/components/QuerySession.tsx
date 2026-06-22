"use client";

import { useId, useState } from "react";

interface Citation {
  documentName: string;
  pageNumber: number;
  passages: string[];
}

interface Turn {
  id: string;
  question: string;
  status: "loading" | "done" | "error";
  answer?: string;
  citations?: Citation[];
  error?: string;
}

export function QuerySession() {
  const [question, setQuestion] = useState("");
  const [blankError, setBlankError] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const inputId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();
    if (trimmed.length === 0) {
      setBlankError(true);
      return;
    }

    setBlankError(false);
    const id = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id, question: trimmed, status: "loading" },
    ]);
    setQuestion("");

    const response = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });
    const body = await response.json().catch(() => ({}));

    setTurns((current) =>
      current.map((turn) =>
        turn.id === id
          ? response.ok
            ? {
                ...turn,
                status: "done",
                answer: body.answer,
                citations: body.citations ?? [],
              }
            : {
                ...turn,
                status: "error",
                error: body.error ?? "Something went wrong.",
              }
          : turn,
      ),
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Ask a question about your documents
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Ask
          </button>
        </div>
        {blankError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Type a question first.
          </p>
        )}
      </form>

      <section
        aria-label="Question and answer history"
        className="flex flex-col gap-4"
      >
        {turns.map((turn) => (
          <article
            key={turn.id}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {turn.question}
            </p>
            {turn.status === "loading" && (
              <p className="text-sm text-zinc-500">Thinking…</p>
            )}
            {turn.status === "error" && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {turn.error}
              </p>
            )}
            {turn.status === "done" && (
              <>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {turn.answer}
                </p>
                {turn.citations && turn.citations.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {turn.citations.map((citation) => (
                      <li
                        key={`${citation.documentName}-${citation.pageNumber}`}
                        className="text-xs text-zinc-500"
                      >
                        <details>
                          <summary className="cursor-pointer">
                            {citation.documentName}, p. {citation.pageNumber}
                          </summary>
                          {citation.passages.map((passage) => (
                            <blockquote
                              key={passage}
                              className="mt-1 border-l-2 border-zinc-300 pl-2 dark:border-zinc-700"
                            >
                              {passage}
                            </blockquote>
                          ))}
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
