import Link from "next/link";
import { BookProductForm } from "@/app/components/BookProductForm";

export default function NewBookProductPage() {
  return (
    <>
      <div className="mb-6">
        <Link href="/school/books" className="text-sm text-primary-600 hover:underline">← Books & copy</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Add product</h1>
      <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <BookProductForm />
      </div>
    </>
  );
}
