"use client";

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

export const PersonNode = memo(({ data, selected }: NodeProps) => {
  const isUser = data.type === 'user';

  return (
    <div className={`
      group relative px-4 py-3 shadow-md rounded-xl transition-all duration-200 min-w-[160px] min-h-[76px] flex flex-col justify-center text-center border-2
      ${isUser 
        ? `bg-[#F7F7F5] border-stone-800 shadow-stone-200 ${selected ? 'ring-2 ring-stone-400 ring-offset-2' : ''}` 
        : `bg-white border-stone-200 ${selected ? 'border-violet-500 shadow-lg' : 'hover:border-violet-300'}`
      }
    `}>
      <div className={`font-bold text-sm mb-1 ${isUser ? 'text-stone-900' : 'text-stone-800'}`}>
        {data.label}
      </div>

      {data.responses && data.responses['Relationship Label (e.g. Mom, Boss)'] && (
        <div className={`text-xs rounded px-2 py-1 inline-block ${
          isUser ? 'text-stone-800 bg-stone-200/50' : 'text-stone-500 bg-[#FFFEFC]'
        }`}>
          {data.responses['Relationship Label (e.g. Mom, Boss)']}
        </div>
      )}

      {/* 
        Single Connection Point: Center of the visual handle for perfect edge routing.
        We place it dead center and make it invisible. We add a visual pseudo-handle at the bottom.
      */}
      <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-5 h-5 border-2 border-white rounded-full z-[100] hover:scale-125 transition-transform cursor-crosshair shadow-sm ${
        isUser ? 'bg-stone-800' : 'bg-stone-800'
      }`}>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="main"
          className="!w-0 !h-0 !bg-transparent !border-none !top-1/2 !left-1/2" 
        />
      </div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
