import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Activity, Loader2, Mic } from 'lucide-react';
import { SYSTEM_LITERALS } from '../constants.js';
import { decodeAudioData, createPcmBlob, base64ToUint8Array } from '../utils/audioUtils.js';

export const LiveSession = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('disconnected');
  
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const inputCtxRef = useRef(null);
  const streamRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  const cleanup = () => {
    if (sessionRef.current) sessionRef.current.then(s => s.close());
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    setIsConnected(false); setStatus('disconnected');
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      inputCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are TextGpt ai. ${SYSTEM_LITERALS}`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true); setStatus('connected');
            const source = inputCtxRef.current.createMediaStreamSource(stream);
            const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(processor); processor.connect(inputCtxRef.current.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioCtxRef.current) {
              setIsSpeaking(true);
              const buffer = await decodeAudioData(base64ToUint8Array(audioData), audioCtxRef.current, 24000, 1);
              const src = audioCtxRef.current.createBufferSource();
              src.buffer = buffer; src.connect(audioCtxRef.current.destination);
              src.onended = () => setIsSpeaking(false);
              src.start(nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtxRef.current.currentTime));
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onerror: cleanup,
          onclose: cleanup
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e) { cleanup(); }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    let frame;
    const draw = (t) => {
      ctx.clearRect(0, 0, 400, 400);
      const level = isSpeaking ? 50 : (isConnected ? 10 : 0);
      const grad = ctx.createRadialGradient(200, 200, 0, 200, 200, 100 + level + Math.sin(t * 0.005) * 10);
      grad.addColorStop(0, isSpeaking ? '#6366f1' : isConnected ? '#4338ca33' : '#ffffff11');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(200, 200, 180, 0, 6.28); ctx.fill();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [isConnected, isSpeaking]);

  return (
    <div className="flex flex-col h-full items-center justify-center bg-[#020202] p-12">
      <div className="text-center space-y-12 flex flex-col items-center">
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Nebula Stream JS</h2>
        <canvas ref={canvasRef} width={400} height={400} className="rounded-full shadow-2xl" />
        <button onClick={isConnected ? cleanup : startSession} className={`px-12 py-5 rounded-3xl font-black uppercase tracking-widest ${isConnected ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>
          {status === 'connecting' ? <Loader2 className="animate-spin" /> : (isConnected ? 'Terminate' : 'Initialize')}
        </button>
      </div>
    </div>
  );
};