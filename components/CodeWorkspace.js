import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { FileCode, FileJson, FileText, Hash, Layout, Files, Search, Send, MessageCircle, AlertTriangle, Zap, Github, RefreshCcw } from 'lucide-react';
import { saveToHistory, loadFromHistory } from '../utils/history.js';
import { SYSTEM_LITERALS } from '../constants.js';

const FILES_KEY = 'textgpt_code_files_v4_pro';
const CHAT_KEY = 'textgpt_code_chat_v4_pro';

export const CodeWorkspace = ({ initialPrompt, onClearInitialPrompt }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [files, setFiles] = useState(() => loadFromHistory(FILES_KEY, []));
  const [activeFile, setActiveFile] = useState(files[0]?.filename || null);
  const [chatHistory, setChatHistory] = useState(() => loadFromHistory(CHAT_KEY, []));
  const [activeView, setActiveView] = useState('code');
  const [sidebarTab, setSidebarTab] = useState('chat');
  const scrollRef = useRef(null);

  useEffect(() => { saveToHistory(FILES_KEY, files); }, [files]);
  useEffect(() => { saveToHistory(CHAT_KEY, chatHistory); }, [chatHistory]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [chatHistory, isGenerating]);

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'ts': case 'jsx': case 'tsx': return <FileCode className="text-yellow-400" size={14} />;
      case 'html': return <Layout className="text-orange-500" size={14} />;
      case 'css': return <Hash className="text-blue-400" size={14} />;
      case 'json': return <FileJson className="text-purple-400" size={14} />;
      default: return <FileText className="text-slate-500" size={14} />;
    }
  };

  const handleGenerate = async (overridePrompt) => {
    const text = overridePrompt || prompt;
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true); setPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const schema = { 
        type: Type.OBJECT, 
        properties: { 
          explanation: { type: Type.STRING }, 
          files: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { filename: { type: Type.STRING }, content: { type: Type.STRING }, language: { type: Type.STRING } }, 
              required: ["filename", "content", "language"] 
            } 
          } 
        }, 
        required: ["files", "explanation"] 
      };
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Generate project for ${text}`, 
        config: { systemInstruction: SYSTEM_LITERALS, responseMimeType: 'application/json', responseSchema: schema } 
      });
      const result = JSON.parse(response.text);
      setChatHistory(prev => [...prev, { role: 'model', text: result.explanation }]);
      if (result.files) {
        setFiles(result.files);
        setActiveFile(result.files[0].filename);
      }
    } catch (e) { console.error(e); }
    finally { setIsGenerating(false); if (onClearInitialPrompt) onClearInitialPrompt(); }
  };

  useEffect(() => { if (initialPrompt) handleGenerate(initialPrompt); }, [initialPrompt]);

  const activeFileContent = files.find(f => f.filename === activeFile);

  return (
    <div className="flex h-full bg-[#020202] text-[#f8fafc] overflow-hidden font-sans">
      <div className="w-12 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-[#050505]">
         <button onClick={() => setSidebarTab('chat')} className={`p-2 rounded-xl transition-all ${sidebarTab === 'chat' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-700'}`}><MessageCircle size={20} /></button>
         <button onClick={() => setSidebarTab('explorer')} className={`p-2 rounded-xl transition-all ${sidebarTab === 'explorer' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-700'}`}><Files size={20} /></button>
      </div>

      <div className="w-72 border-r border-white/5 flex flex-col bg-[#050505]">
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarTab === 'chat' ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`p-4 rounded-2xl border text-xs ${msg.role === 'user' ? 'bg-[#080808] border-white/10' : 'bg-white/5 border-white/5 text-slate-400'}`}>{msg.text}</div>
                ))}
              </div>
              <div className="p-4 border-t border-white/5">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }} placeholder="Instruct..." className="w-full bg-[#020202] border border-white/5 rounded-xl p-4 text-[12px] outline-none h-20" />
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {files.map(f => (
                <button key={f.filename} onClick={() => { setActiveFile(f.filename); setActiveView('code'); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs ${activeFile === f.filename ? 'bg-white/5 text-white' : 'text-slate-600'}`}>
                  {getFileIcon(f.filename)} <span className="truncate">{f.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#020202]">
        <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-[#050505]">
           <div className="flex gap-2">
              <button onClick={() => setActiveView('code')} className={`px-4 py-1 rounded-lg text-[10px] ${activeView === 'code' ? 'bg-indigo-600' : 'text-slate-500'}`}>Code</button>
              <button onClick={() => setActiveView('preview')} className={`px-4 py-1 rounded-lg text-[10px] ${activeView === 'preview' ? 'bg-indigo-600' : 'text-slate-500'}`}>Preview</button>
           </div>
        </div>
        <div className="flex-1 flex">
           {activeView === 'code' ? (
             <textarea className="w-full h-full bg-transparent text-slate-300 font-mono text-[13px] p-6 outline-none resize-none" value={activeFileContent?.content || ''} readOnly />
           ) : (
             <iframe className="flex-1 bg-white border-none" srcDoc={activeFileContent?.content || ''} />
           )}
        </div>
        <div className="h-6 bg-indigo-600 flex items-center px-4 text-white text-[9px] font-black uppercase tracking-widest">
           {isGenerating ? 'Synthesizing...' : 'Passive Mode'}
        </div>
      </div>
    </div>
  );
};