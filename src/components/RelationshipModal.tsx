"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { RELATIONSHIP_TAGS } from '../constants/tags';
import { generateTherapeuticQuestion, type ChatMessage } from '@/lib/gemini';

interface RelationshipModalProps {
  isOpen: boolean;
  sourceId?: string;
  targetId?: string;
  sourceLabel?: string;
  targetLabel?: string;
  initialValues?: Record<string, string>;
  onClose: () => void;
  onSave: (data: Record<string, string>, shouldClose?: boolean) => void;
  onDelete?: () => void;
}

const parseHistory = (key: string, values: Record<string, string>): ChatMessage[] => {
  const stored = values[key];
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    const prompt = values[key.replace("History", "AI Prompt")];
    const explanation = values[key.replace("History", "Explanation")];
    const history: ChatMessage[] = [];
    if (prompt) history.push({ role: 'model', text: prompt });
    if (explanation) history.push({ role: 'user', text: explanation });
    return history;
  }
  return [];
};

export function RelationshipModal({ 
  isOpen, 
  sourceId,
  targetId,
  sourceLabel = "Person A", 
  targetLabel = "Person B", 
  initialValues = {}, 
  onClose, 
  onSave,
  onDelete
}: RelationshipModalProps) {
  
  const is3rdParty = sourceId !== 'me' && targetId !== 'me';

  const [selectedTags, setSelectedTags] = useState<{
    general: string[];
    dynamic: string[];
    after: string[];
  }>({ general: [], dynamic: [], after: [] });

  const [chatHistory, setChatHistory] = useState<{
    general: ChatMessage[];
    dynamic: ChatMessage[];
    after: ChatMessage[];
  }>({ general: [], dynamic: [], after: [] });

  const [currentInputs, setCurrentInputs] = useState<{
    general: string;
    dynamic: string;
    after: string;
  }>({ general: "", dynamic: "", after: "" });

  const [loadingAi, setLoadingAi] = useState<{
    general: boolean;
    dynamic: boolean;
    after: boolean;
  }>({ general: false, dynamic: false, after: false });

  const [showDeeper, setShowDeeper] = useState<{
    general: boolean;
    dynamic: boolean;
    after: boolean;
  }>({ general: false, dynamic: false, after: false });

  const [notes, setNotes] = useState("");
  const isFirstRender = useRef(true);

  // Custom Tag Input State
  const [customTagInput, setCustomTagInput] = useState<{
    general: string;
    dynamic: string;
    after: string;
  }>({ general: "", dynamic: "", after: "" });

  const [isAddingCustom, setIsAddingCustom] = useState<{
    general: boolean;
    dynamic: boolean;
    after: boolean;
  }>({ general: false, dynamic: false, after: false });

  useEffect(() => {
    if (isOpen) {
      const parsedTags = {
        general: initialValues["General Tags"] ? initialValues["General Tags"].split(', ') : [],
        dynamic: initialValues["Dynamic Tags"] ? initialValues["Dynamic Tags"].split(', ') : [],
        after: initialValues["After Tags"] ? initialValues["After Tags"].split(', ') : []
      };
      
      const history = {
        general: parseHistory("General History", initialValues),
        dynamic: parseHistory("Dynamic History", initialValues),
        after: parseHistory("Aftermath History", initialValues)
      };

      setSelectedTags(parsedTags);
      setChatHistory(history);
      setShowDeeper({
        general: history.general.length > 0,
        dynamic: history.dynamic.length > 0,
        after: history.after.length > 0
      });
      setNotes(initialValues["Notes"] || "");
      isFirstRender.current = false;
    }
  }, [isOpen]); 

  const triggerAutoSave = () => {
    if (isFirstRender.current) return;
    const flatten = (history: ChatMessage[]) => history.map(m => `${m.role === 'model' ? 'Prompt' : 'You'}: ${m.text}`).join('\n\n');
    const data: Record<string, string> = {
      "General Tags": selectedTags.general.join(', '),
      "General History": JSON.stringify(chatHistory.general),
      "General Explanation": flatten(chatHistory.general), 
      "Dynamic Tags": selectedTags.dynamic.join(', '),
      "Dynamic History": JSON.stringify(chatHistory.dynamic),
      "Dynamic Explanation": flatten(chatHistory.dynamic),
      "After Tags": selectedTags.after.join(', '),
      "Aftermath History": JSON.stringify(chatHistory.after),
      "Aftermath Explanation": flatten(chatHistory.after),
      "Notes": notes
    };
    onSave(data, false); 
  };

  useEffect(() => {
    if (!isOpen || isFirstRender.current) return;
    const timeoutId = setTimeout(triggerAutoSave, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedTags, chatHistory, notes]);

  const calculateProgress = () => {
    let score = 0;
    if (selectedTags.general.length > 0) score += 10;
    if (selectedTags.dynamic.length > 0) score += 10;
    if (selectedTags.after.length > 0) score += 10;
    const pointsPerQuestion = 70 / 15;
    const countAnswers = (history: ChatMessage[]) => history.filter(m => m.role === 'user').length;
    const totalAnswers = countAnswers(chatHistory.general) + countAnswers(chatHistory.dynamic) + countAnswers(chatHistory.after);
    score += (totalAnswers * pointsPerQuestion);
    return Math.min(100, Math.round(score));
  };

  const progress = calculateProgress();

  if (!isOpen) return null;

  const toggleTag = (category: 'general' | 'dynamic' | 'after', tag: string) => {
    setSelectedTags(prev => {
      const current = prev[category];
      if (current.includes(tag)) {
        return { ...prev, [category]: current.filter(t => t !== tag) };
      } else {
        if (current.length >= 5) return prev; 
        return { ...prev, [category]: [...current, tag] };
      }
    });
  };

  const handleAddCustomTag = (category: 'general' | 'dynamic' | 'after') => {
    const tag = customTagInput[category].trim();
    if (tag) {
      toggleTag(category, tag);
      setCustomTagInput(prev => ({ ...prev, [category]: "" }));
    }
    setIsAddingCustom(prev => ({ ...prev, [category]: false }));
  };

  const handleStartChat = async (category: 'general' | 'dynamic' | 'after') => {
    setShowDeeper(prev => ({ ...prev, [category]: true }));
    if (chatHistory[category].length === 0 && selectedTags[category].length > 0) {
      setLoadingAi(prev => ({ ...prev, [category]: true }));
      try {
        const question = await generateTherapeuticQuestion(
          `${sourceLabel} and ${targetLabel}`,
          category === 'after' && is3rdParty ? 'Impact/Role' : category,
          selectedTags[category],
          [],
          1,
          5,
          is3rdParty
        );
        setChatHistory(prev => ({ ...prev, [category]: [{ role: 'model', text: question }] }));
      } finally {
        setLoadingAi(prev => ({ ...prev, [category]: false }));
      }
    }
  };

  const handleSendMessage = async (category: 'general' | 'dynamic' | 'after') => {
    const text = currentInputs[category].trim();
    let newHistory = [...chatHistory[category]];
    if (text) {
        newHistory.push({ role: 'user', text });
        setChatHistory(prev => ({ ...prev, [category]: newHistory }));
        setCurrentInputs(prev => ({ ...prev, [category]: "" })); 
    }
    const currentPairs = newHistory.filter(m => m.role === 'model').length;
    if (currentPairs >= 5) return;
    setLoadingAi(prev => ({ ...prev, [category]: true }));
    try {
      const question = await generateTherapeuticQuestion(
        `${sourceLabel} and ${targetLabel}`,
        category === 'after' && is3rdParty ? 'Impact/Role' : category,
        selectedTags[category],
        newHistory,
        currentPairs + 1,
        5,
        is3rdParty
      );
      setChatHistory(prev => ({ ...prev, [category]: [...newHistory, { role: 'model', text: question }] }));
    } finally {
      setLoadingAi(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleDeleteEntry = (category: 'general' | 'dynamic' | 'after', index: number) => {
    setChatHistory(prev => {
      const history = [...prev[category]];
      history.splice(index, 2);
      return { ...prev, [category]: history };
    });
  };

  const renderChatSection = (
    category: 'general' | 'dynamic' | 'after', 
    label: string, 
    options: string[], 
    colorClass: string,
    ringClass: string,
    title: string
  ) => {
    const selectedCount = selectedTags[category].length;
    const isVisible = showDeeper[category];
    const history = chatHistory[category];
    const isLoading = loadingAi[category];
    const pairs: { question: string; answer?: string; qIndex: number }[] = [];
    for (let i = 0; i < history.length; i++) {
      if (history[i].role === 'model') {
        const next = history[i+1];
        pairs.push({ question: history[i].text, answer: next?.role === 'user' ? next.text : undefined, qIndex: i });
        if (next?.role === 'user') i++; 
      }
    }
    const questionsAsked = pairs.length;
    const isComplete = questionsAsked >= 5 && pairs[4]?.answer;

    // Combine standard options with custom selected tags
    const visibleTags = [...options];
    selectedTags[category].forEach(t => {
      if (!visibleTags.includes(t)) visibleTags.push(t);
    });

    return (
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <span className={`w-2 h-8 rounded-full ${colorClass}`}></span>
            {title}
          </h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedCount >= 5 ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-500'}`}>
            {selectedCount}/5 Tags
          </span>
        </div>
        <p className="text-stone-600 italic text-sm">{label}</p>
        <div className="flex flex-wrap gap-2">
          {visibleTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(category, tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                selectedTags[category].includes(tag)
                  ? `bg-opacity-20 ${colorClass.replace('bg-', 'bg-').replace('500', '100')} ${colorClass.replace('bg-', 'text-').replace('500', '700')} ${ringClass} ring-2 ring-offset-1 border-transparent`
                  : 'bg-[#FFFEFC] text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {tag}
            </button>
          ))}

          {isAddingCustom[category] ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <input
                autoFocus
                type="text"
                value={customTagInput[category]}
                onChange={(e) => setCustomTagInput(prev => ({ ...prev, [category]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomTag(category);
                  if (e.key === 'Escape') setIsAddingCustom(prev => ({ ...prev, [category]: false }));
                }}
                className="px-3 py-1.5 rounded-full text-sm border-2 border-blue-500 outline-none w-32 bg-white"
                placeholder="Tag name..."
              />
              <button
                onClick={() => handleAddCustomTag(category)}
                className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
                title="Confirm tag"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={() => setIsAddingCustom(prev => ({ ...prev, [category]: false }))}
                className="p-1.5 rounded-full bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-500 transition-colors border border-stone-200 shadow-sm cursor-pointer"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            selectedCount < 5 && (
              <button
                onClick={() => setIsAddingCustom(prev => ({ ...prev, [category]: true }))}
                className="px-3 py-1.5 rounded-full text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 border border-transparent hover:border-blue-100 cursor-pointer"
              >
                <Plus size={14} /> Add
              </button>
            )
          )}
        </div>
        {selectedCount > 0 && !isVisible && (
          <button
            onClick={() => handleStartChat(category)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors py-1.5 px-3 rounded-lg bg-blue-50 border border-blue-100 shadow-sm mt-2 cursor-pointer"
          >
            <Sparkles size={16} /> Deepen with 5 Questions
          </button>
        )}
        {isVisible && (
          <div className="mt-6 space-y-6 animate-fade-in relative">
            <div className="flex items-center gap-2 mb-4">
               <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                 <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${(questionsAsked / 5) * 100}%` }} />
               </div>
               <span className="text-xs font-bold text-stone-400 whitespace-nowrap">{questionsAsked} / 5 Questions</span>
            </div>
            {pairs.map((pair, idx) => (
              <div key={idx} className="bg-[#FFFEFC] border border-stone-200 rounded-xl overflow-hidden shadow-sm relative group">
                <button onClick={() => handleDeleteEntry(category, pair.qIndex)} className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={16} /></button>
                <div className="p-4 bg-white border-b border-stone-100">
                  <div className="flex items-start gap-2">
                    <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5">Q{idx + 1}</span>
                    <p className="text-stone-800 font-medium text-base leading-snug">{pair.question}</p>
                  </div>
                </div>
                <div className="p-4">
                  {pair.answer ? (
                    <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{pair.answer}</p>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={currentInputs[category]}
                        onChange={(e) => setCurrentInputs(prev => ({ ...prev, [category]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(category); } }}
                        placeholder="Type your answer here..."
                        className="w-full p-3 min-h-[80px] text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white transition-colors"
                        autoFocus
                      />
                      <div className="flex justify-end">
                        <button onClick={() => handleSendMessage(category)} disabled={!currentInputs[category].trim() || isLoading} className="px-4 py-2 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer">Save Answer</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="bg-[#FFFEFC] border border-stone-200 rounded-xl p-6 flex items-center justify-center gap-3 animate-pulse">
                <Loader2 size={20} className="animate-spin text-purple-500" /><span className="text-stone-500 font-medium">Drafting Question {questionsAsked + 1}...</span>
              </div>
            )}
            {!isLoading && !isComplete && pairs.length > 0 && pairs[pairs.length - 1].answer && (
              <button onClick={() => handleSendMessage(category)} className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 font-bold hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 cursor-pointer"><Plus size={18} />Get Question {questionsAsked + 1} of 5</button>
            )}
            {isComplete && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                <CheckCircle2 size={24} /><div><p className="font-bold">Section Complete!</p><p className="text-sm opacity-90">You've built a strong profile for this category.</p></div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm text-stone-900">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-fade-in flex flex-col border border-stone-200">
        <div className="p-6 border-b border-stone-200 sticky top-0 bg-white z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-stone-800">{is3rdParty ? 'Observing Relationship' : 'Relationship Profile'}</h2>
              <p className="text-stone-500 text-sm">{is3rdParty ? `Analyzing the dynamic between ${sourceLabel} and ${targetLabel}` : `Characterize your relationship with ${targetLabel}`}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"><X size={24} /></button>
          </div>
          <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs font-semibold text-stone-400 uppercase tracking-wider"><span>Profile Strength</span><span>{progress}% Complete</span></div>
        </div>
        <div className="p-6 space-y-12 flex-1">
          {renderChatSection('general', is3rdParty ? RELATIONSHIP_TAGS.general.label3rdParty : RELATIONSHIP_TAGS.general.label, RELATIONSHIP_TAGS.general.options, 'bg-blue-500', 'ring-blue-500', is3rdParty ? 'General Observation' : 'General')}
          {renderChatSection('dynamic', is3rdParty ? RELATIONSHIP_TAGS.dynamic.label3rdParty : RELATIONSHIP_TAGS.dynamic.label, RELATIONSHIP_TAGS.dynamic.options, 'bg-purple-500', 'ring-purple-500', is3rdParty ? 'Dynamic Observation' : 'Dynamic')}
          {is3rdParty ? 
            renderChatSection('after', RELATIONSHIP_TAGS.impact.label, RELATIONSHIP_TAGS.impact.options, 'bg-emerald-500', 'ring-emerald-500', 'System Impact / Role') :
            renderChatSection('after', RELATIONSHIP_TAGS.after.label, RELATIONSHIP_TAGS.after.options, 'bg-emerald-500', 'ring-emerald-500', 'Aftermath')
          }
          <section>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">General Notes</h3>
            <textarea className="w-full p-4 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none min-h-[100px] text-stone-800 bg-[#FFFEFC]" placeholder="Any other details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>
        <div className="p-6 border-t border-stone-200 bg-[#FFFEFC] flex justify-between items-center sticky bottom-0 rounded-b-xl">
          <button 
            onClick={() => {
              if (confirm('Delete this relationship and all progress?')) {
                onDelete?.();
                onClose();
              }
            }}
            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 size={18} />
            Delete
          </button>
          <button onClick={onClose} className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold shadow-lg shadow-stone-200 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}
