import { BookOpen, CheckCircle2, Target, TrendingUp, Layers, ExternalLink } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-brand-900/40">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>TomeStack</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">
                  Next.js 14
                </span>
              </h1>
              <p className="text-xs text-gray-400">The Series Completionist & Book Edition Tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/MatthiasLew/TomeStack"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-gray-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            Step 1 Complete: Next.js 14 App Router Initialized
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Never lose track of a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-400">book series</span> again.
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            TomeStack tracks your physical shelves, distinguishes hardcover from paperback editions,
            detects missing volumes in your sagas, and hunts real-time bookstore discounts.
          </p>
        </div>

        {/* Feature Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-glass p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Tracked Series</p>
              <p className="text-2xl font-bold text-white mt-1">Multi-Volume</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="card-glass p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Editions Tracking</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">Hardcover / Soft</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="card-glass p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Missing Radar</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">Completionist</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
          </div>

          <div className="card-glass p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Price Aggregator</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">Polish Bookstores</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Prototype info card */}
        <div className="card-glass p-6 rounded-2xl border-brand-500/20 bg-gradient-to-b from-gray-900/80 to-gray-950/80">
          <h3 className="text-lg font-bold text-white mb-2">Interactive Mockup & Next Implementation Steps</h3>
          <p className="text-sm text-gray-300 mb-4">
            The standalone v2.2 prototype is available in the repository root as <code className="text-brand-400 bg-gray-900 px-1.5 py-0.5 rounded">index.html</code>. In Step 2, the components will be structured into reusable React components.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">TypeScript 5</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">Tailwind CSS 3</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">Lucide React</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">ESLint</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">ai-dev & freelance integration</span>
          </div>
        </div>
      </main>
    </div>
  );
}
