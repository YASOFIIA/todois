'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@/app/types';
import { LoadingSpinner } from './LoadingSpinner';
import { Mic, MicOff, Send, AlertCircle, RefreshCw, Sparkles, Loader2 } from 'lucide-react';

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
  const [isCleaningVoice, setIsCleaningVoice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const rawVoiceBufferRef = useRef<string>('');

  // Function to send raw voice buffer to AI for cleaning & formatting
  const cleanAndInsertVoiceText = async (rawText: string) => {
    if (!rawText || !rawText.trim()) return;

    setIsCleaningVoice(true);
    try {
      const res = await fetch('/api/clean-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawText.trim() }),
      });

      const data = await res.json();
      const cleanedText = data.cleanedText || rawText.trim();

      setInputText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return cleanedText;
        return `${trimmed}\n${cleanedText}`;
      });
    } catch (err) {
      console.error('Failed to clean voice text with AI:', err);
      // Fallback to raw text if AI cleanup fails
      setInputText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return rawText.trim();
        return `${trimmed}\n${rawText.trim()}`;
      });
    } finally {
      setIsCleaningVoice(false);
    }
  };

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
        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        if (finalText) {
          rawVoiceBufferRef.current = rawVoiceBufferRef.current
            ? `${rawVoiceBufferRef.current} ${finalText.trim()}`
            : finalText.trim();
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        const buffer = rawVoiceBufferRef.current;
        rawVoiceBufferRef.current = '';
        if (buffer) {
          cleanAndInsertVoiceText(buffer);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        const buffer = rawVoiceBufferRef.current;
        rawVoiceBufferRef.current = '';
        if (buffer) {
          cleanAndInsertVoiceText(buffer);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current || isCleaningVoice) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      // onend callback will handle cleanAndInsertVoiceText
    } else {
      try {
        rawVoiceBufferRef.current = '';
        setInterimTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim() || isCleaningVoice) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          planFor,
          clientHour: new Date().getHours(),
          clientMinute: new Date().getMinutes(),
          clientDate: new Date().toLocaleDateString('sv-SE'), // "2026-07-23" in local tz
        }),
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
              placeholder="Напиши або надиктуй голосом — AI впорядкує та розкладе по поличках..."
              className="w-full flex-1 bg-transparent text-[#2D2235] placeholder-[#9B8FA3] text-[15px] resize-none focus:outline-none leading-relaxed font-normal min-h-[200px]"
            />

            {/* Voice Status Overlay / Indicators */}
            {isListening && (
              <div className="my-2 p-2.5 rounded-xl bg-[#FFF5F7] border border-[#F5E0E7] flex flex-col gap-1 transition-all">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E8729B]">
                  <span className="w-2 h-2 rounded-full bg-[#E8729B] animate-ping shrink-0" />
                  <span>Слухаю ваш голос... (говоріть завдання)</span>
                </div>
                {interimTranscript && (
                  <p className="text-[13px] text-[#6B5A75] italic leading-snug pl-4">
                    «{interimTranscript}»
                  </p>
                )}
              </div>
            )}

            {isCleaningVoice && (
              <div className="my-2 p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-2 text-xs text-purple-700 font-medium animate-pulse">
                <Sparkles strokeWidth={1.5} className="w-4 h-4 text-purple-500 animate-spin" />
                <span>AI перевіряє та покращує розшифровку голосу...</span>
              </div>
            )}

            {/* Bottom Bar inside Textarea (Mic + Counter) */}
            <div className="mt-2 pt-2 border-t border-[#F5E0E7] flex items-center justify-between">
              {speechSupported ? (
                <div className="relative flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isCleaningVoice}
                    className={`relative z-10 h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all ${
                      isCleaningVoice
                        ? 'bg-purple-100 text-purple-600 border border-purple-200 opacity-80 cursor-wait'
                        : isListening
                        ? 'bg-[#E8729B] text-white shadow-md animate-pulse'
                        : 'bg-[#FFF5F7] text-[#E8729B] hover:bg-[#F5E0E7] border border-[#F5E0E7]'
                    }`}
                    title={isListening ? 'Зупинити запис' : 'Голосове введення'}
                  >
                    {isCleaningVoice ? (
                      <>
                        <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin text-purple-600" />
                        <span>Обробка AI...</span>
                      </>
                    ) : isListening ? (
                      <>
                        <MicOff strokeWidth={1.5} className="w-4 h-4 animate-pulse" />
                        <span>Зупинити запис</span>
                      </>
                    ) : (
                      <>
                        <Mic strokeWidth={1.5} className="w-4 h-4 text-[#E8729B]" />
                        <span>Надиктувати голосом</span>
                      </>
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
            disabled={!inputText.trim() || isCleaningVoice}
            className={`w-full py-3.5 px-5 rounded-[16px] font-semibold text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${
              inputText.trim() && !isCleaningVoice
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