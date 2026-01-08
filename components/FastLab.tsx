import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Zap, FileText, CheckCheck, Loader2, Command, Sparkles, Clipboard, RefreshCw, Layers, Plus, Send, X, MessageSquare, Bot } from 'lucide-react';
import { saveToHistory, loadFromHistory } from '../utils/history';

const HISTORY_KEY = 'textgpt_fastlab_chat_v3';
const SYSTEM_LITERALS = "YOU MUST RESPOND USING ONLY ALPHABETIC CHARACTERS AND SPACES. DO NOT USE PUNCTUATION LIKE COLONS HYPHENS SLASHES PARENTHESES OR QUOTES. THE ONLY EXCEPTION IS DURING MATH CALCULATIONS WHERE YOU MAY USE PLUS MINUS MULTIPLY DIVIDE AND EQUALS SYMBOLS. OTHERWISE USE ONLY LETTERS.";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const FastLab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadFromHistory(HISTORY_KEY, []));
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'summarize' | 'grammar'>('summarize');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveToHistory(HISTORY_KEY, messages);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInput(prev => prev + (prev ? ' ' : '') + `[File content from ${file.name}] ` + content);
    };
    reader.readAsText(file);
  };

  const processText = async (customPrompt?: string) => {
    const textToProcess = customPrompt || input;
    if (!textToProcess.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToProcess };
    setMessages(prev => [...prev, userMsg]);
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

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are an elite linguistic processor. ${SYSTEM_LITERALS}`
        }
      });

      const response = await chat.sendMessage({ message: prompt });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Stream empty" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Neural link failure Action cancelled" }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Reset processor")) {
      setMessages([]);
      saveToHistory(HISTORY_KEY, []);
    }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-20 shrink-0 px-8 md:px-12 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white/5 p-2 rounded-xl border border-white/10 shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Fast Lab</h2>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Linguistic Utility Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-black p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setMode('summarize')} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'summarize' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Summarize
            </button>
            <button 
              onClick={() => setMode('grammar')} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'grammar' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Refine
            </button>
          </div>
          <button onClick={clearHistory} className="p-2 text-slate-700 hover:text-red-500 transition-colors"><RefreshCw size={16} /></button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar scroll-smooth bg-[radial-gradient(circle_at_50%_0%,_#0a0a0a_0%,_transparent_100%)]" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5 text-slate-700">
               <MessageSquare size={32} />
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-relaxed">
              Drop text or upload documents below to begin high speed neural processing
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
             <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-[24px] text-[14px] leading-relaxed ${
               msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none shadow-xl shadow-indigo-600/10' 
                : 'bg-[#080808] text-slate-200 border border-white/5 rounded-bl-none obsidian-shadow'
             }`}>
               <div className="whitespace-pre-wrap">{msg.text}</div>
             </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#080808] px-6 py-4 rounded-[24px] rounded-bl-none border border-white/5 flex items-center gap-4 text-indigo-400">
               <Loader2 size={16} className="animate-spin" />
               <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Processing Stream</span>
            </div>
          </div>
        )}
      </div>

      {/* Command Well */}
      <div className="p-6 md:p-10 bg-gradient-to-t from-[#020202] to-transparent shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#080808] border border-white/10 rounded-[32px] p-4 flex items-end gap-4 obsidian-shadow focus-within:border-indigo-500/30 transition-all">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json" />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-14 h-14 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0"
              title="Add Files (+)"
            >
              <div className="flex flex-col items-center">
                <Plus size={20} />
                <span className="text-[8px] font-bold mt-0.5">(+)</span>
              </div>
            </button>
            
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processText(); } }}
              placeholder="Paste text or describe action" 
              className="flex-1 bg-transparent border-none py-4 text-slate-200 focus:outline-none resize-none max-h-40 min-h-[56px] text-sm leading-relaxed placeholder:text-slate-800"
              rows={1}
            />

            <button 
              onClick={() => processText()}
              disabled={loading || !input.trim()}
              className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/20 transition-all active:scale-95 shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
          
          <div className="mt-4 flex justify-center gap-6 text-[9px] font-black text-slate-700 uppercase tracking-widest">
            <span className="flex items-center gap-2"><Sparkles size={10}/> Flash Mode Active</span>
            <span className="flex items-center gap-2"><Clipboard size={10}/> Fast Send (Enter)</span>
          </div>
        </div>
      </div>
    </div>
  );
};