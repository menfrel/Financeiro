import React from 'react';
import { LayoutGrid, List, Eye, EyeOff } from 'lucide-react';

interface LayoutToggleProps {
  isDetailed: boolean;
  onToggle: (detailed: boolean) => void;
  className?: string;
}

export function LayoutToggle({ isDetailed, onToggle, className = '' }: LayoutToggleProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600">Visualização:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onToggle(false)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            !isDetailed
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Resumido</span>
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            isDetailed
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Detalhado</span>
        </button>
      </div>
    </div>
  );
}