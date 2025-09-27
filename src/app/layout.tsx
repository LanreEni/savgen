import "./globals.css";
import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-tr from-gray-50 to-rose-100 text-gray-900">
        {/* Navbar always on top */}
        <Navbar />

        {/* Page content */}
        <main className="max-w-5xl mx-auto px-6 pb-16 pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
