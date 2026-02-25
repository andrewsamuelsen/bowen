import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Metadata } from "next";
import { GitFork } from "lucide-react";

export const metadata: Metadata = {
  title: "Bowen - AI-Powered Relationship Synthesis",
  description: "Map your relationships, identify generational patterns, and uncover blind spots with expert AI analysis.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFFEFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-stone-200 inline-block mb-4">
          <span className="text-5xl">🧠</span>
        </div>
        <h1 className="text-5xl font-extrabold text-stone-900 tracking-tight">
          <span className="text-stone-800">Bowen</span>
        </h1>
        <p className="text-xl text-stone-600 leading-relaxed max-w-xl mx-auto">
          Visualize your relationships, identify generational patterns, and synthesize insights with AI.
        </p>

        {/* Video Demo */}
        <div className="max-w-2xl mx-auto w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-100">
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe 
              src="https://www.loom.com/embed/d00a19c1f01a48ec9697d09c0a45f228" 
              allowFullScreen 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>

        <div className="pt-4">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/relationships">
              <button className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold text-lg hover:bg-stone-900 transition-all shadow-lg shadow-stone-300 transform active:scale-95 cursor-pointer flex items-center gap-3 mx-auto">
                <GitFork className="w-5 h-5 text-yellow-400 -rotate-90" /> Start mapping your relationships
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              <Link href="/relationships">
                <button className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold text-lg hover:bg-stone-900 transition-all shadow-lg shadow-stone-300 transform active:scale-95 cursor-pointer flex items-center gap-3">
                  <GitFork className="w-5 h-5 text-yellow-400 -rotate-90" /> Start mapping your relationships
                </button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </div>
      
      <footer className="fixed bottom-8 text-stone-400 text-sm font-medium">
        Secure & Private • AI-Powered Insights
      </footer>
    </div>
  );
}
