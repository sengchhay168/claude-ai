import React from 'react';
import { Code2, Sparkles, Terminal } from 'lucide-react';

interface StreamlitHeaderProps {
  onToggleCode: () => void;
  showCode: boolean;
  isRunning?: boolean;
}

const ClaudeSparkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-[#CC785C]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25c.414 0 .75.336.75.75v3.195a6.75 6.75 0 0 1 5.055 5.055H21a.75.75 0 0 1 0 1.5h-3.195a6.75 6.75 0 0 1-5.055 5.055V21a.75.75 0 0 1-1.5 0v-3.195a6.75 6.75 0 0 1-5.055-5.055H3a.75.75 0 0 1 0-1.5h3.195a6.75 6.75 0 0 1 5.055-5.055V3c0-.414.336-.75.75-.75z" />
  </svg>
);

export const StreamlitHeader: React.FC<StreamlitHeaderProps> = ({
  onToggleCode,
  showCode,
  isRunning = false,
}) => {
  return (
    <header className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-[#ECE7DE] bg-[#FBF9F6]/90 px-4 backdrop-blur-md">
      {/* Left: Model & Workspace Title at the edge */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3EFE7] border border-[#E4DDD0] shadow-2xs">
          <ClaudeSparkIcon className="w-3.5 h-3.5 text-[#CC785C]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-sm text-[#191919] tracking-tight">
            Claude
          </span>
          <span className="text-xs text-[#8A847A] font-serif italic">
            Sonnet 3.8
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Subtle streaming status */}
        {isRunning && (
          <div className="flex items-center gap-1.5 text-xs text-[#CC785C] font-serif italic pr-2 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CC785C]" />
            <span>Responding...</span>
          </div>
        )}

        {/* View app.py code button */}
        <button
          id="toggle-python-code-btn"
          onClick={onToggleCode}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
            showCode
              ? 'border-[#CC785C] bg-[#FAF3EF] text-[#B85F44]'
              : 'border-[#E2DDD3] bg-white hover:bg-[#FAF8F5] text-[#47433E] hover:border-[#D4CCC0]'
          }`}
          title="Inspect production-ready Streamlit app.py"
        >
          <Code2 className="h-3.5 w-3.5 text-[#CC785C]" />
          <span>{showCode ? 'Close Source' : 'app.py'}</span>
        </button>

        {/* Local Streamlit Command indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#7A746B] bg-[#F3EFE8] border border-[#E5DFD4] px-2.5 py-1 rounded-md">
          <Terminal className="h-3 w-3 text-[#CC785C]" />
          <span className="font-mono text-[11px]">streamlit run app.py</span>
        </div>
      </div>
    </header>
  );
};
