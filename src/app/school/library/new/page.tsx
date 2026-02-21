import Link from "next/link";
import { AddBookForm } from "@/app/components/AddBookForm";

export default function NewLibraryBookPage() {
  return (
    <>
      <div className="mb-6">
        <Link href="/school/library" className="text-sm text-primary-600 hover:underline">← Library</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Add book</h1>
      <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AddBookForm />
      </div>
    </>
  );
}
