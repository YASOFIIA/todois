'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@/app/types';
import { LoadingSpinner } from './LoadingSpinner';
import { Mic, MicOff, Send, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface CaptureScreenProps {
  onTasksParsed: (newTasks: Task[]) => void;
  onNavigateToInbox: () => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  onTasksParsed,
  onNavigateToInbox,
}) => {
  const [inputText, setInputText] = useState('');
  const [planFor, setPlanFor] = useState<'today' | 'tomorrow'>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'uk-UA';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, planFor }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Не вдалося обробити текст');
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        onTasksParsed(data.tasks);
        setInputText('');
        onNavigateToInbox();
      } else {
        throw new Error('AI повернув невалідний формат даних');
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      setErrorMsg(err.message || 'Сталася помилка при підключенні до AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <h2 className="text-[18px] font-semibold text-[#2D2235] tracking-tight flex items-center gap-2">
          <span>Capture</span>
          <span className="text-sm px-2 py-0.5 rounded-full bg-[#FFF5F7] text-[#E8729B] font-semibold border border-[#F5E0E7]">
            🧠
          </span>
        </h2>
      </div>

      {isLoading ? (
        <div className="my-auto py-12">
          <LoadingSpinner message="AI аналізує твої думки..." />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {/* Textarea Card */}
          <div className="relative flex-1 flex flex-col rounded-[20px] bg-white border border-[#F5E0E7] p-4 shadow-[0_2px_12px_rgba(199,146,164,0.06)] focus-within:border-[#E8729B] focus-within:ring-2 focus-within:ring-[#F2A3BF]/30 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Напиши все що в голові — AI розкладе по поличках..."
              className="w-full flex-1 bg-transparent text-[#2D2235] placeholder-[#9B8FA3] text-[15px] resize-none focus:outline-none leading-relaxed font-normal min-h-[200px]"
            />

            {/* Bottom Bar inside Textarea (Mic + Counter) */}
            <div className="mt-2 pt-2 border-t border-[#F5E0E7] flex items-center justify-between">
              {speechSupported ? (
                <div className="relative flex items-center">
                  {isListening && (
                    <span className="absolute w-10 h-10 rounded-full bg-[#E8729B]/30 animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-[#E8729B] text-white shadow-md'
                        : 'bg-[#FFF5F7] text-[#E8729B] hover:bg-[#F5E0E7] border border-[#F5E0E7]'
                    }`}
                    title={isListening ? 'Зупинити запис' : 'Голосове введення'}
                  >
                    {isListening ? (
                      <MicOff strokeWidth={1.5} className="w-4 h-4 animate-pulse" />
                    ) : (
                      <Mic strokeWidth={1.5} className="w-4 h-4 text-[#E8729B]" />
                    )}
                  </button>
                </div>
              ) : (
                <div />
              )}

              <span className="text-[12px] text-[#9B8FA3] font-mono">
                {inputText.length} симв.
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={handleProcess}
                className="px-2 py-1 rounded bg-rose-100 text-rose-800 text-[11px] font-semibold flex items-center gap-1 shrink-0"
              >
                <RefreshCw strokeWidth={1.5} className="w-3 h-3" />
                Повторити
              </button>
            </div>
          )}

          {/* Day Selector */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPlanFor('today')}
              className={`flex-1 py-2.5 px-4 rounded-[12px] text-[13px] font-semibold transition-all ${
                planFor === 'today'
                  ? 'bg-[#E8729B] text-white shadow-sm'
                  : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
              }`}
            >
              📅 На сьогодні
            </button>
            <button
              type="button"
              onClick={() => setPlanFor('tomorrow')}
              className={`flex-1 py-2.5 px-4 rounded-[12px] text-[13px] font-semibold transition-all ${
                planFor === 'tomorrow'
                  ? 'bg-[#E8729B] text-white shadow-sm'
                  : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
              }`}
            >
              🌅 На завтра
            </button>
          </div>

          {/* Process Submit Button */}
          <button
            type="button"
            onClick={handleProcess}
            disabled={!inputText.trim()}
            className={`w-full py-3.5 px-5 rounded-[16px] font-semibold text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${
              inputText.trim()
                ? 'bg-gradient-to-r from-[#E8729B] to-[#D4619A] hover:from-[#d65f88] hover:to-[#c24f88] text-white shadow-[0_4px_16px_rgba(232,114,155,0.25)] active:scale-[0.98]'
                : 'bg-[#F5E0E7]/60 text-[#9B8FA3] cursor-not-allowed border border-[#F5E0E7]'
            }`}
          >
            <Sparkles strokeWidth={1.5} className="w-4 h-4" />
            <span>Обробити з AI</span>
            <Send strokeWidth={1.5} className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      )}
    </div>
  );
};
