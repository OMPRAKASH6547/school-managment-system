"use client";

import { useEffect, useState } from "react";
import { SearchablePaginatedSelect, type SearchableSelectItem } from "@/app/components/SearchablePaginatedSelect";

const PAYER_ITEMS: SearchableSelectItem[] = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Teacher / Staff" },
];

const STATUS_ITEMS: SearchableSelectItem[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export function PaymentVerificationFilterForm({
  q,
  payerType,
  status,
}: {
  q: string;
  payerType: string;
  status: string;
}) {
  const [pt, setPt] = useState(payerType);
  const [st, setSt] = useState(status);

  useEffect(() => {
    setPt(payerType);
    setSt(status);
  }, [payerType, status]);

  return (
    <form className="grid gap-3 border-b border-slate-200 px-6 py-4 sm:grid-cols-5" method="get">
      <input name="q" defaultValue={q} placeholder="Name / roll no / employee id" className="input-field" />
      <SearchablePaginatedSelect
        items={PAYER_ITEMS}
        value={pt}
        onChange={setPt}
        emptyLabel="All payer types"
        formInputName="payerType"
      />
      <SearchablePaginatedSelect
        items={STATUS_ITEMS}
        value={st}
        onChange={setSt}
        emptyLabel="All"
        formInputName="status"
      />
      <button className="btn-primary" type="submit">
        Filter
      </button>
      <a className="btn-secondary" href="/school/payment-verification">
        Reset
      </a>
    </form>
  );
}
