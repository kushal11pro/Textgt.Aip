import React from 'react';
import { Key, X, ShieldCheck } from 'lucide-react';

export const ApiKeyModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const handleSelectKeyFromStudio = async () => {
    const win = window;
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Key className="text-indigo-400" size={24} />
              <h2 className="text-xl font-black text-white uppercase">Model Access</h2>
              <p className="text-xs text-slate-400">Connect your Gemini API key to unlock full potential.</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
          </div>
          <button onClick={handleSelectKeyFromStudio} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95">
            <Key size={18} /> Select API Key
          </button>
        </div>
      </div>
    </div>
  );
};