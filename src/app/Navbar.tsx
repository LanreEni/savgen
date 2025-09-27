// Navbar Component
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/register", label: "📝 Register" },
  { href: "/tests", label: "🧪 Tests" },
  { href: "/search", label: "🔎 Search" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-gradient-to-r from-black via-red-950 to-black backdrop-blur-3xl sticky top-0 z-50 shadow-2xl border-b border-red-800/30">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-red-500/10 to-red-600/5 animate-pulse"></div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-2 left-1/4 w-1 h-1 bg-red-400/60 rounded-full animate-ping"></div>
        <div className="absolute top-4 right-1/3 w-1 h-1 bg-rose-400/60 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-red-300/60 rounded-full animate-ping delay-700"></div>
      </div>

      <div className="relative max-w-7xl mx-auto flex items-center justify-between py-5 px-4 sm:px-6 lg:px-8">
        {/* Logo / Title */}
        <Link href="/">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent hover:from-red-300 hover:to-rose-300 transition-colors duration-300">
            SAVE THE NEXT GENERATION
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 lg:gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-medium cursor-pointer transition-all duration-300 relative overflow-hidden group text-sm lg:text-base
                    ${
                      isActive
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30"
                        : "text-slate-200 hover:text-white"
                    }`}
                >
                  {!isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-red-500/40 to-red-600/30 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl blur-sm"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-red-700/20 via-red-600/30 to-red-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                    </>
                  )}
                  <span className="relative z-10">{link.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-2 py-2 rounded-xl font-semibold cursor-pointer transition-all duration-300 relative overflow-hidden group text-xs
                    ${
                      isActive
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/40"
                        : "text-slate-300 hover:text-white"
                    }`}
                >
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/25 to-red-700/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  )}
                  <span className="relative z-10">{link.label.split(' ')[0]}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
