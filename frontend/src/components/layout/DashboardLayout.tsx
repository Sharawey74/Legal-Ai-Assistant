import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

interface Props {
  children: ReactNode;
  noPadding?: boolean;
}

const navLinks = [
  { name: "Dashboard",     path: "/documents", icon: "dashboard" },
  { name: "Case Research", path: "/chat",       icon: "gavel"     },
  { name: "History",       path: "/history",    icon: "history"   },
];

export default function DashboardLayout({ children, noPadding = false }: Props) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1326] text-white font-sans antialiased">

      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-[#080f1e] border-r border-white/5 z-50 shrink-0">

        {/* Brand */}
        <div className="px-6 py-7 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">LexIntelligence</p>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">Enterprise Legal AI</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 py-6 px-3 space-y-1">
          {navLinks.map(link => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-200 group relative
                  ${isActive
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-sm shadow-indigo-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
                )}
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Sign Out */}
        <div className="px-3 py-6 border-t border-white/5">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/10 group"
          >
            <span className="material-symbols-outlined text-[20px] text-slate-600 group-hover:text-red-400 transition-colors">logout</span>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <nav className="md:hidden fixed top-0 inset-x-0 z-50 h-16 bg-[#080f1e]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          </div>
          <span className="text-sm font-bold text-white">LexIntelligence</span>
        </div>
        <div className="flex items-center gap-4">
          {navLinks.map(link => (
            <Link key={link.name} to={link.path}>
              <span className={`material-symbols-outlined text-[22px] transition-colors ${location.pathname.startsWith(link.path) ? "text-indigo-400" : "text-slate-500"}`}>
                {link.icon}
              </span>
            </Link>
          ))}
          <button onClick={signOut}>
            <span className="material-symbols-outlined text-[22px] text-slate-500 hover:text-red-400 transition-colors">logout</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className={`flex-1 md:ml-64 overflow-y-auto pt-16 md:pt-0 ${noPadding ? "" : "p-6 md:p-10"} relative`}>
        {/* Ambient background glow */}
        <div className="pointer-events-none fixed inset-0 md:left-64 overflow-hidden z-0">
          <div className="absolute -top-32 right-0 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[100px]" />
        </div>
        <div className={`relative z-10 ${!noPadding ? "max-w-6xl mx-auto" : "h-full"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
