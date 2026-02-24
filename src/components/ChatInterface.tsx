"use client";

import { useState, useEffect, useRef, memo } from 'react';
import { X, Send, Loader2, MessageSquare, Trash2, Check, XCircle, Calendar, Sparkles, ChevronRight, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamChat, formatGraphForLLM } from '@/lib/gemini';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  graphContext: any; // The full graph data
}

const SUGGESTED_TOPICS = [
  "Discuss goals of therapy",
  "Discuss family history",
  "Discuss primary relationship",
  "Identify recurring patterns",
  "Explore recent conflicts"
];

// Memoized Message Bubble
const ChatMessageBubble = memo(({ msg, isLast, isLoading, onDelete, deleteConfirmId, setDeleteConfirmId, onRetry }: any) => {
  const isEmptyModel = msg.role === 'model' && !msg.text.trim();
  
  if (isEmptyModel && (!isLoading || !isLast)) return null;

  return (
    <div className={`group flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'model' && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-stone-800 shrink-0 mt-1 shadow-sm">
          {isEmptyModel ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
        </div>
      )}
      
      <div className="relative group/msg max-w-[85%] sm:max-w-[725px]">
        <div className={`rounded-2xl px-6 py-4 shadow-sm text-sm leading-relaxed ${
          msg.role === 'user' 
            ? 'bg-stone-900 text-white rounded-br-none shadow-md' 
            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
        }`}>
          {msg.role === 'user' ? (
            msg.text
          ) : isEmptyModel ? (
            <span className="text-stone-400 italic">Thinking...</span>
          ) : (
            <div className="markdown-content text-stone-800">
              <ReactMarkdown components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-stone-900 mb-4 mt-6" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-stone-900 mb-3 mt-5" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-stone-900 mb-2 mt-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-stone-900" {...props} />,
                em: ({node, ...props}) => <em className="italic text-stone-600" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-stone-200 pl-4 py-1 my-4 text-stone-500 italic" {...props} />,
                code: ({node, ...props}) => <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono text-stone-600" {...props} />,
                a: ({node, ...props}) => {
                  const label = String(props.children || "");
                  if (label.includes('Retry') || props.href === 'retry') {
                    return (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          onRetry();
                        }} 
                        className="text-stone-800 hover:text-indigo-800 font-bold underline cursor-pointer inline-flex items-center gap-1"
                      >
                        {label}
                      </button>
                    );
                  }
                  return <a className="text-stone-800 underline" {...props} />;
                }
              }}>{msg.text}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {!isEmptyModel && (
          <div className={`absolute top-0 -right-8 h-full flex items-center opacity-0 group-hover/msg:opacity-100 transition-opacity ${msg.role === 'user' ? '-left-10 right-auto' : '-right-10'}`}>
            {deleteConfirmId === msg.id ? (
              <div className="flex flex-col gap-1 bg-white shadow-md rounded-lg p-1 border animate-in zoom-in duration-100">
                <button onClick={() => onDelete(msg.id)} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"><Check size={14} /></button>
                <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer"><XCircle size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirmId(msg.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors cursor-pointer">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 shrink-0 mt-1 shadow-inner">
          <div className="w-2 h-2 bg-stone-400 rounded-full" />
        </div>
      )}
    </div>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';

// Isolated Chat Input Component
const ChatInput = ({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="bg-white border-t border-stone-200 p-4 sm:p-6 shrink-0 z-20">
      <div className="max-w-3xl mx-auto relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          className="w-full bg-[#FFFEFC] border border-stone-200 rounded-xl px-4 py-4 pr-14 text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none resize-none min-h-[60px] max-h-[200px] shadow-inner transition-all"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 bottom-2.5 p-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
      <div className="text-center mt-3">
          <p className="text-[10px] text-stone-400 font-medium">AI can make mistakes. Please verify critical information.</p>
      </div>
    </div>
  );
};

export function ChatInterface({ isOpen, onClose, graphContext }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const isSending = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Fetch history
  useEffect(() => {
    if (!isOpen || isHistoryLoaded) return;

    const fetchHistory = async () => {
      setIsInitialLoading(true);
      try {
        const res = await fetch('/api/chat/history');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch (e) {
        console.error("Failed to fetch chat history", e);
      } finally {
        setIsInitialLoading(false);
        setIsHistoryLoaded(true);
      }
    };

    fetchHistory();
  }, [isOpen, isHistoryLoaded]);

  // Save history (debounced)
  useEffect(() => {
    if (!isHistoryLoaded) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/chat/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        });
      } catch (e) {
        console.error("Failed to save chat history", e);
      }
    }, 2000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, isHistoryLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleDelete = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || isSending.current) return;
    isSending.current = true;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const apiHistory = messages.map(m => ({
      role: m.role,
      text: m.text
    }));

    const systemPrompt = `
      You are a therapeutic AI assistant.
      CORE IDENTITY: Reflector, Guide, Pattern Detector, Reality Tester.
      Tone: Objective, curious, direct, warm but not effusive.
      Goal: Help user achieve insight into their relationships and emotional patterns.
      CONTEXT: ${formatGraphForLLM(graphContext)}
      INSTRUCTIONS: Use provided graph data explicitly. Identify patterns. Ask probing questions.
    `;

    try {
      const modelMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: modelMsgId,
        role: 'model',
        text: "",
        timestamp: Date.now()
      }]);

      let fullResponse = "";

      await streamChat(
        userMsg.text,
        apiHistory,
        systemPrompt,
        (chunk) => {
          const formattedChunk = chunk.replace(/\n/g, '\n\n');
          fullResponse += formattedChunk;
          setMessages(prev => prev.map(m => 
             m.id === modelMsgId ? { ...m, text: fullResponse } : m
          ));
        }
      );

    } catch (error: any) {
      console.error("Chat Error", error);
      let errorMessage = "**Error:** Could not connect to the therapeutic assistant.";
      if (error?.message?.includes("high demand") || error?.message?.includes("503")) {
        errorMessage = "Service Busy: The underlying AI is experiencing high demand. [Retry chat](retry)";
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      isSending.current = false;
    }
  };

  const scrollToDate = (dateId: string) => {
    const el = document.getElementById(dateId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  const groupedMessages: { date: string; msgs: ChatMessage[]; id: string }[] = [];
  messages.forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg], id: `date-${groupedMessages.length}` });
    }
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-stone-900">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-stone-200 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-stone-900 rounded-xl text-white shadow-lg shadow-stone-200">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Therapy Assistant</h2>
              <p className="text-sm text-stone-500 font-medium">
                Context Active: {graphContext?.people?.length || 0} People
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 bg-[#FFFEFC] border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2">Suggestions</h3>
                                {SUGGESTED_TOPICS.map((topic, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSend(topic)}
                                    disabled={isLoading}
                                    className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-stone-800 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-stone-200 flex items-center gap-2 group cursor-pointer"
                                  >
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="truncate">{topic}</span>
                  </button>
                ))}
              </div>

              {groupedMessages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2">Session History</h3>
                  <div className="space-y-1">
                                        {groupedMessages.slice().reverse().slice(0, 8).map((group) => (
                                          <button
                                            key={group.id}
                                            onClick={() => scrollToDate(group.id)}
                                            className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-stone-200 flex items-center justify-between cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-stone-400" />
                          <span>{group.date}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-stone-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth bg-[#FFFEFC]/30">
              <div className="max-w-4xl mx-auto space-y-8 min-h-full">
                {isInitialLoading ? (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-stone-400 space-y-4">
                    <Loader2 size={40} className="animate-spin text-stone-600" />
                    <p className="font-medium">Loading session history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center text-stone-400">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                      <MessageCircle size={40} className="text-stone-300" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-700 mb-2">Start a new session</h3>
                    <p className="text-stone-500 max-w-xs mx-auto mb-8">I'm ready to discuss your relationships.</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-md">
                      {SUGGESTED_TOPICS.slice(0, 3).map((t, i) => (
                        <button key={i} onClick={() => handleSend(t)} className="px-3 py-1.5 bg-white border border-stone-100 rounded-full text-xs font-medium hover:border-indigo-300 hover:text-stone-800 transition-colors shadow-sm cursor-pointer">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!isInitialLoading && groupedMessages.map((group) => (
                  <div key={group.id} id={group.id} className="space-y-6 scroll-mt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px bg-stone-200 flex-1" />
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{group.date}</span>
                      <div className="h-px bg-stone-200 flex-1" />
                    </div>
                    
                    {group.msgs.map((msg) => (
                      <ChatMessageBubble
                        key={msg.id}
                        msg={msg}
                        isLast={messages[messages.length - 1]?.id === msg.id}
                        isLoading={isLoading}
                        onDelete={handleDelete}
                        deleteConfirmId={deleteConfirmId}
                        setDeleteConfirmId={setDeleteConfirmId}
                        onRetry={() => {
                          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                          if (lastUserMsg) handleSend(lastUserMsg.text);
                        }}
                      />
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
