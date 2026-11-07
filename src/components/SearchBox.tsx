import Form from "next/form";

export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  return (
    <Form action="/search" className="flex gap-2">
      <input
        name="q"
        type="search"
        required
        defaultValue={defaultValue}
        placeholder="Tìm video tiếng Nhật… (vd: 日本語 ポッドキャスト)"
        className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Tìm
      </button>
    </Form>
  );
}
