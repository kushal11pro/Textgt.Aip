import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Zap, Loader2, Send, Plus, RefreshCw, MessageSquare } from 'lucide-react';
import { SYSTEM_LITERALS } from '../constants.js';
import { saveToHistory, loadFromHistory } from '../utils/history.js';

const HISTORY_KEY = 'textgpt_fastlab_chat_v3';

export const FastLab = () => {
  const [messages, setMessages] = useState(() => loadFromHistory(HISTORY_KEY, []));
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('summarize');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    saveToHistory(HISTORY_KEY, messages);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const processText = async (customPrompt) => {
    const textToProcess = customPrompt || input;
    if (!textToProcess.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: textToProcess }]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = textToProcess;
      if (!customPrompt) {
          prompt = mode === 'summarize' 
            ? `Synthesize this into a high density executive summary ${textToProcess}` 
            : `Refine this for professional clarity and flawless grammar ${textToProcess}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: `You are an elite linguistic processor. ${SYSTEM_LITERALS}` },
        contents: prompt
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Stream empty" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Neural link failure Action cancelled" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans">
      <header className="h-20 shrink-0 px-12 border-b border-white/5 bg-[#050505] flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Zap size={20} className="text-white" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Fast Lab</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-black p-1 rounded-xl border border-white/5">
            <button onClick={() => setMode('summarize')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${mode === 'summarize' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Summarize</button>
            <button onClick={() => setMode('grammar')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${mode === 'grammar' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Refine</button>
          </div>
          <button onClick={() => setMessages([])} className="p-2 text-slate-700"><RefreshCw size={16} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-12 space-y-8" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <MessageSquare size={32} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Drop text below to begin high speed neural processing</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[85%] p-6 rounded-[24px] text-[14px] ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[#080808] text-slate-200 border border-white/5'}`}>
               <div className="whitespace-pre-wrap">{msg.text}</div>
             </div>
          </div>
        ))}
        {loading && <div className="text-indigo-400 text-[10px] font-black uppercase animate-pulse">Processing Stream...</div>}
      </div>

      <div className="p-10 shrink-0 bg-[#020202]">
        <div className="max-w-4xl mx-auto flex items-end gap-4 bg-[#080808] border border-white/10 rounded-[32px] p-4">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processText(); } }}
            placeholder="Paste text or describe action" 
            className="flex-1 bg-transparent border-none py-4 text-slate-200 focus:outline-none resize-none max-h-40 text-sm"
            rows={1}
          />
          <button onClick={() => processText()} disabled={loading || !input.trim()} className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center transition-all">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};