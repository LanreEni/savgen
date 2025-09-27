// Home Component
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
        {/* Hero Section */}
        <section className="text-center mb-12 mt-8">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent mb-2 leading-tight">
            Save the Next Generation
          </h2>
          <div className="text-base sm:text-lg text-rose-200 font-medium mt-2 mb-4 italic">
            “Our parents didn’t know, but now we know”
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid gap-6 sm:gap-8 lg:gap-12 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {/* Register */}
          <Link href="/register">
            <div className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-red-700/30 shadow-xl rounded-2xl p-6 sm:p-8 text-center cursor-pointer hover:shadow-red-600/20 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-sm overflow-hidden">
              {/* Multiple glow layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/25 via-rose-600/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">📝</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-red-400 mb-3 sm:mb-4 group-hover:text-red-300 transition-colors">
                  Register Patient
                </h3>
                <p className="text-sm sm:text-base text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Seamlessly add new patients with comprehensive details and secure ID assignment
                </p>
              </div>
              
              {/* Border glow effects */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-600/40 via-rose-600/30 to-red-600/40 opacity-0 group-hover:opacity-100 blur-sm -z-10 transition-opacity duration-700"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-600/20 to-red-600/30 opacity-0 group-hover:opacity-100 blur-lg -z-20 transition-opacity duration-500 delay-200"></div>
            </div>
          </Link>

          {/* Tests */}
          <Link href="/tests">
            <div className="group relative bg-gradient-to-br from-slate-900/90 via-red-950/80 to-slate-900/90 border border-red-800/30 shadow-2xl rounded-3xl p-6 sm:p-8 lg:p-12 text-center cursor-pointer hover:shadow-red-600/30 hover:shadow-2xl hover:-translate-y-4 hover:scale-105 transition-all duration-700 backdrop-blur-sm overflow-hidden">
              {/* Multiple glow layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/25 via-rose-600/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">🧪</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-red-400 mb-3 sm:mb-4 group-hover:text-red-300 transition-colors">
                  Record Tests
                </h3>
                <p className="text-sm sm:text-base text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Capture and store critical malaria and genotype test results with precision
                </p>
              </div>
              
              {/* Border glow effects */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-600/40 via-rose-600/30 to-red-600/40 opacity-0 group-hover:opacity-100 blur-sm -z-10 transition-opacity duration-700"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-600/20 to-red-600/30 opacity-0 group-hover:opacity-100 blur-lg -z-20 transition-opacity duration-500 delay-200"></div>
            </div>
          </Link>

          {/* Search */}
          <Link href="/search">
            <div className="group relative bg-gradient-to-br from-slate-900/90 via-red-950/80 to-slate-900/90 border border-red-800/30 shadow-2xl rounded-3xl p-6 sm:p-8 lg:p-12 text-center cursor-pointer hover:shadow-red-600/30 hover:shadow-2xl hover:-translate-y-4 hover:scale-105 transition-all duration-700 backdrop-blur-sm overflow-hidden md:col-span-2 xl:col-span-1">
              {/* Multiple glow layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/25 via-rose-600/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">🔎</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-red-400 mb-3 sm:mb-4 group-hover:text-red-300 transition-colors">
                  Search Records
                </h3>
                <p className="text-sm sm:text-base text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Instantly access comprehensive patient histories and test results
                </p>
              </div>
              
              {/* Border glow effects */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-red-600/40 via-rose-600/30 to-red-600/40 opacity-0 group-hover:opacity-100 blur-sm -z-10 transition-opacity duration-700"></div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-600/20 to-red-600/30 opacity-0 group-hover:opacity-100 blur-lg -z-20 transition-opacity duration-500 delay-200"></div>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}