import React, { useState } from 'react';
import { Star, Send, Sparkles, ChevronDown } from 'lucide-react';
import { DialogueStep } from '../types';

interface InteractiveWidgetsProps {
  currentStep: DialogueStep;
  onSubmit: (text: string) => void;
  selectedAnime?: string;
}

export const InteractiveWidgets: React.FC<InteractiveWidgetsProps> = ({
  currentStep,
  onSubmit,
  selectedAnime = '',
}) => {
  const [sliderValue, setSliderValue] = useState<number>(10);
  const [selectedGenre, setSelectedGenre] = useState<string>('action');

  // Step: Rating 1-10 slider widget
  if (currentStep === 'rating') {
    return (
      <div className="mb-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Streamlit Visual Slider Widget
            </span>
          </div>
          <span className="rounded-full bg-rose-600 px-3 py-0.5 text-xs font-bold text-white font-mono">
            {sliderValue} / 10
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Now rate your favorite anime, the best one for you from 1-10:
        </p>

        <div className="space-y-3">
          <input
            id="rating-slider-input"
            type="range"
            min="1"
            max="10"
            step="1"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
            className="w-full accent-rose-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>1 (Lowest)</span>
            <span>5 (Average)</span>
            <span>10 (Masterpiece)</span>
          </div>

          <button
            id="submit-rating-btn"
            onClick={() => onSubmit(String(sliderValue))}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2 shadow-sm transition-all"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>Submit Rating: {sliderValue}</span>
          </button>
        </div>
      </div>
    );
  }

  // Step: Anime Category / Type Dropdown Widget
  if (currentStep === 'anime_type') {
    const genres = [
      { id: 'action', label: 'Action (Shonen / Battles)' },
      { id: 'romance', label: 'Romance (Love Story)' },
      { id: 'comedy', label: 'Comedy (Humor)' },
      { id: 'other', label: 'Other Anime Genre' },
    ];

    return (
      <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-rose-500" />
          <span>Streamlit Dropdown Category Selector</span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5">
          What kind of anime do you like? Pick a category or type below:
        </p>

        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => onSubmit(g.id)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-600 dark:hover:border-rose-500 dark:hover:text-rose-400 shadow-2xs transition-all"
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step: Quick suggestions for Anime selection
  if (currentStep === 'anime_choice') {
    const popularAnime = ['Oshinoko', 'Assassination Classroom', 'Demon Slayer', 'Naruto', 'One Piece'];
    return (
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] font-medium text-slate-400">Quick options:</span>
        {popularAnime.map((a) => (
          <button
            key={a}
            onClick={() => onSubmit(a)}
            className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-rose-400 hover:text-rose-600 transition-all"
          >
            {a}
          </button>
        ))}
      </div>
    );
  }

  // Step: Character suggestions depending on chosen anime
  if (currentStep === 'fav_char') {
    let characterChips: string[] = [];
    const animeLower = selectedAnime.toLowerCase();

    if (animeLower.includes('oshinoko') || animeLower.includes('oshi no ko')) {
      characterChips = ['Ai', 'Ruby', 'Aqua', 'Hikaru', 'Kana'];
    } else if (animeLower.includes('assassination classroom')) {
      characterChips = ['Nagisa', 'Karma', 'Kayano', 'Ritsu'];
    } else if (animeLower.includes('demon slayer')) {
      characterChips = ['Tanjiro', 'Muzan'];
    } else if (animeLower.includes('naruto')) {
      characterChips = ['Naruto'];
    }

    if (characterChips.length > 0) {
      return (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-slate-400">Characters:</span>
          {characterChips.map((char) => (
            <button
              key={char}
              onClick={() => onSubmit(char)}
              className="rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 px-3 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all"
            >
              {char}
            </button>
          ))}
        </div>
      );
    }
  }

  // Yes / No quick buttons for ever_watched or more_questions
  if (currentStep === 'ever_watched' || currentStep === 'more_questions') {
    return (
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => onSubmit('yes')}
          className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all"
        >
          Yes
        </button>
        <button
          onClick={() => onSubmit('no')}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all"
        >
          No
        </button>
      </div>
    );
  }

  return null;
};
