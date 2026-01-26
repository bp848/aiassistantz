import React from 'react';
import { AgentMode } from '../types';
import { Briefcase, BrainCircuit, Globe, Bell, CalendarClock, PenTool, Users } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  disabled: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange, disabled }) => {
  const modes = [
    { id: AgentMode.SECRETARY, label: '会話', icon: Briefcase },
    { id: AgentMode.WRITER, label: '作成', icon: PenTool },
    { id: AgentMode.SCHEDULE, label: '予定', icon: CalendarClock },
    { id: AgentMode.MINUTES, label: '会議', icon: Users },
    { id: AgentMode.ADVISOR, label: '相談', icon: BrainCircuit },
    { id: AgentMode.RESEARCHER, label: '調査', icon: Globe },
    { id: AgentMode.CONCIERGE, label: '手配', icon: Bell },
  ];

  return (
    <div className="w-full flex overflow-x-auto gap-3 p-1 mb-2 no-scrollbar">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-full transition-all whitespace-nowrap border ${
              isActive 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-transparent border-gray-800 text-gray-500 hover:bg-gray-900'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon size={24} />
            <span className="text-base font-bold">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;