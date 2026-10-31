import React from 'react';
import { Flame, Award, Lightbulb, Scale, Zap } from 'lucide-react';

export interface FloatingReactionItem {
  id: string;
  emoji: string;
  x: number; // percentage 10 to 90
}

interface FloatingReactionsProps {
  reactions: FloatingReactionItem[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  const renderReactionVisual = (val: string) => {
    switch (val) {
      case 'fire':
      case '🔥':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-300/50 border-2 border-white">
            <Flame className="h-5 w-5 fill-current" />
          </div>
        );
      case 'applause':
      case '👏':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 border-2 border-white">
            <Award className="h-5 w-5" />
          </div>
        );
      case 'light':
      case '💡':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-yellow-950 shadow-lg shadow-yellow-200/50 border-2 border-white">
            <Lightbulb className="h-5 w-5 fill-current" />
          </div>
        );
      case 'balance':
      case '⚖️':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-300/50 border-2 border-white">
            <Scale className="h-5 w-5" />
          </div>
        );
      case 'mindblown':
      case '🤯':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-300/50 border-2 border-white">
            <Zap className="h-5 w-5 fill-current" />
          </div>
        );
      default:
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white text-base font-bold">
            {val}
          </div>
        );
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-24 animate-float-reaction select-none"
          style={{ left: `${r.x}%` }}
        >
          {renderReactionVisual(r.emoji)}
        </div>
      ))}
    </div>
  );
};
