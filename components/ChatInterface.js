import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Globe, Loader2, Paperclip, X, MessageCircle } from 'lucide-react';
import { SYSTEM_LITERALS } from '../constants.js';
import { Logo } from './Logo.js';

export const ChatInterface = ({ onCodeRequest }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setAttachment({ data: result.split(',')[1], mimeType: file.type, url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;
    
    const userMsg = { role: 'user', text: input, attachment: attachment ? { ...attachment } : null, timestamp: Date.now() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = useSearch ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
      const config = { systemInstruction: `You are TextGpt ai. ${SYSTEM_LITERALS}` };
      if (useSearch) config.tools = [{ googleSearch: {} }];

      const chat = ai.chats.create({ model, config });
      const response = userMsg.attachment 
        ? await chat.sendMessage({ message: [{ text: userMsg.text }, { inlineData: { mimeType: userMsg.attachment.mimeType, data: userMsg.attachment.data } }] })
        : await chat.sendMessage({ message: userMsg.text });
      
      const sources = [];
      response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach(c => { if (c.web) sources.push({ title: c.web.title, uri: c.web.uri }); });

      setMessages(p => [...p, { role: 'model', text: response.text, sources, timestamp: Date.now() }]);
    } catch (error) {
      setMessages(p => [...p, { role: 'model', text: "NEURAL_LINK_TIMEOUT", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] text-[#f8fafc] relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-[#080808] border border-white/5 p-1 rounded-full obsidian-shadow">
         <button onClick={() => setUseSearch(true)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${useSearch ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-600 hover:text-white'}`}>Web Grounded</button>
         <button onClick={() => setUseSearch(false)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${!useSearch ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-600 hover:text-white'}`}>Core Node</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-24 py-20 space-y-12 no-scrollbar" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-12 animate-float">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 obsidian-shadow">
              <Logo size={40} />
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-normal tracking-tighter text-white uppercase italic">Nexus Hub JS</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium uppercase tracking-[0.2em]">High performance vanilla linguistic node</p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-6 md:p-8 rounded-[32px] text-[15px] border border-white/5 ${msg.role === 'user' ? 'bg-[#080808] text-white border-white/10' : 'bg-[#050505] text-slate-300'}`}>
              {msg.attachment && <img src={msg.attachment.url} className="mb-4 max-h-[400px] rounded-2xl" />}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.sources?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  {msg.sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" className="text-[10px] bg-white/5 px-3 py-1 rounded-full text-indigo-400 hover:text-white transition-colors">{s.title || 'Source'}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-12 shrink-0 bg-gradient-to-t from-[#020202] to-transparent">
        <div className="max-w-4xl mx-auto relative bg-[#080808] border border-white/5 rounded-[40px] p-4 flex items-end gap-4 obsidian-shadow">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-600 hover:text-indigo-400"><Paperclip size={20} /></button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Enter neural command..."
            className="flex-1 bg-transparent border-none text-[#f8fafc] py-4 focus:outline-none resize-none max-h-56 text-[15px] placeholder:text-slate-800"
            rows={1}
          />
          <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 p-4 rounded-full text-white shadow-2xl hover:bg-indigo-500 transition-all"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};