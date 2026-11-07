import Link from "next/link";
import { TOPICS } from "@/config/topics";

export function TopicTabs({ active }: { active?: string }) {
  const tabs = [{ slug: undefined, label: "Kênh tuyển chọn" }, ...TOPICS];
  return (
    <nav aria-label="Chủ đề" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {tabs.map((tab) => {
          const isActive = tab.slug === active;
          return (
            <li key={tab.slug ?? "all"}>
              <Link
                href={tab.slug ? `/?topic=${tab.slug}` : "/"}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors ${
                  isActive
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-card hover:border-accent"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
