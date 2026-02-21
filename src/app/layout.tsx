import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolSaaS - School & Coaching Management",
  description: "Manage your school or coaching center with subscriptions and approvals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
