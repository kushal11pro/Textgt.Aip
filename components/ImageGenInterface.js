import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Download, Zap, Key, Clock, Trash2, Maximize2, Layers, Sparkles, ChevronRight, Share2, X, Loader2 } from 'lucide-react';
import { ImageResolution } from '../constants.js';
import { saveToHistory, loadFromHistory } from '../utils/history.js';

const HISTORY_KEY = 'textgpt_image_history_v3';

export const ImageGenInterface = () => {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState(ImageResolution.RES_1K);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => loadFromHistory(HISTORY_KEY, []));

  useEffect(() => { saveToHistory(HISTORY_KEY, history); }, [history]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true); setError(null); setGeneratedImage(null);

    try {
      let model = 'gemini-2.5-flash-image';
      let imageConfig = { aspectRatio: '1:1' };

      if (resolution !== ImageResolution.RES_1K) {
        const win = window;
        if (win.aistudio) {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await win.aistudio.openSelectKey();
          }
        }
        model = 'gemini-3-pro-image-preview';
        imageConfig.imageSize = resolution;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig }
      });

      let dataUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) { 
            dataUrl = `data:image/png;base64,${part.inlineData.data}`; 
            break; 
          }
        }
      }

      if (dataUrl) {
        setGeneratedImage(dataUrl);
        setHistory(prev => [{ id: Date.now(), prompt, image: dataUrl, timestamp: Date.now() }, ...prev].slice(0, 8));
      } else {
        setError('Synthesis engine returned null data.');
      }
    } catch (err) {
      if (err.message?.includes("Requested entity was not found")) {
        const win = window;
        if (win.aistudio) await win.aistudio.openSelectKey();
      }
      setError("Forge Interruption: Check system link.");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-[420px] border-r border-white/5 bg-[#050505] p-8 space-y-10 overflow-y-auto shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/10 p-2 rounded-xl border border-indigo-500/20 shadow-lg">
                <Layers size={20} className="text-indigo-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Forge Studio</h2>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Neural Vision Synthesis Engine</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visual Prompt</label>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="A high-contrast cinematic shot of a neon monolith in a void..." 
                className="w-full h-40 bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-800" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fidelity Grade</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#0a0a0a] rounded-2xl border border-white/5">
                {Object.values(ImageResolution).map((res) => (
                  <button 
                    key={res} 
                    onClick={() => setResolution(res)} 
                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      resolution === res ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isLoading || !prompt} 
              className="w-full bg-white hover:bg-slate-200 disabled:opacity-20 text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
              {isLoading ? 'Synthesizing...' : 'Ignite Forge'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <X size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4 pt-6 border-t border-white/5">
             <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Previous Works</h3>
               <button onClick={() => setHistory([])} className="text-slate-700 hover:text-red-400"><Trash2 size={14}/></button>
             </div>
             <div className="grid grid-cols-4 gap-2">
               {history.map(item => (
                 <button 
                  key={item.id} 
                  onClick={() => setGeneratedImage(item.image)}
                  className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all group"
                 >
                   <img src={item.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Historical" />
                 </button>
               ))}
             </div>
          </div>
        </aside>

        <main className="flex-1 bg-[#020202] flex flex-col items-center justify-center p-8 lg:p-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#4338ca_0%,_transparent_70%)]" />
          </div>

          {!generatedImage && !isLoading && (
            <div className="text-center space-y-6 relative">
               <div className="w-24 h-24 bg-indigo-600/5 rounded-[48px] flex items-center justify-center border border-indigo-500/10 mx-auto">
                 <ImageIcon size={40} className="text-indigo-900" />
               </div>
               <div>
                 <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Awaiting Signal</h3>
                 <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Describe a vision to begin synthesis</p>
               </div>
            </div>
          )}

          {isLoading && (
            <div className="relative w-full max-w-2xl aspect-square flex flex-col items-center justify-center border border-white/10 rounded-[40px] obsidian-shadow animate-pulse bg-white/5">
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <span className="text-[12px] font-black uppercase tracking-[0.5em] text-indigo-400 z-10">Neural Rendering...</span>
            </div>
          )}

          {generatedImage && !isLoading && (
            <div className="w-full max-w-2xl relative group">
               <div className="absolute -inset-1 bg-indigo-600 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity rounded-[40px]" />
               <div className="relative bg-[#050505] rounded-[40px] overflow-hidden border border-white/10 obsidian-shadow">
                  <img src={generatedImage} className="w-full aspect-square object-cover" alt="Synthesized" />
                  <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                     <div className="space-y-1">
                        <p className="text-white font-black text-xs uppercase tracking-widest">Forge Result</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">{resolution} Synthesis Grade</p>
                     </div>
                     <div className="flex gap-4">
                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"><Share2 size={20}/></button>
                        <a 
                          href={generatedImage} 
                          download={`textgpt-${Date.now()}.png`}
                          className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-xl"
                        >
                          <Download size={20} />
                        </a>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};