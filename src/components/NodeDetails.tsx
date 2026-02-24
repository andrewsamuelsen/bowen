"use client";

import { X, User, Link2, Calendar, Edit2, Trash2 } from 'lucide-react';
import { PERSON_FIELDS, RELATIONSHIP_FIELDS } from '@/constants/questions';

interface NodeDetailsProps {
  node: any;
  edge: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NodeDetails({ node, edge, onClose, onEdit, onDelete }: NodeDetailsProps) {
  const isNode = !!node;
  const data = isNode ? node.data : edge?.data;
  const responses = data?.responses || {};
  const fields = isNode ? PERSON_FIELDS : RELATIONSHIP_FIELDS;

  return (
    <div className="w-80 bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-stone-900">
      <div className="p-4 border-b flex justify-between items-center bg-[#FFFEFC]/50">
        <div className="flex items-center gap-2">
          {isNode ? <User size={18} className="text-stone-800" /> : <Link2 size={18} className="text-purple-600" />}
          <h3 className="font-bold text-stone-800 truncate max-w-[180px]">{data?.label || 'Details'}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 transition-colors cursor-pointer"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.values(fields).map((label: any) => (
          <div key={label} className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-0.5">{label}</h4>
            <div className="p-3 bg-[#FFFEFC] rounded-xl border border-stone-100 text-sm text-stone-700 leading-relaxed min-h-[40px]">
              {responses[label] || <span className="text-stone-300 italic">No information provided</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-[#FFFEFC] flex gap-2">
        <button onClick={onEdit} className="flex-1 py-2.5 bg-white border border-stone-200 hover:border-indigo-300 hover:text-stone-800 text-stone-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
          <Edit2 size={14} /> Edit
        </button>
        <button onClick={onDelete} className="p-2.5 border border-stone-200 hover:bg-rose-50 hover:border-rose-200 text-stone-400 hover:text-rose-600 rounded-lg transition-all shadow-sm cursor-pointer">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
