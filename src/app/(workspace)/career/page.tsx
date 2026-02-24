"use client";

import { TrendingUp } from "lucide-react";

export default function CareerPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-stone-900 bg-slate-50">
      <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-stone-300">
        <TrendingUp size={48} />
      </div>
      <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">Career</h1>
      <p className="text-xl text-stone-600 max-w-lg">
        Map your professional history, current challenges, and future vision.
      </p>
      <div className="mt-8 px-6 py-3 bg-stone-100 text-stone-500 rounded-xl font-bold text-sm">
        Coming Soon
      </div>
    </div>
  );
}
