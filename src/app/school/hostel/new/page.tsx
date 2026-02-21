import Link from "next/link";
import { HostelRoomForm } from "@/app/components/HostelRoomForm";

export default function NewHostelRoomPage() {
  return (
    <>
      <div className="mb-6">
        <Link href="/school/hostel" className="text-sm text-primary-600 hover:underline">← Hostel</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Add room</h1>
      <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <HostelRoomForm />
      </div>
    </>
  );
}
