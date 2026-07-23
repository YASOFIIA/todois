'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Inbox, Target, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: Brain,
      title: 'Вивали все з голови 🧠',
      subtitle: 'Capture',
      description:
        'Пиши або диктуй голосом всі свої думки в довільному порядку. Без структури, без редагування — просто вивантаж голова в додаток.',
      badgeColor: 'bg-[#FFF5F7] text-[#E8729B]',
    },
    {
      icon: Inbox,
      title: 'AI розкладе по поличках ✨',
      subtitle: 'Inbox',
      description:
        'Штучний інтелект миттєво сформує чіткі задачі, визначить терміновість, розрахує час виконання та розставить теги.',
      badgeColor: 'bg-[#F2A3BF]/20 text-[#E8729B]',
    },
    {
      icon: Target,
      title: 'Фокусуйся на сьогодні 🎯',
      subtitle: 'Today',
      description:
        'Перенось задачі з Inbox в Today одним кліком та виконуй їх крок за кроком із задоволенням та чітким розкладом.',
      badgeColor: 'bg-[#A8D8B9]/30 text-[#2D6A42]',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2235]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-white border border-[#F5E0E7] rounded-[32px] p-7 shadow-[0_12px_40px_rgba(199,146,164,0.25)] flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        {/* Subtitle Badge */}
        <span
          className={`px-3.5 py-1 rounded-full text-xs font-semibold mb-6 tracking-wide transition-colors ${slides[currentSlide].badgeColor}`}
        >
          {slides[currentSlide].subtitle}
        </span>

        {/* Big Animated Icon */}
        <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#FFF5F7] to-[#F5E0E7] border border-[#F2A3BF]/40 flex items-center justify-center text-[#E8729B] shadow-inner mb-6 transition-all duration-300 transform hover:scale-105">
          <SlideIcon strokeWidth={1.5} className="w-12 h-12" />
        </div>

        {/* Slide Title */}
        <h2 className="text-xl font-bold text-[#2D2235] mb-3 tracking-tight">
          {slides[currentSlide].title}
        </h2>

        {/* Slide Description */}
        <p className="text-sm text-[#9B8FA3] leading-relaxed mb-8 min-h-[72px]">
          {slides[currentSlide].description}
        </p>

        {/* Slide Progress Dots */}
        <div className="flex items-center gap-2 mb-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx
                  ? 'w-8 bg-[#E8729B]'
                  : 'w-2 bg-[#F5E0E7] hover:bg-[#F2A3BF]'
              }`}
              aria-label={`Слайд ${idx + 1}`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 px-6 min-h-[52px] rounded-[16px] bg-gradient-to-r from-[#E8729B] to-[#D4619A] hover:from-[#d65f88] hover:to-[#c24f88] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(232,114,155,0.3)] transition-all duration-300 active:scale-95"
        >
          <span>{currentSlide === slides.length - 1 ? 'Починаємо!' : 'Далі'}</span>
          {currentSlide === slides.length - 1 ? (
            <Check strokeWidth={2} className="w-5 h-5" />
          ) : (
            <ArrowRight strokeWidth={1.5} className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
