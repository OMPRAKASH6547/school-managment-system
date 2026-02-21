"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoUploadForm({
  currentLogo,
  organizationId,
}: {
  currentLogo: string | null;
  organizationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      const res = await fetch("/api/school/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-4">
        {currentLogo ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border-2 border-slate-200 bg-white">
            <Image src={currentLogo} alt="Logo" fill className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
            No logo
          </div>
        )}
        <div>
          <label className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            {loading ? "Uploading..." : "Upload logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={loading}
              onChange={handleChange}
            />
          </label>
          <p className="mt-1 text-xs text-slate-500">PNG, JPG or WebP. Used on all PDFs.</p>
        </div>
      </div>
    </div>
  );
}
