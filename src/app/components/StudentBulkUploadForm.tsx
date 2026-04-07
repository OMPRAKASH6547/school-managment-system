"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudentBulkUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/school/students/bulk-upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Upload failed");
        return;
      }
      setMessage(`Created ${data.created} students. Failed ${data.failed}.`);
      router.refresh();
    } catch {
      setMessage("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-800">Bulk upload students (CSV)</p>
      <p className="mt-1 text-xs text-slate-500">
        Columns: firstName,lastName,rollNo,phone,email,classId,dateOfBirth,gender,fatherName,motherName,guardianPhone,address
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" className="btn-secondary" disabled={!file || loading} onClick={upload}>
          {loading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
