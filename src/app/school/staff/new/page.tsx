import Link from "next/link";
import { StaffForm } from "@/app/components/StaffForm";

export default function NewStaffPage() {
  return (
    <>
      <div className="mb-6">
        <Link href="/school/staff" className="text-sm text-primary-600 hover:underline">← Staff</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Add staff</h1>
      <div className="mt-6 card max-w-xl">
        <StaffForm />
      </div>
    </>
  );
}
