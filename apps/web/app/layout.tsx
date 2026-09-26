import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tessera.ai",
  description: "Outcome-aware hybrid intelligence control plane",
};

// Inline script prevents theme flash before React hydrates
const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('tessera-theme');
    var p=(!t&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';
    document.documentElement.setAttribute('data-theme',t||p);
  }catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            TESSERA<span>.AI</span>
          </Link>
          <nav>
            <Link href="/">Overview</Link>
            <Link href="/tasks">Tasks</Link>
            <Link href="/quantum">Quantum Lab</Link>
          </nav>
          <div className="topbar-right">
            <div className="status configured">
              <i />
              Bob integration configured
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
