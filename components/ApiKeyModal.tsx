import React from 'react';
import { Key, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { hasValidKey } from '../utils/apiKey';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const handleSelectKeyFromStudio = async () => {
    const win = window as any;
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-2">
                <Key className="text-indigo-400" size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Model Access
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Gemini API key to unlock the full potential of TextGpt, including multimodal analysis and video generation.
              </p>
            </div>
            {hasValidKey() && (
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <ShieldCheck size={14} />
                Secure Connection
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your key is stored only in your browser's environment and is never transmitted to our servers. High-tier features like Veo 3.1 may require a project with billing enabled.
              </p>
            </div>

            <button
              onClick={handleSelectKeyFromStudio}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/10 active:scale-95"
            >
              <Key size={18} />
              Select API Key
            </button>

            <div className="pt-4 border-t border-slate-800 text-center">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
              >
                Billing & Limits Documentation <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};