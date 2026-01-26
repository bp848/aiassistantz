import React, { useEffect, useState } from 'react';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { UserProfile, SecretaryProfile } from '../types';

interface LiveCallOverlayProps {
  isActive: boolean;
  onEndCall: () => void;
  secretaryProfile?: SecretaryProfile | null;
}

const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({ isActive, onEndCall, secretaryProfile }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-fadeIn backdrop-blur-md">
      <div className="flex flex-col items-center gap-8">
        
        {/* Visualizer Circle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 bg-presidential-gold/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-4 bg-presidential-gold/30 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="w-32 h-32 bg-gradient-to-br from-presidential-gold to-presidential-gold-light rounded-full shadow-[0_0_50px_rgba(197,160,89,0.5)] flex items-center justify-center z-10 overflow-hidden border-4 border-black">
             {secretaryProfile?.avatarUrl ? (
               <img src={secretaryProfile.avatarUrl} alt="Secretary" className="w-full h-full object-cover" />
             ) : (
               <div className="w-28 h-28 bg-[#0F172A] rounded-full flex items-center justify-center">
                  <span className="text-4xl text-presidential-gold font-serif">秘書</span>
               </div>
             )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-serif text-white tracking-widest mb-2">音声通話中</h2>
          <p className="text-presidential-gold font-mono text-lg">{formatTime(duration)}</p>
          <p className="text-gray-500 text-xs mt-2 bg-gray-800 px-3 py-1 rounded-full">暗号化回線で保護されています</p>
        </div>

        <div className="flex items-center gap-6 mt-8">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full border ${isMuted ? 'bg-white text-black' : 'bg-transparent text-white border-white/30'} hover:bg-white/10 transition-colors`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <button 
            onClick={onEndCall}
            className="p-4 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors scale-110"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveCallOverlay;