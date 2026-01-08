

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Schema } from '@google/genai';
import { Mic, MicOff, Activity, Image as ImageIcon, X, Download, Loader2, FileCode, ExternalLink, Globe, Smartphone, Sparkles, Youtube, MessageSquare, Phone, Instagram, Facebook } from 'lucide-react';
import { decodeAudioData, createPcmBlob, base64ToUint8Array } from '../utils/audioUtils';
import { saveToHistory, loadFromHistory } from '../utils/history';

interface ActionCard {
  type: 'link' | 'image' | 'code' | 'youtube' | 'whatsapp' | 'social' | 'call';
  title: string;
  url?: string;
  content?: string;
  icon?: any;
}

const SYSTEM_LITERALS = "YOU MUST RESPOND USING ONLY ALPHABETIC CHARACTERS AND SPACES. DO NOT USE PUNCTUATION LIKE COLONS HYPHENS SLASHES PARENTHESES OR QUOTES. THE ONLY EXCEPTION IS DURING MATH CALCULATIONS WHERE YOU MAY USE PLUS MINUS MULTIPLY DIVIDE AND EQUALS SYMBOLS. OTHERWISE USE ONLY LETTERS.";

export const LiveSession: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [activeCard, setActiveCard] = useState<ActionCard | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animRef = useRef<number>(0);

  const cleanup = () => {
    if (sessionRef.current) { sessionRef.current.then(s => s.close()); sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    scheduledSources.current.forEach(s => s.stop());
    scheduledSources.current.clear();
    setIsConnected(false); setStatus('disconnected'); setIsSpeaking(false);
    setActiveCard(null); setIsProcessingTool(false);
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are TextGpt ai. You are a helpful female AI assistant with a friendly girl persona. ${SYSTEM_LITERALS}`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        },
        callbacks: {
          onopen: () => {
            setStatus('connected'); setIsConnected(true);
            const source = inputContextRef.current!.createMediaStreamSource(stream);
            const processor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(processor);
            processor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setIsSpeaking(true);
              const buffer = await decodeAudioData(base64ToUint8Array(audioData), audioContextRef.current, 24000, 1);
              const src = audioContextRef.current.createBufferSource();
              src.buffer = buffer; src.connect(audioContextRef.current.destination);
              src.onended = () => { scheduledSources.current.delete(src); if (scheduledSources.current.size === 0) setIsSpeaking(false); };
              src.start(nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime));
              // FIXED: Ensure access to 'current' property of the scheduledSources ref.
              nextStartTimeRef.current += buffer.duration; scheduledSources.current.add(src);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.debug('Live API encounter error:', e);
            setStatus('error');
          },
          onclose: (e: CloseEvent) => {
            console.debug('Live API session closed:', e);
            cleanup();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e) { cleanup(); setStatus('error'); }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const particles = Array.from({ length: 50 }, () => ({ x: Math.random() * 400, y: Math.random() * 400, r: Math.random() * 2 + 1, sx: (Math.random() - 0.5) * 0.4, sy: (Math.random() - 0.5) * 0.4 }));
    const draw = (t: number) => {
      ctx.clearRect(0, 0, 400, 400);
      particles.forEach(p => { 
        p.x = (p.x + p.sx + 400) % 400; p.y = (p.y + p.sy + 400) % 400;
        ctx.fillStyle = isConnected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      });
      const level = isSpeaking ? 50 : 0;
      const grad = ctx.createRadialGradient(200, 200, 0, 200, 200, 100 + level + Math.sin(t*0.005)*10);
      grad.addColorStop(0, isSpeaking ? 'rgba(99, 102, 241, 0.6)' : isConnected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(200, 200, 180, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(200, 200, 60 + (isSpeaking ? Math.sin(t*0.02)*12 : 0), 0, 6.28);
      ctx.fillStyle = isSpeaking ? '#ffffff' : isConnected ? '#6366f1' : '#1e293b'; ctx.fill();
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isConnected, isSpeaking]);

  return (
    <div className={`flex flex-col h-full items-center justify-center p-8 relative overflow-hidden transition-all duration-1000 ${isSpeaking ? 'bg-[#0f0a1e]' : 'bg-[#020202]'}`}>
      <div className="z-10 text-center space-y-16 flex flex-col items-center w-full max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
             <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
             <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Nebula Stream</h2>
          </div>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em]">Integrated Voice Environment</p>
        </div>

        <div className="relative group p-12">
           <canvas ref={canvasRef} width={400} height={400} className="rounded-full shadow-[0_0_100px_rgba(99,102,241,0.05)] transition-all duration-700 group-hover:scale-105" />
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             {status === 'connecting' ? <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" /> : <Activity className={`w-14 h-14 transition-all duration-500 ${isSpeaking ? 'text-white scale-125' : 'text-indigo-400 opacity-20'}`} />}
           </div>
        </div>

        <div className="flex flex-col gap-6 w-full max-w-sm">
          <button 
            onClick={isConnected ? cleanup : startSession} 
            className={`px-12 py-5 rounded-[24px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${
              isConnected 
                ? 'bg-white/5 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isConnected ? 'Disconnect System' : 'Initialize Voice Link'}
          </button>
          <div className="flex justify-center gap-10">
             <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Latency</span>
                <span className="text-xs font-bold text-slate-400">~24ms</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Model</span>
                <span className="text-xs font-bold text-slate-400">Gemini 2.5 Native</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
