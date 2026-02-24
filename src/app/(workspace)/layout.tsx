"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MessageSquare, UsersRound, Pin, FileText, BriefcaseBusiness, Menu, X, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ChatInterface } from "@/components/ChatInterface";
import { useEffect, useState, useMemo } from "react";
import { QUOTES } from "@/constants/quotes";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isChatOpen, setIsChatOpen, hasCompletedDailyCard, setHasCompletedDailyCard, hasReports, setHasReports } = useAppStore();
  const [graphContext, setGraphContext] = useState<any>(null);
  const [dailyQuote, setDailyQuote] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Daily Quote Easter Egg Logic (Client-only to avoid hydration mismatch)
  useEffect(() => {
    const today = new Date();
    const dateString = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
    // Simple deterministic hash of the date string
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
      hash |= 0; 
    }
    const index = Math.abs(hash) % QUOTES.length;
    setDailyQuote(QUOTES[index]);
  }, []);

  // Fetch daily card status globally on mount
  useEffect(() => {
    if (hasCompletedDailyCard !== null) return;
    
    fetch('/api/cards')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.sessions) {
          const dailySession = data.sessions.find((s: any) => s.cardId === 'daily_gratitude');
          const isCompletedToday = dailySession && dailySession.messages.length > 0 && 
            new Date(dailySession.messages[dailySession.messages.length - 1].timestamp).toDateString() === new Date().toDateString();
          setHasCompletedDailyCard(!!isCompletedToday);
        } else {
          setHasCompletedDailyCard(false);
        }
      })
      .catch(() => setHasCompletedDailyCard(false));
  }, [hasCompletedDailyCard, setHasCompletedDailyCard]);

  // Fetch reports status globally on mount
  useEffect(() => {
    if (hasReports !== null) return;
    fetch('/api/synthesis')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.analyses) {
          setHasReports(Object.keys(data.analyses).length > 0);
        } else {
          setHasReports(false);
        }
      })
      .catch(() => setHasReports(false));
  }, [hasReports, setHasReports]);

  // Fetch graph context globally for Chat
  useEffect(() => {
    if (!isChatOpen) return; // Only fetch when the chat modal is actually opened

    Promise.all([
      fetch('/api/graph').then(res => res.ok ? res.json() : null),
      fetch('/api/cards').then(res => res.ok ? res.json() : null)
    ])
      .then(([graphData, cardsData]) => {
        setGraphContext({
          people: graphData?.nodes?.map((n: any) => ({ id: n.id, label: n.data.label, type: n.data.type, responses: n.data.responses })) || [],
          relationships: graphData?.edges?.map((e: any) => ({ source: e.source, target: e.target, responses: e.data?.responses || {} })) || [],
          cardSessions: cardsData?.sessions || []
        });
      })
      .catch(console.error);
  }, [isChatOpen, pathname]); 

  const navLinks = [
    { name: "Relationships", href: "/relationships", icon: UsersRound },
    { name: "Career", href: "/career", icon: BriefcaseBusiness },
    { name: "Cards", href: "/cards", icon: Pin },
    { name: "Reports", href: "/reports", icon: FileText },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#FFFEFC] text-stone-900 overflow-hidden">
      <header className="px-4 md:px-6 py-3 bg-white border-b border-stone-200 flex justify-between items-center z-30 shadow-sm shrink-0 relative">
        <div className="flex items-center gap-4 md:gap-12">
          <div className="flex items-center gap-2 text-xl font-bold text-stone-800">
            <div className="relative group flex items-center">
              <span className="cursor-help">🧠</span>
              {/* Custom Tooltip - Only shows on hover of the brain */}
              {dailyQuote && (
                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-stone-900 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed border border-stone-800">
                  <div className="absolute -top-1 left-3 w-2 h-2 bg-stone-900 rotate-45" />
                  {dailyQuote}
                </div>
              )}
            </div>
            <Link href="/relationships" className="hover:text-stone-600 transition-colors">
              Bowen
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
            {navLinks.map((link, index) => {
              const isActive = pathname.startsWith(link.href);
              const Icon = link.icon;
              
              // Onboarding & Habit Badges Logic
              const showRelationshipsBadge = link.name === "Relationships" && graphContext?.people?.length < 2;
              const showCareerBadge = link.name === "Career" && graphContext?.people?.length >= 2; // For now, simple assumption that they should check out career next
              const showCardsBadge = link.name === "Cards" && hasCompletedDailyCard === false;
              const showReportsBadge = link.name === "Reports" && hasReports === false && graphContext?.people?.length >= 2;

              return (
                <div key={link.name} className="flex items-center gap-2">
                  <Link 
                    href={link.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      isActive ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                    }`}
                  >
                    <div className="relative">
                      {showCardsBadge && (
                        <span className="absolute -top-1 -left-2.25 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse z-10" />
                      )}
                      {(showRelationshipsBadge || showCareerBadge || showReportsBadge) && (
                        <span className="absolute -top-1 -left-2.25 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse z-10" />
                      )}
                      <Icon size={16} />
                    </div>
                    {link.name}
                  </Link>
                  {link.name === "Career" && (
                    <div className="w-px h-5 bg-stone-300 mx-1 rounded-full opacity-50" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer relative"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            {hasCompletedDailyCard === false && !isMobileMenuOpen && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse z-10" />
            )}
            {(graphContext?.people?.length < 2 || hasReports === false) && !isMobileMenuOpen && hasCompletedDailyCard !== false && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse z-10" />
            )}
          </button>

          <button 
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#F7F7F5] text-stone-800 rounded-xl hover:bg-stone-100 font-bold text-sm transition-colors shadow-sm cursor-pointer"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <div className="w-px h-6 bg-stone-200 hidden sm:block" />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[65px] left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-20 flex flex-col p-4 gap-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            
            // Onboarding & Habit Badges Logic for Mobile
            const showRelationshipsBadge = link.name === "Relationships" && graphContext?.people?.length < 2;
            const showCareerBadge = link.name === "Career" && graphContext?.people?.length >= 2;
            const showCardsBadge = link.name === "Cards" && hasCompletedDailyCard === false;
            const showReportsBadge = link.name === "Reports" && hasReports === false && graphContext?.people?.length >= 2;

            return (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                }`}
              >
                <div className="relative">
                  {showCardsBadge && (
                    <span className="absolute -top-1 -left-2.25 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse z-10" />
                  )}
                  {(showRelationshipsBadge || showCareerBadge || showReportsBadge) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse z-10" />
                  )}
                  <Icon size={18} />
                </div>
                {link.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Onboarding Alert Banners */}
      {pathname.startsWith("/relationships") && graphContext?.people?.length < 2 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center justify-center gap-3 text-blue-800 text-sm shadow-sm z-20 shrink-0 animate-in slide-in-from-top-2">
          <Info size={16} className="shrink-0 text-blue-600" />
          <p className="font-medium">
            Add a few important people in your life, and draw how they're connected.
          </p>
        </div>
      )}
      
      {pathname.startsWith("/career") && graphContext?.people?.length >= 2 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center justify-center gap-3 text-blue-800 text-sm shadow-sm z-20 shrink-0 animate-in slide-in-from-top-2">
          <Info size={16} className="shrink-0 text-blue-600" />
          <p className="font-medium">
            Enter in some information about your career history and goals.
          </p>
        </div>
      )}

      {pathname.startsWith("/reports") && hasReports === false && graphContext?.people?.length >= 2 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center justify-center gap-3 text-blue-800 text-sm shadow-sm z-20 shrink-0 animate-in slide-in-from-top-2">
          <Info size={16} className="shrink-0 text-blue-600" />
          <p className="font-medium">
            Ready for a deep dive? Choose an analysis framework to synthesize your current graph data.
          </p>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden bg-[#FFFEFC]/50">
        {children}
      </main>

      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        graphContext={graphContext} 
      />
    </div>
  );
}