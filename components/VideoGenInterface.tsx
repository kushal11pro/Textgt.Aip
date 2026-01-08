

import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Video, Download, Loader2, Info, X, Zap, Clapperboard, Film, Play, Maximize2, Monitor, Cpu } from 'lucide-react';

export const VideoGenInterface: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    // Mandatory API key selection check for Veo models
    const win = window as any;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await win.aistudio.openSelectKey();
        // Proceeding as per the assumption of successful selection
      }
    }

    setIsGenerating(true); setError(null); setVideoUrl(null); setStatus('System Warm-up');

    try {
      // Re-initialize GoogleGenAI right before the call to pick up the updated API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setStatus('Linking Veo Motion Engine');
      // FIXED: Specify numberOfVideos: 1 in the video generation configuration.
      let op = await ai.models.generateVideos({ 
        model: 'veo-3.1-fast-generate-preview', 
        prompt, 
        config: { 
          numberOfVideos: 1,
          resolution: '720p', 
          aspectRatio: '16:9' 
        } 
      });

      while (!op.done) {
        setStatus('Synthesizing Temporal Frames');
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }

      const downloadUri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadUri) {
          // Append the API key to the download URL as per guidelines
          setVideoUrl(`${downloadUri}&key=${process.env.API_KEY}`);
          setStatus('');
      } else {
          setError("Engine failure: Sequence URI null.");
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        // Handle race conditions/invalid keys by re-opening the selection dialog
        const win = window as any;
        if (win.aistudio) await win.aistudio.openSelectKey();
      }
      setError(err.message || "Temporal logic error.");
    } finally { setIsGenerating(false); if (!videoUrl) setStatus(''); }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/10 to-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative z-10">
        <div className="max-w-5xl mx-auto space-y-16">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-xl">
                   <Film size={32} className="text-white" />
                 </div>
                 <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Veo Motion</h2>
              </div>
              <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.4em] ml-1">Cinematic Neural Production Engine</p>
            </div>
            <div className="flex gap-8">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Standard</span>
                  <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10">720P HD</span>
               </div>
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Compute</span>
                  <span className="text-xs font-bold text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/10 flex items-center gap-2"><Cpu size={12}/> VEO-3.1</span>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            <div className="lg:col-span-4 space-y-8">
               <div className="bg-[#050505] border border-white/5 rounded-[32px] p-8 space-y-8 obsidian-shadow">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motion Prompt</label>
                    <textarea 
                      value={prompt} 
                      onChange={e => setPrompt(e.target.value)} 
                      placeholder="High-speed chase through a neon-lit cyber city..." 
                      className="w-full h-48 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-800" 
                    />
                  </div>
                  <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt.trim()} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Clapperboard size={20} />}
                    {isGenerating ? 'Synthesizing...' : 'Action'}
                  </button>
               </div>

               {error && (
                 <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-[24px] flex flex-col gap-2 animate-in slide-in-from-left-4">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Production Error</p>
                    <p className="text-xs text-red-400 font-medium leading-relaxed">{error}</p>
                 </div>
               )}
            </div>

            <div className="lg:col-span-8 flex flex-col gap-8">
               {!videoUrl && !isGenerating && (
                 <div className="aspect-video bg-[#050505] border border-white/5 border-dashed rounded-[40px] flex flex-col items-center justify-center text-center p-12 space-y-6">
                    <div className="w-24 h-24 bg-white/5 rounded-[48px] flex items-center justify-center border border-white/10">
                      <Monitor size={40} className="text-slate-800" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter">Production Stage</h4>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">Ready for cinematic sequence input</p>
                    </div>
                 </div>
               )}

               {isGenerating && (
                 <div className="aspect-video bg-[#050505] border border-white/10 rounded-[40px] flex flex-col items-center justify-center space-y-10 obsidian-shadow animate-pulse">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play size={32} className="text-indigo-400 fill-indigo-400 opacity-50" />
                      </div>
                    </div>
                    <div className="text-center space-y-3">
                       <p className="text-white font-black text-lg uppercase tracking-tighter">{status}</p>
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">Rendering Temporal Consistency</p>
                    </div>
                 </div>
               )}

               {videoUrl && !isGenerating && (
                 <div className="space-y-6 animate-in zoom-in duration-1000">
                    <div className="bg-[#050505] rounded-[48px] overflow-hidden border border-white/10 obsidian-shadow aspect-video relative group">
                       <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
                       <div className="absolute top-6 right-6 p-4 bg-black/50 backdrop-blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
                          <Maximize2 size={24} className="text-white cursor-pointer" />
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#050505] border border-white/5 p-6 rounded-[32px]">
                       <div className="flex gap-8">
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Format</span>
                             <span className="text-xs font-bold text-white">MP4 / H.264</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Duration</span>
                             <span className="text-xs font-bold text-white">6 Seconds</span>
                          </div>
                       </div>
                       <a href={videoUrl} download="textgpt-motion.mp4" className="bg-white hover:bg-slate-200 text-black px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-2xl shadow-white/5">
                          <Download size={18} /> Export Sequence
                       </a>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
