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
    <div className="w-full flex overflow-x-auto gap-2 py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" role="tablist" aria-label="モード選択">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium ${
              isActive
                ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon size={18} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;