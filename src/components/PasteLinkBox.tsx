"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseYouTubeId } from "@/lib/youtube/parse";

export function PasteLinkBox() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const id = parseYouTubeId(String(formData.get("url") ?? ""));
    if (!id) {
      setError("Link YouTube không hợp lệ.");
      return;
    }
    setError(null);
    router.push(`/watch/${id}`);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          name="url"
          required
          placeholder="Dán link YouTube (youtube.com/watch?v=…, youtu.be/…)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent"
        >
          Mở
        </button>
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </form>
  );
}
