import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  LogOut,
  Code2,
  Zap,
  ChevronLeft,
} from 'lucide-react';
import { ChatSession } from '../types';

interface StreamlitSidebarProps {
  isAuthenticated: boolean;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAllChats: () => void;
  onRestart: () => void;
  onLogout: () => void;
  messageCount: number;
  attempts: number;
  lockoutRemaining: number;
  showInspector: boolean;
  onToggleInspector: () => void;
  onSelectPrompt: (prompt: string) => void;
  onOpenCodeModal?: () => void;
  onClose?: () => void;
}

const ClaudeSparkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-[#CC785C]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25c.414 0 .75.336.75.75v3.195a6.75 6.75 0 0 1 5.055 5.055H21a.75.75 0 0 1 0 1.5h-3.195a6.75 6.75 0 0 1-5.055 5.055V21a.75.75 0 0 1-1.5 0v-3.195a6.75 6.75 0 0 1-5.055-5.055H3a.75.75 0 0 1 0-1.5h3.195a6.75 6.75 0 0 1 5.055-5.055V3c0-.414.336-.75.75-.75z" />
  </svg>
);

const EXPLORATION_PROMPTS = [
  'Explain Quantum Computing algorithms & Qubits',
  'Write a clean TypeScript debounce hook with generics',
  'Analyze key themes in Dostoyevsky’s Crime and Punishment',
  'Compare Transformer attention mechanisms with RNNs',
];

export const StreamlitSidebar: React.FC<StreamlitSidebarProps> = ({
  isAuthenticated,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClearAllChats,
  onRestart,
  onLogout,
  messageCount,
  onSelectPrompt,
  onOpenCodeModal,
  onClose,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState<string>('');

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleText(session.title);
  };

  const saveEdit = (sessionId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitleText.trim()) {
      onRenameSession(sessionId, editTitleText.trim());
    }
    setEditingSessionId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  return (
    <aside className="flex flex-col h-full bg-[#F3F0E9] border-r border-[#E6E1D7] select-none text-[#191919]">
      {/* Top Header / Claude Brand */}
      <div className="p-3 pb-2.5 border-b border-[#E8E2D6]/80 flex items-center justify-between">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFE9DE] border border-[#E0D7C7] shadow-2xs">
            <ClaudeSparkIcon className="w-4 h-4 text-[#CC785C]" />
          </div>
          <div>
            <h1 className="font-serif font-semibold text-[15px] leading-tight text-[#191919] tracking-tight">
              Claude
            </h1>
            <p className="text-[10px] text-[#8C8479]">Minimalist Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#E8E2D5] px-2 py-0.5 text-[10.5px] font-medium text-[#5E584F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#CC785C]" />
            Instant
          </span>

          {/* Arrow button to close the sidebar */}
          {onClose && (
            <button
              onClick={onClose}
              id="close-sidebar-button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E0D8CB] bg-white hover:bg-[#FAF8F5] text-[#6B655B] hover:text-[#191919] shadow-2xs transition-all hover:scale-105 active:scale-95"
              title="Close sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* "+ New Chat" Button */}
      {isAuthenticated && (
        <div className="px-3 pt-3">
          <button
            id="new-chat-button"
            onClick={onNewChat}
            className="w-full flex items-center justify-between rounded-xl bg-white hover:bg-[#FAF8F4] border border-[#E0D8CB] hover:border-[#D0C6B5] px-3.5 py-2.5 text-[13.5px] font-medium text-[#191919] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_5px_rgba(0,0,0,0.05)] active:translate-y-px"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#CC785C]" />
              <span>New Chat</span>
            </span>
            <kbd className="font-sans text-[11px] text-[#8C8479] bg-[#F5F2EC] px-1.5 py-0.5 rounded border border-[#E7E1D4]">
              ⌘N
            </kbd>
          </button>
        </div>
      )}

      {/* Chat History Section */}
      {isAuthenticated && (
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-4">
          <div className="flex items-center justify-between px-1.5 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8A847A]">
            <span>Recent</span>
            {sessions.length > 1 && (
              <button
                onClick={onClearAllChats}
                className="text-[10px] text-[#A1998E] hover:text-[#994735] lowercase transition-colors"
                title="Clear all chat history"
              >
                clear all
              </button>
            )}
          </div>

          {/* List of chat sessions */}
          <div className="space-y-0.5 overflow-y-auto pr-0.5 flex-1">
            {sessions.map((sess) => {
              const isActive = sess.id === currentSessionId;
              const isEditing = editingSessionId === sess.id;

              if (isEditing) {
                return (
                  <div
                    key={sess.id}
                    className="flex items-center gap-1 rounded-lg bg-white p-1 border border-[#CC785C] shadow-2xs"
                  >
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(sess.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-transparent px-2 py-1 text-xs text-[#191919] outline-none font-sans"
                    />
                    <button
                      onClick={(e) => saveEdit(sess.id, e)}
                      className="p-1 rounded text-emerald-700 hover:bg-[#F0EDE6]"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 rounded text-[#8C8479] hover:bg-[#F0EDE6]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={sess.id}
                  onClick={() => onSelectSession(sess.id)}
                  className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E7E1D4] text-[#191919] font-medium shadow-2xs'
                      : 'text-[#4A4640] hover:bg-[#EBE5D9] hover:text-[#191919]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#CC785C]' : 'text-[#A19A8E]'}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>

                  {/* Actions at the end of the chat history item */}
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => startEditing(sess, e)}
                      className="p-1.5 rounded-md hover:bg-[#DDD5C5] text-[#8C8479] hover:text-[#191919] opacity-0 group-hover:opacity-100 transition-all"
                      title="Rename chat"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      className="p-1.5 rounded-md text-[#8C8479] hover:text-[#B54A35] hover:bg-[#F5DDD7] transition-all"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested prompts in sidebar when active chat has few messages */}
      {isAuthenticated && messageCount <= 2 && (
        <div className="px-3 pt-3 border-t border-[#E8E2D6]/70">
          <div className="px-1 mb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[#8A847A]">
            Suggestions
          </div>
          <div className="space-y-1">
            {EXPLORATION_PROMPTS.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSelectPrompt(prompt)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#595349] hover:bg-[#EAE4D7] hover:text-[#191919] transition-colors truncate"
              >
                ✦ {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Profile & Footer Area */}
      <div className="mt-auto p-3 border-t border-[#E6E1D7] bg-[#ECE8E0]/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Claude user avatar circle */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0D8CB] text-[#3D3830] font-serif font-semibold text-xs border border-[#D5CDBD]">
              U
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#191919] truncate">Personal Workspace</p>
              <p className="text-[10px] text-[#7A7369] flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-[#CC785C]" />
                <span>Gemini Flash</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenCodeModal && (
              <button
                onClick={onOpenCodeModal}
                className="p-1.5 rounded-lg text-[#6B655B] hover:text-[#191919] hover:bg-[#E0D8CB] transition-colors"
                title="View Python app.py source"
              >
                <Code2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={onRestart}
              className="p-1.5 rounded-lg text-[#6B655B] hover:text-[#191919] hover:bg-[#E0D8CB] transition-colors"
              title="Reset current conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#6B655B] hover:text-[#B54A35] hover:bg-[#E0D8CB] transition-colors"
                title="Logout session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
