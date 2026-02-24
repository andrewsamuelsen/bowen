"use client";

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, BookOpen, Brain, GitMerge, Users, MessageSquareQuote, AlertTriangle, Puzzle, ChevronLeft } from 'lucide-react';
import { generateAnalysis, FRAMEWORKS, type AnalysisFramework } from '@/lib/gemini';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '@/lib/store';

interface SavedAnalysis {
  report: string;
  timestamp: number;
  graphHash: string;
}

export default function ReportsPage() {
  const { setHasReports } = useAppStore();
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedFramework, setSelectedFramework] = useState<AnalysisFramework | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Record<string, SavedAnalysis>>({});
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [graphRes, cardsRes] = await Promise.all([
          fetch('/api/graph'),
          fetch('/api/cards')
        ]);
        
        const g = await graphRes.json();
        const c = await cardsRes.json();
        
        if (g) {
          setGraphData({
            people: g.nodes?.map((n: any) => ({ id: n.id, label: n.data.label, type: n.data.type, responses: n.data.responses })) || [],
            relationships: g.edges?.map((e: any) => ({ source: e.source, target: e.target, responses: e.data?.responses || {} })) || [],
            cardSessions: c.sessions || []
          });
        }
      } catch (e) {
        console.error("Failed to load graph/cards", e);
      }
    };
    fetchData();
  }, []);

  const currentGraphHash = graphData ? JSON.stringify(graphData).length.toString() + 
    graphData.people.length.toString() + 
    graphData.relationships.length.toString() : "";

  // Fetch analyses
  useEffect(() => {
    if (isHistoryLoaded) return;
    const fetchAnalyses = async () => {
      try {
        const res = await fetch('/api/synthesis');
        if (res.ok) {
          const data = await res.json();
          setAnalyses(data.analyses || {});
        }
      } catch (e) {
        console.error("Failed to load analyses", e);
      } finally {
        setIsInitialLoading(false);
        setIsHistoryLoaded(true);
      }
    };
    fetchAnalyses();
  }, [isHistoryLoaded]);

  // Save analyses (debounced)
  useEffect(() => {
    if (!isHistoryLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analyses })
        });
      } catch (e) {
        console.error("Failed to save analyses", e);
      }
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [analyses, isHistoryLoaded]);

  const handleRunAnalysis = async (framework: AnalysisFramework) => {
    if (!graphData) return;
    setLoading(true);
    setSelectedFramework(framework);
    
    let formattedHistory = "";
    let clinicalSummary = "";
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        clinicalSummary = data.clinicalSummary || "";
        const history = data.messages;
        if (Array.isArray(history)) {
          // Only pass unsummarized history to save tokens
          formattedHistory = history
            .filter((m: any) => !m.summarized)
            .map((m: any) => `${m.role.toUpperCase()}: ${m.text}`)
            .join('\n\n');
        }
      }
    } catch (e) {
      console.warn("Could not load chat history for synthesis", e);
    }

    try {
      const report = await generateAnalysis(graphData, framework, formattedHistory, clinicalSummary);
      setAnalyses(prev => ({
        ...prev,
        [framework]: {
          report,
          timestamp: Date.now(),
          graphHash: currentGraphHash
        }
      }));
      setHasReports(true);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (framework: AnalysisFramework) => {
    switch (framework) {
      case 'attachment': return <GitMerge className="text-blue-500" />;
      case 'ifs': return <Brain className="text-purple-500" />;
      case 'big5': return <BookOpen className="text-emerald-500" />;
      case 'family_systems': return <Users className="text-orange-500" />;
      case 'transactional': return <MessageSquareQuote className="text-rose-500" />;
      case 'mbti': return <Puzzle className="text-stone-600" />;
      default: return <Brain className="text-stone-500" />;
    }
  };

  const currentAnalysis = selectedFramework ? analyses[selectedFramework] : null;
  const isStale = currentAnalysis && currentAnalysis.graphHash !== currentGraphHash;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar Framework list */}
      <div className={`w-full md:w-80 border-r border-stone-200 bg-white overflow-y-auto p-4 space-y-3 ${selectedFramework ? 'hidden md:block' : 'block'}`}>
        <div className="mb-6 px-2 pt-2">
          <h2 className="text-xl font-bold text-stone-900">Reports</h2>
          <p className="text-sm text-stone-500 mt-1">Run therapeutic frameworks against your context.</p>
        </div>
        
        {Object.entries(FRAMEWORKS).map(([id, framework]) => (
          <button
            key={id}
            onClick={() => setSelectedFramework(id as AnalysisFramework)}
            className={`w-full text-left p-4 rounded-xl transition-all border cursor-pointer ${
              selectedFramework === id 
                ? 'bg-[#F7F7F5] border-stone-300 shadow-sm ring-2 ring-stone-400/10' 
                : 'bg-[#FFFEFC] border-transparent hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                {getIcon(id as AnalysisFramework)}
                <span className="font-bold text-stone-800 text-sm">{framework.title}</span>
              </div>
              {analyses[id] && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Done</span>}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-2">{framework.description}</p>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto bg-[#FFFEFC] p-4 md:p-8 ${!selectedFramework ? 'hidden md:block' : 'block'}`}>
        {isInitialLoading || !graphData ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
            <Loader2 size={40} className="animate-spin text-stone-600" />
            <p className="font-medium">Loading reports...</p>
          </div>
        ) : !selectedFramework ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4 max-w-sm mx-auto text-center">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <BookOpen size={48} className="text-stone-300" />
            </div>
            <p className="font-medium text-stone-500">Select a framework from the sidebar to view or generate a detailed report.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 md:hidden mb-4">
              <button onClick={() => setSelectedFramework(null)} className="p-2 hover:bg-stone-200 rounded-lg cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              <h2 className="font-bold">{FRAMEWORKS[selectedFramework].title}</h2>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">{FRAMEWORKS[selectedFramework].title}</h2>
                <p className="text-stone-500 text-sm mt-1">{FRAMEWORKS[selectedFramework].description}</p>
              </div>
              <button 
                onClick={() => handleRunAnalysis(selectedFramework)}
                disabled={loading}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-900 font-bold transition-all shadow-sm cursor-pointer disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                {currentAnalysis ? 'Re-run Report' : 'Generate Report'}
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-stone-500">
                <Loader2 size={40} className="animate-spin text-stone-600" />
                <p className="font-medium">Analyzing relationships and synthesizing insights...</p>
              </div>
            ) : currentAnalysis ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isStale && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 shadow-sm">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <p className="text-sm font-bold">Your relationship graph has changed since this report was generated.</p>
                  </div>
                )}
                <div className="markdown-content text-stone-800 bg-white p-8 md:p-12 rounded-2xl border border-stone-200 shadow-sm">
                  <ReactMarkdown components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 mb-6 mt-8 border-b pb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-4 mt-8" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg md:text-xl font-bold text-stone-900 mb-3 mt-6" {...props} />,
                    p: ({node, ...props}) => <p className="mb-5 last:mb-0 leading-relaxed text-stone-700 md:text-lg" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-5 space-y-2 text-stone-700 md:text-lg marker:text-stone-500" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-5 space-y-2 text-stone-700 md:text-lg marker:text-stone-500" {...props} />,
                    li: ({node, ...props}) => <li className="pl-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-stone-900 bg-[#F7F7F5]/50 px-1 rounded" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-stone-600" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-5 py-2 my-6 text-stone-600 italic bg-[#FFFEFC] rounded-r-xl" {...props} />,
                  }}>{currentAnalysis.report}</ReactMarkdown>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
