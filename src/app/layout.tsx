import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWC - Smart School Cloud Platform",
  description: "Smart School Cloud Platform for managing schools and coaching institutes",
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
