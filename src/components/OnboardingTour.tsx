"use client";

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { X, ChevronRight, MousePointer2, GitCommit, Settings2, Sparkles } from 'lucide-react';

export function OnboardingTour() {
  const pathname = usePathname();
  const { onboardingStep, setOnboardingStep } = useAppStore();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reset or initialize onboarding if empty state
    const checkState = async () => {
        const res = await fetch('/api/graph');
        if (res.ok) {
            const data = await res.json();
            if ((!data.nodes || data.nodes.length < 2) && onboardingStep === 0) {
                // If it's a new user (only 'me' node), start step 1
                setOnboardingStep(1);
            }
        }
    };
    checkState();
  }, []);

  useEffect(() => {
    if (onboardingStep === 0) {
        setIsVisible(false);
        return;
    }

    const updateCoords = () => {
      let targetId = "";
      if (onboardingStep === 1 && pathname === "/relationships") targetId = "onboarding-add-person";
      if (onboardingStep === 3 && pathname === "/relationships") targetId = "onboarding-general-tags";
      if (onboardingStep === 4) targetId = "onboarding-cards-nav";

      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setCoords({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
          setIsVisible(true);
          return;
        }
      }
      
      // For Step 2 (Canvas) - Anchor to 'Me' node handle
      if (onboardingStep === 2 && pathname === "/relationships") {
          const meNode = document.querySelector('[data-id="me"]');
          if (meNode) {
            const rect = meNode.getBoundingClientRect();
            setCoords({ 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height 
            });
            setIsVisible(true);
            return;
          }
      }

      setIsVisible(false);
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    const interval = setInterval(updateCoords, 500); // Poll for dynamic elements
    return () => {
        window.removeEventListener('resize', updateCoords);
        clearInterval(interval);
    };
  }, [onboardingStep, pathname]);

  if (!isVisible) return null;

  const handleNext = () => {
    if (onboardingStep === 4) {
        setOnboardingStep(0); // Finish
    } else {
        setOnboardingStep(onboardingStep + 1);
    }
  };

  const handleSkip = () => {
      setOnboardingStep(0);
  };

  const stepContent = [
    {
      title: "Add your first person",
      text: "Who is the most important person in your life right now? Add them to your map.",
      icon: <MousePointer2 size={18} className="text-blue-500" />
    },
    {
      title: "Draw a connection",
      text: "Click and drag from the circle on your node to their node to create a relationship.",
      icon: <GitCommit size={18} className="text-purple-500" />
    },
    {
      title: "Define the dynamic",
      text: "Use tags and AI questions to describe how you feel and what your role is in this connection.",
      icon: <Settings2 size={18} className="text-emerald-500" />
    },
    {
      title: "Explore your insights",
      text: "Now that your map is growing, head over to Cards for daily reflections and patterns.",
      icon: <Sparkles size={18} className="text-amber-500" />
    }
  ];

  const current = stepContent[onboardingStep - 1];
  if (!current) return null;

  // Positioning logic
  let style: React.CSSProperties = {};
  const isAboveModal = onboardingStep === 3;
  const zIndex = isAboveModal ? 60 : 40;
  
  if (coords) {
    // Anchored steps (1, 2, 3, 4)
    style = {
      position: 'fixed',
      top: onboardingStep === 2 ? coords.top + coords.height + 32 : coords.top + coords.height + 12,
      left: Math.min(window.innerWidth - 300, Math.max(16, coords.left + (coords.width / 2) - 140)),
      zIndex, 
    };
  } else {
    // Fallback centered
    style = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex,
    };
  }

  return (
    <>
      <div 
        style={style}
        className="w-[280px] bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-stone-50 rounded-lg">
            {current.icon}
          </div>
          <button onClick={handleSkip} className="p-1 text-stone-400 hover:text-stone-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <h4 className="font-bold text-stone-900 mb-1">{current.title}</h4>
        <p className="text-xs text-stone-500 leading-relaxed mb-4">{current.text}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all ${onboardingStep === s ? 'w-4 bg-stone-800' : 'w-1 bg-stone-200'}`} />
            ))}
          </div>
          <button 
            onClick={handleNext}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition-all shadow-md active:scale-95"
          >
            {onboardingStep === 4 ? "Close" : "Next"}
            {onboardingStep !== 4 && <ChevronRight size={14} />}
          </button>
        </div>

        {/* Pointer Arrow - Only show on anchored steps */}
        {coords && (
            <div 
                className={`absolute w-3 h-3 bg-white border-l border-t border-stone-200 rotate-45 -top-1.5`}
                style={{ left: 'calc(50% - 6px)' }}
            />
        )}
      </div>
    </>
  );
}
