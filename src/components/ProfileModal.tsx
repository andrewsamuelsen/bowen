"use client";

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  title: string;
  fields: Record<string, string>;
  initialValues?: Record<string, string>;
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
}

export function ProfileModal({ isOpen, title, fields, initialValues = {}, onClose, onSave }: ProfileModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(initialValues);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  if (!isOpen) return null;

  const isNewPerson = title === "New Person";
  const displayFields = isNewPerson 
    ? Object.entries(fields).filter(([key]) => key === 'NAME' || key === 'RELATIONSHIP')
    : Object.entries(fields);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in text-stone-900">
      <div className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-stone-200 overflow-hidden ${isNewPerson ? 'max-w-md' : 'max-w-2xl max-h-[90vh]'}`}>
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-[#FFFEFC]">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{title}</h2>
            {isNewPerson && <p className="text-sm text-stone-500">Add a new person to your system.</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {!isNewPerson && (
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-start gap-3 text-stone-600 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>Detail helps Bowen identify generational patterns and dynamics.</p>
            </div>
          )}

          <div className="space-y-5">
            {displayFields.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest ml-1">{label}</label>
                {key === 'NAME' || isNewPerson ? (
                  <input
                    type="text"
                    autoFocus={key === 'NAME'}
                    className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-400 outline-none text-stone-800 bg-white transition-all"
                    value={formData[label] || ""}
                    onChange={(e) => setFormData({ ...formData, [label]: e.target.value })}
                    placeholder={key === 'NAME' ? "Full Name" : "e.g. Mom, Best Friend, Boss"}
                  />
                ) : (
                  <textarea
                    className="w-full p-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-400 outline-none min-h-[120px] text-stone-800 bg-white transition-all"
                    value={formData[label] || ""}
                    onChange={(e) => setFormData({ ...formData, [label]: e.target.value })}
                    placeholder={`Notes about ${label.toLowerCase()}...`}
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>
        </form>

        <div className="p-6 border-t border-stone-100 bg-[#FFFEFC] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-sm font-bold shadow-md shadow-stone-200 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer">
            <Save size={16} />
            {isNewPerson ? 'Add Person' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
