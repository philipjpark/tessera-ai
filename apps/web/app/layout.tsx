import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata:Metadata={title:"Tessera.ai",description:"Outcome-aware hybrid intelligence control plane"};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>
  <header className="topbar"><Link href="/" className="brand">TESSERA<span>.AI</span></Link><nav><Link href="/">Overview</Link><Link href="/tasks">Tasks</Link><Link href="/quantum">Quantum Lab</Link></nav><div className="status"><i/> Bob connected</div></header>
  <main>{children}</main>
 </body></html>
}
