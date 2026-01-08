
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Schema, Type } from '@google/genai';
import { 
  Play, Code, Loader2, Send, Terminal, FolderPlus, Trash2, 
  MessageSquare, ChevronRight, FileJson, FileCode, FileText, 
  Hash, Coffee, Binary, Layout, Files, Search, Settings, Cpu, 
  Github, Sparkles, Zap, AlertTriangle, Monitor, RefreshCcw,
  // Added MessageCircle to imports
  MessageCircle
} from 'lucide-react';
import { CodeFile } from '../types';
import { saveToHistory, loadFromHistory, clearHistory } from '../utils/history';

const FILES_KEY = 'textgpt_code_files_v4_pro';
const CHAT_KEY = 'textgpt_code_chat_v4_pro';
const SYSTEM_LITERALS = "YOUR EXPLANATION MUST USE ONLY ALPHABETIC CHARACTERS AND SPACES DO NOT USE PUNCTUATION LIKE COLONS HYPHENS SLASHES PARENTHESES OR QUOTES THE CODE ITSELF MUST REMAIN FUNCTIONAL BUT THE TEXT EXPLANATION FIELD MUST BE STRICTLY LETTERS";

type ViewMode = 'code' | 'preview';
type SidebarTab = 'chat' | 'explorer' | 'search';

export const CodeWorkspace: React.FC<{ initialPrompt?: string; onClearInitialPrompt?: () => void; }> = ({ initialPrompt, onClearInitialPrompt }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [files, setFiles] = useState<CodeFile[]>(() => loadFromHistory(FILES_KEY, []));
  const [activeFile, setActiveFile] = useState<string | null>(files[0]?.filename || null);
  const [chatHistory, setChatHistory] = useState(() => loadFromHistory(CHAT_KEY, []));
  const [activeView, setActiveView] = useState<ViewMode>('code');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveToHistory(FILES_KEY, files); }, [files]);
  useEffect(() => { saveToHistory(CHAT_KEY, chatHistory); }, [chatHistory]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [chatHistory, isGenerating]);

  const lintErrors = useMemo(() => {
    const currentFile = files.find(f => f.filename === activeFile);
    if (!currentFile) return new Set<number>();
    const errors = new Set<number>();
    const lines = currentFile.content.split('\n');
    lines.forEach((line, index) => {
      const quotes = (line.match(/"/g) || []).length;
      const singleQuotes = (line.match(/'/g) || []).length;
      if (quotes % 2 !== 0 || singleQuotes % 2 !== 0) errors.add(index);
    });
    return errors;
  }, [files, activeFile]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'ts': case 'jsx': case 'tsx': return <FileCode className="text-yellow-400" size={14} />;
      case 'html': return <Layout className="text-orange-500" size={14} />;
      case 'css': return <Hash className="text-blue-400" size={14} />;
      case 'json': return <FileJson className="text-purple-400" size={14} />;
      default: return <FileText className="text-slate-500" size={14} />;
    }
  };

  const ingestFilesLive = async (newFiles: CodeFile[]) => {
    for (const file of newFiles) {
      setFiles(prev => {
        const existing = prev.find(f => f.filename === file.filename);
        if (existing) return prev.map(f => f.filename === file.filename ? { ...f, content: '' } : f);
        return [...prev, { ...file, content: '' }];
      });
      setActiveFile(file.filename);
      const chunks = file.content.split('\n');
      let currentText = "";
      for (const chunk of chunks) {
        currentText += chunk + '\n';
        setFiles(prev => prev.map(f => f.filename === file.filename ? { ...f, content: currentText } : f));
        await new Promise(r => setTimeout(r, 15));
      }
    }
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const text = overridePrompt || prompt;
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true); setPrompt(''); setGenerationStep('Compiling Architecture');
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const schema: Schema = { 
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
        contents: [{ role: 'user', parts: [{ text: `Generate project for ${text}` }] }], 
        config: { systemInstruction: SYSTEM_LITERALS, responseMimeType: 'application/json', responseSchema: schema } 
      });
      const result = JSON.parse(response.text);
      setChatHistory(prev => [...prev, { role: 'model', text: result.explanation }]);
      if (result.files) await ingestFilesLive(result.files);
    } catch (e: any) { setTerminalOutput(p => [...p, `CORE ERROR: ${e.message}`]); }
    finally { setIsGenerating(false); setGenerationStep(''); if (onClearInitialPrompt) onClearInitialPrompt(); }
  };

  useEffect(() => { if (initialPrompt) handleGenerate(initialPrompt); }, [initialPrompt]);

  const activeFileContent = files.find(f => f.filename === activeFile);

  return (
    <div className="flex h-full bg-[#020202] text-[#f8fafc] overflow-hidden select-none font-sans">
      
      {/* Codespace Sidebar (Narrow) */}
      <div className="w-12 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-[#050505] shrink-0">
         <button onClick={() => setSidebarTab('chat')} className={`p-2 rounded-xl transition-all ${sidebarTab === 'chat' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-700 hover:text-white'}`}><MessageCircle size={20} /></button>
         <button onClick={() => setSidebarTab('explorer')} className={`p-2 rounded-xl transition-all ${sidebarTab === 'explorer' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-700 hover:text-white'}`}><Files size={20} /></button>
         <button onClick={() => setSidebarTab('search')} className={`p-2 rounded-xl transition-all ${sidebarTab === 'search' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-700 hover:text-white'}`}><Search size={20} /></button>
      </div>

      {/* Side Panel Content */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-[#050505] shrink-0">
        <div className="h-12 flex items-center px-5 border-b border-white/5 bg-[#080808]">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{sidebarTab}</span>
        </div>

        <div className="flex-1 overflow-hidden">
          {sidebarTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-[13px]" ref={scrollRef}>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${msg.role === 'user' ? 'bg-[#080808] border-white/10' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-700 mb-2">{msg.role}</div>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#080808]">
                 <div className="relative">
                    <textarea 
                      value={prompt} 
                      onChange={e => setPrompt(e.target.value)} 
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }} 
                      placeholder="Instruct Codespace..." 
                      className="w-full bg-[#020202] border border-white/5 rounded-2xl p-4 text-[12px] focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-24 placeholder:text-slate-800" 
                    />
                    <button onClick={() => handleGenerate()} disabled={isGenerating || !prompt.trim()} className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-xl"><Send size={14} /></button>
                 </div>
              </div>
            </div>
          )}
          {sidebarTab === 'explorer' && (
            <div className="p-4 space-y-1">
              {files.map(f => (
                <button 
                  key={f.filename} 
                  onClick={() => { setActiveFile(f.filename); setActiveView('code'); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs transition-all ${activeFile === f.filename ? 'bg-white/5 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  {getFileIcon(f.filename)} <span className="truncate">{f.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Hub */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#020202]">
        <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-[#050505]">
           <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full">
              {files.map(f => (
                <button key={f.filename} onClick={() => { setActiveFile(f.filename); setActiveView('code'); }} className={`h-full flex items-center gap-2 px-6 text-[11px] font-bold transition-all ${activeFile === f.filename ? 'bg-[#020202] text-white border-x border-white/5' : 'text-slate-600'}`}>
                  {getFileIcon(f.filename)} <span>{f.filename}</span>
                </button>
              ))}
           </div>
           <div className="flex gap-2">
              <button onClick={() => setActiveView(activeView === 'preview' ? 'code' : 'preview')} className={`px-4 py-1.5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest ${activeView === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Preview</button>
              <button className="bg-emerald-600 text-white px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/10"><Zap size={12} fill="currentColor" /> Compile</button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
           {activeView === 'code' ? (
             <>
               <div className="w-12 bg-[#050505] border-r border-white/5 flex flex-col items-center pt-6 text-[10px] text-slate-800 font-mono select-none">
                  {(activeFileContent?.content.split('\n') || []).map((_, i) => (
                    <div key={i} className={`h-6 leading-6 ${lintErrors.has(i) ? 'text-red-500 bg-red-950/20 w-full text-center' : ''}`}>{i + 1}</div>
                  ))}
               </div>
               <div className="flex-1 relative">
                  <textarea 
                    className="w-full h-full bg-transparent text-slate-300 font-mono text-[13px] p-6 outline-none resize-none leading-6 selection:bg-indigo-500/20" 
                    value={activeFileContent?.content || ''} 
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setFiles(prev => prev.map(f => f.filename === activeFile ? { ...f, content: newContent } : f));
                    }}
                    spellCheck={false} 
                  />
                  {lintErrors.size > 0 && (
                    <div className="absolute bottom-4 right-6 bg-red-600 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl"><AlertTriangle size={10} /> {lintErrors.size} Semantic Alerts</div>
                  )}
               </div>
             </>
           ) : (
             <iframe className="flex-1 bg-white border-none shadow-2xl" srcDoc={activeFileContent?.content || ''} />
           )}
        </div>

        <div className="h-6 bg-indigo-600 flex items-center px-4 justify-between text-white text-[9px] font-black uppercase tracking-[0.2em] shrink-0">
           <div className="flex gap-6">
              <span className="flex items-center gap-2"><Github size={10} /> Localmaster</span>
              <span className="opacity-80 flex items-center gap-2"><RefreshCcw size={10} className={isGenerating ? 'animate-spin' : ''} /> {isGenerating ? 'Synthesizing...' : 'Passive Mode'}</span>
           </div>
           <span>Codespace v4.0 Pro</span>
        </div>
      </div>
    </div>
  );
};
