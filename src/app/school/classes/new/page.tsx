import Link from "next/link";
import { ClassForm } from "@/app/components/ClassForm";

export default function NewClassPage() {
  return (
    <>
      <div className="mb-6">
        <Link href="/school/classes" className="text-sm text-primary-600 hover:underline">← Classes</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Add class</h1>
      <div className="mt-6 card max-w-xl">
        <ClassForm />
      </div>
    </>
  );
}
