import { QuerySession } from "@/app/components/QuerySession";
import { UploadForm } from "@/modules/documents/components/UploadForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-10 px-16 py-32">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Open PDF RAG
        </h1>
        <UploadForm />
        <QuerySession />
      </main>
    </div>
  );
}
