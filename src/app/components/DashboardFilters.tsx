"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";

const GENDER_ITEMS: SearchableSelectItem[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const STATUS_ITEMS: SearchableSelectItem[] = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left" },
];

export function DashboardFilters({
  classes,
}: {
  classes: { id: string; name: string; section: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const classVal = searchParams.get("class") ?? "";
  const sectionVal = searchParams.get("section") ?? "";
  const genderVal = searchParams.get("gender") ?? "";
  const statusVal = searchParams.get("status") ?? "";

  function updateFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/school?${p.toString()}`);
  }

  const classItems = useMemo(
    () => classes.map((c) => ({ value: c.id, label: `${c.name}${c.section ? ` · ${c.section}` : ""}` })),
    [classes],
  );

  const sectionItems = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) {
      const s = c.section?.trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [classes]);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="w-full sm:w-auto sm:min-w-[160px]">
        <SearchablePaginatedSelect
          items={classItems}
          value={classVal}
          onChange={(v) => updateFilter("class", v)}
          emptyLabel="All Classes"
          className="w-full sm:w-auto"
          aria-label="Filter by class"
        />
      </div>
      <div className="w-full sm:w-auto sm:min-w-[140px]">
        <SearchablePaginatedSelect
          items={sectionItems}
          value={sectionVal}
          onChange={(v) => updateFilter("section", v)}
          emptyLabel="All Sections"
          className="w-full sm:w-auto"
          aria-label="Filter by section"
        />
      </div>
      <div className="w-full sm:w-auto sm:min-w-[140px]">
        <SearchablePaginatedSelect
          items={GENDER_ITEMS}
          value={genderVal}
          onChange={(v) => updateFilter("gender", v)}
          emptyLabel="All Gender"
          className="w-full sm:w-auto"
          aria-label="Filter by gender"
        />
      </div>
      <div className="w-full sm:w-auto sm:min-w-[140px]">
        <SearchablePaginatedSelect
          items={STATUS_ITEMS}
          value={statusVal}
          onChange={(v) => updateFilter("status", v)}
          emptyLabel="All Status"
          className="w-full sm:w-auto"
          aria-label="Filter by status"
        />
      </div>
      <input
        type="month"
        value={month}
        onChange={(e) => updateFilter("month", e.target.value)}
        className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-2 py-2 sm:px-3 text-xs sm:text-sm text-slate-700 shadow-sm"
      />
    </div>
  );
}
