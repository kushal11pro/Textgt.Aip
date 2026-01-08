import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Eye, Upload, Loader2, ArrowRight, Scan, Shield, Activity, Image as ImageIcon, Search, Info, Plus, Send, X, MessageSquare } from 'lucide-react';
import { saveToHistory, loadFromHistory } from '../utils/history';

const HISTORY_KEY = 'textgpt_vision_analysis_v3';
const SYSTEM_LITERALS = "YOU MUST RESPOND USING ONLY ALPHABETIC CHARACTERS AND SPACES. DO NOT USE PUNCTUATION LIKE COLONS HYPHENS SLASHES PARENTHESES OR QUOTES. THE ONLY EXCEPTION IS DURING MATH CALCULATIONS WHERE YOU MAY USE PLUS MINUS MULTIPLY DIVIDE AND EQUALS SYMBOLS. OTHERWISE USE ONLY LETTERS.";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const VisionInterface: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setMessages([]);
      setChatInput('');
    }
  };

  const startAnalysis = async (userPrompt?: string) => {
    if (!preview || isLoading) return;
    const prompt = userPrompt || "Perform a deep technical analysis of this image Identify subjects environment lighting and composition details";
    
    const userMsg: ChatMessage = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: `You are an elite vision processor. ${SYSTEM_LITERALS}`
        },
        contents: {
          parts: [
            { inlineData: { mimeType: selectedFile?.type || 'image/jpeg', data: preview.split(',')[1] } }, 
            { text: prompt }
          ]
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Empty telemetry" }]);
    } catch (error) { 
      setMessages(prev => [...prev, { role: 'model', text: "Telemetry failure Neural link offline" }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Area */}
        <div className="w-full lg:w-1/2 border-r border-white/5 bg-[#050505] flex flex-col p-6 md:p-10 shrink-0 overflow-y-auto custom-scrollbar">
           <div className="mb-10 space-y-2">
               <div className="flex items-center gap-4">
                 <div className="bg-indigo-600/10 p-3 rounded-2xl border border-indigo-500/20 shadow-xl">
                   <Eye size={24} className="text-indigo-400" />
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Target Vision</h2>
               </div>
               <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] ml-1">Multimodal Optic Lab</p>
           </div>

           <div className="relative group flex-1 flex flex-col items-center justify-center">
             <div className="absolute -inset-1 bg-indigo-600 opacity-5 blur-3xl group-hover:opacity-10 pointer-events-none" />
             <div className="w-full max-w-lg aspect-square border-2 border-dashed border-white/10 rounded-[40px] bg-[#080808] relative overflow-hidden obsidian-shadow transition-all group-hover:border-indigo-500/20 flex flex-col items-center justify-center p-4">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                
                {preview ? (
                  <div className="relative w-full h-full rounded-[32px] overflow-hidden group">
                     <img src={preview} className="w-full h-full object-contain" alt="Target" />
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
                       title="Change Image (+)"
                     >
                        <div className="flex flex-col items-center">
                          <Plus size={20} />
                          <span className="text-[8px] font-bold">(+)</span>
                        </div>
                     </button>
                     {isLoading && (
                       <div className="absolute inset-0 z-10">
                         <div className="w-full h-1 bg-indigo-500 absolute top-0 animate-scan shadow-[0_0_20px_rgba(99,102,241,0.8)]" />
                         <div className="w-full h-full bg-indigo-500/5 backdrop-blur-[2px]" />
                       </div>
                     )}
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mx-auto hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-2xl"
                    >
                      <div className="flex flex-col items-center">
                        <Plus size={32} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-700 mt-1">(+)</span>
                      </div>
                    </button>
                    <div>
                      <p className="text-lg font-black text-white uppercase tracking-tighter">Initialize Signal</p>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Upload target for optical analysis</p>
                    </div>
                  </div>
                )}
             </div>
           </div>
        </div>

        {/* Right Area */}
        <div className="flex-1 flex flex-col bg-[#020202] relative min-w-0 h-full">
           <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar scroll-smooth" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-6">
                   <div className="w-14 h-14 bg-indigo-600/10 rounded-full flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                     <Search size={24} />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest">Awaiting Analysis</h3>
                     <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] leading-relaxed">
                       Initialize the target on the left to begin deep technical extraction
                     </p>
                   </div>
                   {preview && (
                     <button 
                        onClick={() => startAnalysis()}
                        className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-2xl hover:bg-slate-200 transition-all active:scale-95"
                     >
                       Engage Scanner
                     </button>
                   )}
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                     <div className={`p-6 md:p-8 rounded-[28px] text-[14px] leading-relaxed shadow-2xl ${
                        msg.role === 'user' 
                         ? 'bg-indigo-600 text-white rounded-br-none max-w-[85%]' 
                         : 'bg-[#080808] text-slate-200 border border-white/5 rounded-bl-none max-w-[95%] font-mono text-[13px]'
                     }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                     </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#080808] px-6 py-4 rounded-[28px] rounded-bl-none border border-white/5 flex items-center gap-4 text-indigo-400">
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Running Optic Engine</span>
                  </div>
                </div>
              )}
           </div>

           <div className="p-6 md:p-10 bg-gradient-to-t from-[#020202] to-transparent shrink-0">
              <div className="max-w-2xl mx-auto">
                 <div className="bg-[#080808] border border-white/10 rounded-[32px] p-3 flex items-end gap-3 obsidian-shadow focus-within:border-indigo-500/30 transition-all">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-500 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0"
                      title="Add Image (+)"
                    >
                      <div className="flex flex-col items-center">
                        <Plus size={18} />
                        <span className="text-[7px] font-black mt-0.5">(+)</span>
                      </div>
                    </button>
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startAnalysis(chatInput); } }}
                      placeholder="Ask follow up" 
                      className="flex-1 bg-transparent border-none py-3 px-2 text-slate-200 focus:outline-none resize-none max-h-32 min-h-[48px] text-sm leading-relaxed placeholder:text-slate-800"
                      rows={1}
                      disabled={!preview}
                    />
                    <button 
                      onClick={() => startAnalysis(chatInput)}
                      disabled={isLoading || !chatInput.trim() || !preview}
                      className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/20 transition-all active:scale-90 shrink-0"
                    >
                      <Send size={18} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};