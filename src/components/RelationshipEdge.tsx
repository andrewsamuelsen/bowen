"use client";

import { useState } from 'react';
import { EdgeLabelRenderer, type EdgeProps, getStraightPath } from 'reactflow';
import { type ChatMessage } from '@/lib/gemini';

// Helper to calculate progress percentage
const calculateProgress = (data: any) => {
  if (!data || !data.responses) return 0;
  
  const responses = data.responses;
  let score = 0;

  // Check for tags in each category (10 points each)
  if (responses["General Tags"]) score += 10;
  if (responses["Dynamic Tags"]) score += 10;
  if (responses["After Tags"]) score += 10;

  // Check for Q&A history
  // Each answer is worth ~4.6 points (70 points / 15 questions)
  const pointsPerQuestion = 70 / 15;
  
  const countAnswers = (key: string) => {
    const historyStr = responses[key];
    if (!historyStr) return 0;
    try {
      const history: ChatMessage[] = JSON.parse(historyStr);
      return history.filter(m => m.role === 'user').length;
    } catch {
      return 0;
    }
  };

  const totalAnswers = 
    countAnswers("General History") + 
    countAnswers("Dynamic History") + 
    countAnswers("Aftermath History");

  score += (totalAnswers * pointsPerQuestion);
  
  return Math.min(100, Math.round(score));
};

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, baseX, baseY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Elegant math to slide the label up the line based on its vertical angle.
  // Since handles are at the bottom, vertically stacked nodes extend their body upwards,
  // potentially covering the exact midpoint. This shifts the label towards the higher node.
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const lengthSq = dx * dx + dy * dy || 1;
  
  const maxShift = 45; // Max pixels to slide up along the line
  const offsetX = -maxShift * (dx * dy) / lengthSq;
  const offsetY = -maxShift * (dy * dy) / lengthSq;
  
  const labelX = baseX + offsetX;
  const labelY = baseY + offsetY;

  const [isHovered, setIsHovered] = useState(false);
  const progress = calculateProgress(data);

  // Dynamic Styles based on progress
  let strokeColor = '#e7e5e4'; // stone-200 (Empty/0%)
  let selectedColor = '#a8a29e'; // stone-400
  let strokeWidth = 1.5;

  if (progress > 0 && progress < 30) {
    strokeColor = '#ddd6fe'; // violet-100 (Subtle Insight)
    selectedColor = '#a78bfa'; // violet-400
    strokeWidth = 2.5;
  } else if (progress >= 30 && progress < 70) {
    strokeColor = '#a78bfa'; // violet-400 (Developing Understanding)
    selectedColor = '#7c3aed'; // violet-600
    strokeWidth = 3.5;
  } else if (progress >= 70) {
    strokeColor = '#5b21b6'; // violet-800 (Deep Integration)
    selectedColor = '#4c1d95'; // violet-900
    strokeWidth = 4.5;
  }

  const isActive = selected || isHovered;
  const finalStrokeColor = isActive ? selectedColor : strokeColor;
  const finalStrokeWidth = isActive ? strokeWidth + 1.2 : strokeWidth;

  const onEdgeClick = (evt: React.MouseEvent) => {
    // We no longer stop propagation here so clicking the badge 
    // triggers the same 'onEdgeClick' logic as the line itself.
  };

  // Segmented Ring calculation
  const totalSegments = 6;
  const activeSegments = Math.ceil((progress / 100) * totalSegments);
  const radius = 10;
  const center = 12;
  
  // Helper to create arc paths
  const createSegmentPath = (index: number, total: number, r: number, c: number) => {
    const gap = 0.6; // Increased gap to prevent overlap with round caps
    const segmentAngle = (2 * Math.PI) / total;
    const startAngle = index * segmentAngle + gap / 2 - Math.PI / 2;
    const endAngle = (index + 1) * segmentAngle - gap / 2 - Math.PI / 2;

    const x1 = c + r * Math.cos(startAngle);
    const y1 = c + r * Math.sin(startAngle);
    const x2 = c + r * Math.cos(endAngle);
    const y2 = c + r * Math.sin(endAngle);

    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <>
      <path
        id={id}
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        style={{ 
          ...style, 
          stroke: finalStrokeColor, 
          strokeWidth: finalStrokeWidth,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          cursor: 'pointer'
        }}
        className="react-flow__edge-path"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Interaction path - wider invisible area to catch hovers easily */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="react-flow__edge-interaction cursor-pointer"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div 
            onClick={onEdgeClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 relative group cursor-pointer ${
              isActive ? 'scale-110 shadow-lg' : ''
            }`}
            title={`Relationship Completeness: ${progress}%`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              {Array.from({ length: totalSegments }).map((_, i) => (
                <path
                  key={i}
                  d={createSegmentPath(i, totalSegments, radius, center)}
                  fill="none"
                  stroke={i < activeSegments ? strokeColor : "#f5f5f4"} // stone-100 for inactive
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-colors duration-300"
                />
              ))}
            </svg>
            
            {/* Center Icon for 100% */}
            {progress === 100 && (
              <div className={`absolute inset-0 flex items-center justify-center animate-fade-in ${
                isActive ? 'text-violet-600' : 'text-stone-800'
              }`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
