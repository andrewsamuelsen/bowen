"use client";

import { useState, useEffect, useRef, memo } from 'react';
import { Sparkles, PenTool, RefreshCw, X, Loader2, MessageSquare, Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { streamChat, formatGraphForLLM, ChatMessage as GeminiMessage } from '@/lib/gemini';
import { useAppStore } from '@/lib/store';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

// --- TYPES ---
type CardType = 'AI' | 'USER';

interface CardDef {
  id: string;
  type: CardType;
  title: string;
  category: string;
  icon: any;
  systemPrompt: string;
  description: string;
  isEvergreen?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface CardSession {
  cardId: string;
  messages: ChatMessage[];
}

// --- DATA ---
const CARDS: CardDef[] = [
  { 
    id: "blind_spots", 
    type: "AI", 
    title: "What are my blind spots?", 
    category: "Self-Discovery", 
    icon: Sparkles,
    systemPrompt: "What do you know about the user that they don't know about themselves? Use the relationship graph and reflection history to identify their primary blind spots. What are the patterns they aren't seeing? What is the 'elephant in the room' in their life? Be direct and constructive.",
    description: "Discover the patterns and realities you might be overlooking. We'll analyze your relationships to identify the 'elephant in the room' in your life."
  },
  { 
    id: "nasty_truths", 
    type: "AI", 
    title: "How might others misunderstand me?", 
    category: "Shadow Work", 
    icon: Sparkles,
    systemPrompt: "Based on the user's described traits and relationship dynamics, hypothesize how frustrated peers or family members might misinterpret or judge their actions. Be honest and clear about how their 'Shadow' might manifest to others, but maintain a focus on helping them understand these perceptions rather than tearing them down.",
    description: "Explore how your actions and traits might be perceived by those around you. We'll look at potential misinterpretations to help you understand your shadow."
  },
  { 
    id: "career_swot", 
    type: "AI", 
    title: "Life & Work SWOT", 
    category: "Career & Vision", 
    icon: Sparkles,
    systemPrompt: "Perform an insightful SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) of the user's life and work based on their graph and history. What are they underestimating? What are their most important challenges? Structure it clearly using markdown, maintaining an empowering yet grounded tone.",
    description: "A structured analysis of your Strengths, Weaknesses, Opportunities, and Threats. Uncover what you might be underestimating in your life and work."
  },
  { 
    id: "ruthless_audit", 
    type: "AI", 
    title: "Where am I holding myself back?", 
    category: "Career & Vision", 
    icon: Sparkles,
    systemPrompt: "Identify where the user might be getting in their own way. What are they avoiding or making excuses about? Where are they playing small? Provide a clear, actionable roadmap of what they need to focus on to reach their next level with precision and clarity.",
    description: "Identify the excuses, avoidance tactics, and self-limiting beliefs keeping you from your next level. Receive a clear, actionable roadmap for growth."
  },
  { 
    id: "shadow_lies", 
    type: "AI", 
    title: "The stories I tell myself", 
    category: "Shadow Work", 
    icon: Sparkles,
    systemPrompt: "What comforting narratives does the user tell themselves to avoid facing difficult truths? Analyze their graph for contradictions or defensive patterns. Point them out clearly and kindly, with the goal of helping them find liberation through self-honesty.",
    description: "Examine the comforting narratives you use to avoid difficult truths. We'll gently uncover contradictions in your relationship patterns."
  },
  { 
    id: "secret_judgments", 
    type: "AI", 
    title: "What do I secretly judge others for?", 
    category: "Shadow Work", 
    icon: Sparkles,
    systemPrompt: "Analyze the user's conflicts and judgments of others in their graph. Apply the concept of 'Projection' to identify which of these traits the user might actually struggle with themselves. Help them integrate this shadow gently but firmly.",
    description: "Investigate 'Projection'. We'll explore if the traits you find frustrating in others are actually reflections of your own inner struggles."
  },
  { 
    id: "vision_5yr", 
    type: "AI", 
    title: "Where am I in 5 years?", 
    category: "Career & Vision", 
    icon: Sparkles,
    systemPrompt: "Based on everything you know about the user, where do you see them in five years? Project two realistic timelines: one where they continue their current comfortable patterns, and one where they take courageous steps to address the growth areas you've discussed.",
    description: "Project two realistic timelines for your life: one where you maintain your current patterns, and one where you take courageous steps toward growth."
  },
  { 
    id: "shadow_pretend", 
    type: "AI", 
    title: "What am I pretending to care about?", 
    category: "Shadow Work", 
    icon: Sparkles,
    systemPrompt: "Identify what the user is pretending to care about out of obligation rather than genuine desire. Look for enmeshed relationships or 'Pleaser' dynamics. Help them find the courage to let go of performing care for things that drain them.",
    description: "Identify obligations and 'Pleaser' dynamics in your life. Find the courage to let go of performing care for things that genuinely drain you."
  },
  { 
    id: "unfollowed_advice", 
    type: "AI", 
    title: "Advice I give but don't follow", 
    category: "Self-Discovery", 
    icon: Sparkles,
    systemPrompt: "Examine the 'Advisor' or 'Mediator' roles the user plays. What advice do they consistently give others that they struggle to follow themselves? Help them uncover the core hesitation preventing them from taking their own medicine.",
    description: "Reflect on the wisdom you freely offer to others but struggle to apply to yourself. Uncover the core hesitations holding you back."
  },
  { 
    id: "unasked_question", 
    type: "AI", 
    title: "The question I'm avoiding", 
    category: "Self-Discovery", 
    icon: Sparkles,
    systemPrompt: "Look deep into the user's graph and reflections to find the core tension they are tip-toeing around. Formulate the one impactful question they might be hesitant to ask themselves, but that would unlock the most clarity and growth.",
    description: "Find the core tension you are tip-toeing around. We'll formulate the one impactful question that could unlock the most clarity for you."
  },
  { 
    id: "scary_sacrifice", 
    type: "USER", 
    title: "What am I willing to sacrifice?", 
    category: "Career & Vision", 
    icon: PenTool,
    systemPrompt: "The user is exploring what they are willing to let go of (comfort, certain expectations, approval) to pursue work that feels truly meaningful and challenging. Acknowledge their response, and ask a follow-up question: based on their graph, what specific comfort zone will be the hardest to step out of?",
    description: "Reflect on what comforts, expectations, or approval you are willing to let go of to pursue truly meaningful work."
  },
  { 
    id: "approval_chasing", 
    type: "AI", 
    title: "Whose approval am I still chasing?", 
    category: "Shadow Work", 
    icon: Sparkles,
    systemPrompt: "Identify the figures in the user's graph whose approval they might still be subconsciously seeking. Describe how this pursuit might be shaping their life, and contrast it with the more authentic path they could take if they let that need go.",
    description: "Identify whose expectations are subconsciously shaping your life. Contrast this pursuit with the authentic path you could take if you let it go."
  },
  { 
    id: "final_projects", 
    type: "AI", 
    title: "My final three projects", 
    category: "Career & Vision", 
    icon: Sparkles,
    systemPrompt: "If the user only had three big meaningful projects left in them, what could they be? Synthesize their strengths, recurring themes, and passions to suggest three impactful endeavors that would truly challenge and fulfill them.",
    description: "If you only had three big, meaningful projects left, what would they be? We'll synthesize your strengths and passions to suggest impactful endeavors."
  },
  { 
    id: "daily_gratitude", 
    type: "USER", 
    title: "Daily Gratitude", 
    category: "Daily Alignment", 
    icon: RefreshCw,
    systemPrompt: "The user has shared what they are grateful for. Briefly acknowledge it, validate the feeling, and tie it back positively to their relationship graph context if applicable. Keep it to 1-2 sentences.",
    description: "Take a moment to align yourself. List three things you are grateful for today, and we'll tie them back positively to your broader life context.",
    isEvergreen: true
  },
];

const CATEGORIES = ["All", "Daily Alignment", "Self-Discovery", "Shadow Work", "Career & Vision"];

// --- COMPONENTS ---

const ChatMessageBubble = memo(({ msg, isLoading, isLast }: { msg: ChatMessage, isLoading: boolean, isLast: boolean }) => {
  const isEmptyModel = msg.role === 'model' && !msg.text.trim();
  if (isEmptyModel && (!isLoading || !isLast)) return null;

  return (
    <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'model' && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-stone-800 shrink-0 mt-1 shadow-sm">
          {isEmptyModel ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        </div>
      )}
      <div className={`rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed max-w-[85%] ${
        msg.role === 'user' 
          ? 'bg-stone-900 text-white rounded-br-none shadow-md' 
          : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
      }`}>
        {msg.role === 'user' ? (
          msg.text
        ) : isEmptyModel ? (
          <span className="text-stone-400 italic flex items-center gap-2">Synthesizing<span className="animate-pulse">...</span></span>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown components={{
              h1: ({node, ...props}) => <h1 className="text-xl font-bold text-stone-900 mb-4 mt-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold text-stone-900 mb-3 mt-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-base font-bold text-stone-900 mb-2 mt-4" {...props} />,
              p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="pl-1" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-stone-900 bg-[#F7F7F5]/50 px-1 rounded" {...props} />,
            }}>{msg.text}</ReactMarkdown>
          </div>
        )}
      </div>
      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 shrink-0 mt-1 shadow-inner">
          <PenTool size={14} />
        </div>
      )}
    </div>
  );
});
ChatMessageBubble.displayName = 'ChatMessageBubble';

export default function CardsPage() {
  const { hasCompletedDailyCard, setHasCompletedDailyCard } = useAppStore();
  const [filter, setFilter] = useState("All");
  const [sessions, setSessions] = useState<CardSession[]>([]);
  const [graphContext, setGraphContext] = useState<any>(null);
  const [chatContext, setChatContext] = useState<{ clinicalSummary: string, formattedHistory: string } | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/graph').then(r => r.ok ? r.json() : null),
      fetch('/api/cards').then(r => r.ok ? r.json() : null),
      fetch('/api/chat/history').then(r => r.ok ? r.json() : null)
    ]).then(([graphData, cardsData, chatData]) => {
      if (graphData) {
        setGraphContext({
          people: graphData.nodes?.map((n: any) => ({ id: n.id, label: n.data.label, type: n.data.type, responses: n.data.responses })) || [],
          relationships: graphData.edges?.map((e: any) => ({ source: e.source, target: e.target, responses: e.data?.responses || {} })) || []
        });
      }
      if (cardsData?.sessions) {
        setSessions(cardsData.sessions);
      }
      if (chatData) {
        let unsummarizedHistory = "";
        if (Array.isArray(chatData.messages)) {
          unsummarizedHistory = chatData.messages
            .filter((m: any) => !m.summarized)
            .map((m: any) => `${m.role.toUpperCase()}: ${m.text}`)
            .join('\n\n');
        }
        setChatContext({
          clinicalSummary: chatData.clinicalSummary || "",
          formattedHistory: unsummarizedHistory
        });
      }
      setIsDataLoaded(true);
    }).catch(console.error);
  }, []);

  // Save changes
  useEffect(() => {
    if (!isDataLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions })
        });
      } catch (e) {
        console.error("Failed to save cards", e);
      }
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [sessions, isDataLoaded]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, isLoading, activeCardId]);

  const activeCard = CARDS.find(c => c.id === activeCardId);
  const activeSession = sessions.find(s => s.cardId === activeCardId) || { cardId: activeCardId || "", messages: [] };

  const handleGenerateAI = async () => {
    if (!activeCard || isLoading) return;
    setIsLoading(true);

    const modelMsgId = Date.now().toString();
    const newSession = { ...activeSession };
    
    newSession.messages = [...newSession.messages, {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now()
    }];

    updateSession(newSession);

    try {
      let fullResponse = "";
      const sysPrompt = `
        ${activeCard.systemPrompt}
        
        USER GRAPH CONTEXT:
        ${formatGraphForLLM(graphContext)}

        ${chatContext?.clinicalSummary ? `CLINICAL SUMMARY OF HISTORY:\n${chatContext.clinicalSummary}\n\n` : ""}
        ${chatContext?.formattedHistory ? `RECENT CHAT CONTEXT (TODAY):\n${chatContext.formattedHistory}\n\n` : ""}

        INSTRUCTIONS:
        - Incorporate the clinical summary and recent chat history into your analysis if relevant.
        - Keep your responses to a few paragraphs unless specifically necessary.
      `;

      // Pass previous history for context
      const historyForApi: GeminiMessage[] = activeSession.messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      await streamChat("Generate insight.", historyForApi, sysPrompt, (chunk) => {
        fullResponse += chunk.replace(/\n/g, '\n\n');
        setSessions(prev => prev.map(s => {
          if (s.cardId === activeCard.id) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === modelMsgId ? { ...m, text: fullResponse } : m)
            };
          }
          return s;
        }));
      });
    } catch (e) {
      console.error(e);
      setSessions(prev => prev.map(s => {
        if (s.cardId === activeCard.id) {
          return {
            ...s,
            messages: s.messages.map(m => m.id === modelMsgId ? { ...m, text: "An error occurred while synthesizing." } : m)
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async () => {
    if (!inputText.trim() || !activeCard || isLoading) return;
    
    const textToSend = inputText;
    setInputText("");
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    let newSession = { ...activeSession };
    newSession.messages = [...newSession.messages, userMsg];
    updateSession(newSession);

    const modelMsgId = (Date.now() + 1).toString();
    newSession.messages = [...newSession.messages, {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now()
    }];
    updateSession(newSession);

    try {
      let fullResponse = "";
      const sysPrompt = `
        ${activeCard.systemPrompt}
        
        USER GRAPH CONTEXT:
        ${formatGraphForLLM(graphContext)}

        ${chatContext?.clinicalSummary ? `CLINICAL SUMMARY OF HISTORY:\n${chatContext.clinicalSummary}\n\n` : ""}
        ${chatContext?.formattedHistory ? `RECENT CHAT CONTEXT (TODAY):\n${chatContext.formattedHistory}\n\n` : ""}

        INSTRUCTIONS:
        - Incorporate the clinical summary and recent chat history into your analysis if relevant.
        - Keep your responses to a few paragraphs unless specifically necessary.
      `;

      const historyForApi: GeminiMessage[] = newSession.messages.filter(m => m.id !== modelMsgId).map(m => ({
        role: m.role,
        text: m.text
      }));

      await streamChat(textToSend, historyForApi.slice(0, -1), sysPrompt, (chunk) => {
        fullResponse += chunk.replace(/\n/g, '\n\n');
        setSessions(prev => prev.map(s => {
          if (s.cardId === activeCard.id) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === modelMsgId ? { ...m, text: fullResponse } : m)
            };
          }
          return s;
        }));
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSession = (newSession: CardSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.cardId === newSession.cardId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSession;
        return copy;
      }
      return [...prev, newSession];
    });

    // Check if we just updated an evergreen card
    const cardDef = CARDS.find(c => c.id === newSession.cardId);
    if (cardDef?.isEvergreen && newSession.messages.length > 0) {
      setHasCompletedDailyCard(true);
    }

    if (newSession.messages.length > 0) {
      trackEvent(ANALYTICS_EVENTS.COMPLETE_CARD, { 
        card_id: newSession.cardId,
        card_title: cardDef?.title 
      });
    }
  };

  const displayCards = [...CARDS].filter(c => {
    if (filter === "Completed") {
      const hasSession = sessions.some(s => s.cardId === c.id && s.messages.length > 0);
      return hasSession && !c.isEvergreen;
    }
    return filter === "All" || c.category === filter;
  }).sort((a, b) => {
    const aHasSession = sessions.some(s => s.cardId === a.id && s.messages.length > 0);
    const bHasSession = sessions.some(s => s.cardId === b.id && s.messages.length > 0);
    
    // Evergreens first
    if (a.isEvergreen && !b.isEvergreen) return -1;
    if (!a.isEvergreen && b.isEvergreen) return 1;
    
    // Uncompleted before completed (for non-evergreens)
    if (!a.isEvergreen && !b.isEvergreen) {
      if (!aHasSession && bHasSession) return -1;
      if (aHasSession && !bHasSession) return 1;
    }
    return 0;
  });

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 bg-[#FFFEFC] text-stone-900 relative">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {hasCompletedDailyCard === false && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start sm:items-center gap-4 text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <RefreshCw size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-0.5">Take a moment to center yourself.</h4>
              <p className="text-sm text-emerald-700/80">Your Daily Gratitude card is ready for today's reflection.</p>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">Reflection Cards</h1>
          <p className="text-stone-500 text-lg">Draw a card to explore insights and reflect on your patterns.</p>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-colors cursor-pointer ${
                filter === cat 
                  ? 'bg-stone-900 text-white shadow-md' 
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="w-px h-6 bg-stone-200 mx-1 shrink-0" />
          <button 
            onClick={() => setFilter("Completed")}
            className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-colors cursor-pointer ${
              filter === "Completed" 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900'
            }`}
          >
            Completed
          </button>
        </div>

        {!isDataLoaded ? (
          <div className="flex items-center justify-center py-20 text-stone-400 gap-3">
            <Loader2 className="animate-spin" /> Loading your deck...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCards.map(card => {
              const Icon = card.icon;
              const session = sessions.find(s => s.cardId === card.id);
              const hasSession = session && session.messages.length > 0;
              const isCompletedToday = card.isEvergreen && hasSession && 
                new Date(session.messages[session.messages.length - 1].timestamp).toDateString() === new Date().toDateString();
              
              let cardStyle = "border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1";
              let bgStyle = "bg-white";
              let titleStyle = "text-stone-800";
              let iconBg = card.type === 'AI' ? 'bg-[#F7F7F5] text-stone-800 group-hover:bg-stone-800 group-hover:text-white' : 'bg-stone-50 text-stone-600 group-hover:bg-stone-600 group-hover:text-white';

              if (card.isEvergreen) {
                if (isCompletedToday) {
                  cardStyle = "border-emerald-200 shadow-md";
                  bgStyle = "bg-emerald-50/50";
                  titleStyle = "text-emerald-900";
                  iconBg = "bg-emerald-100 text-emerald-700";
                } else {
                  cardStyle = "border-emerald-100 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1";
                  bgStyle = "bg-white";
                  titleStyle = "text-stone-800";
                  iconBg = "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white";
                }
              } else if (hasSession) {
                cardStyle = "border-indigo-100 hover:border-indigo-300 hover:shadow-lg";
                bgStyle = "bg-[#F7F7F5]/40";
                titleStyle = "text-indigo-900";
                iconBg = "bg-indigo-100 text-indigo-700";
              }
              
              return (
                <div 
                  key={card.id} 
                  onClick={() => setActiveCardId(card.id)}
                  className={`group relative h-[200px] rounded-3xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${bgStyle} ${cardStyle}`}
                >
                  <div className="flex justify-between items-start z-10">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{card.category}</span>
                      {card.isEvergreen && isCompletedToday && (
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md w-fit shadow-sm">Done Today</span>
                      )}
                    </div>
                    <div className={`p-2 rounded-xl transition-colors ${iconBg}`}>
                      <Icon size={16} />
                    </div>
                  </div>
                  
                  <div className="z-10 mb-2">
                    <h3 className={`text-xl font-bold leading-tight transition-colors ${titleStyle}`}>
                      {card.title}
                    </h3>
                  </div>

                  {/* Hover overlay for call to action */}
                  <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-3xl flex flex-col items-center justify-center p-5 z-20 text-center">
                    <p className="text-sm font-semibold text-stone-800 bg-white/95 p-3 rounded-xl shadow-sm mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75 line-clamp-3">
                      {card.description}
                    </p>
                    <span className="bg-stone-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-150">
                      {hasSession ? 'Review & Reflect 💬' : card.type === 'AI' ? 'Generate Insight ✨' : 'Reflect ✍️'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {activeCard && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-stone-900">
          <div className="bg-white w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start bg-white shrink-0 z-10">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">{activeCard.category}</span>
                  {activeCard.isEvergreen && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Daily Practice</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-stone-900 leading-tight">"{activeCard.title}"</h2>
                {activeCard.isEvergreen && activeSession.messages.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide max-w-[600px] pb-1">
                    {Array.from(new Set(activeSession.messages.map(m => new Date(m.timestamp).toLocaleDateString()))).map(date => (
                      <span key={date} className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg shrink-0 border border-stone-200">
                        {date}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setActiveCardId(null)} 
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FFFEFC]/50">
              {activeSession.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${activeCard.type === 'AI' ? 'bg-indigo-100 text-stone-800' : 'bg-emerald-100 text-emerald-600'}`}>
                    <activeCard.icon size={40} />
                  </div>
                  {activeCard.type === 'AI' ? (
                    <>
                      <p className="text-stone-600 font-medium leading-relaxed">{activeCard.description}</p>
                      <button 
                        onClick={handleGenerateAI}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl font-bold shadow-md hover:bg-stone-900 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        Generate Insight
                      </button>
                    </>
                  ) : (
                    <p className="text-stone-600 font-medium leading-relaxed">{activeCard.description}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {activeSession.messages.map((msg) => (
                    <ChatMessageBubble key={msg.id} msg={msg} isLoading={isLoading} isLast={msg.id === activeSession.messages[activeSession.messages.length - 1].id} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            {(activeSession.messages.length > 0 || activeCard.type === 'USER') && (
              <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleUserSubmit();
                      }
                    }}
                    placeholder={activeSession.messages.length === 0 ? "Start reflecting here..." : "Add your reaction..."}
                    className="w-full bg-[#FFFEFC] border border-stone-200 rounded-2xl px-5 py-4 text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none resize-none min-h-[60px] max-h-[150px] shadow-inner transition-all"
                    rows={1}
                  />
                  <button
                    onClick={handleUserSubmit}
                    disabled={!inputText.trim() || isLoading}
                    className="p-4 h-[60px] w-[60px] flex items-center justify-center shrink-0 bg-stone-800 text-white rounded-2xl hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
      
    </div>
  );
}