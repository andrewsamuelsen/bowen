import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFFEFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-stone-200 inline-block mb-4">
          <span className="text-5xl">🧠</span>
        </div>
        <h1 className="text-5xl font-extrabold text-stone-900 tracking-tight">
          Therapy <span className="text-stone-800">Graph</span>
        </h1>
        <p className="text-xl text-stone-600 leading-relaxed">
          Visualize your relationships, identify generational patterns, and synthesize insights with AI. 
          Professional-grade tools for personal growth.
        </p>

        <div className="pt-4">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/relationships">
              <button className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold text-lg hover:bg-stone-900 transition-all shadow-lg shadow-stone-300 transform active:scale-95">
                Start Your Journey
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              <Link href="/relationships">
                <button className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold text-lg hover:bg-stone-900 transition-all shadow-lg shadow-stone-300 transform active:scale-95">
                  Go to Map
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
