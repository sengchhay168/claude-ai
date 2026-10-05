import React, { useState, useEffect, useRef } from 'react';
import { StreamlitHeader } from './components/StreamlitHeader';
import { StreamlitSidebar } from './components/StreamlitSidebar';
import { AuthCard } from './components/AuthCard';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { PythonCodeModal } from './components/PythonCodeModal';
import { ChatMessage, ChatSession, ChatAttachment } from './types';
import {
  ArrowUp,
  Paperclip,
  Menu,
  X,
  Loader2,
  Trash2,
  FileText,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const STORAGE_SESSIONS_KEY = 'gemini_chat_sessions_v1';
const STORAGE_ACTIVE_ID_KEY = 'gemini_active_session_id_v1';

// Anthropic Claude signature terracotta sunburst icon
const ClaudeSparkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-[#CC785C]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25c.414 0 .75.336.75.75v3.195a6.75 6.75 0 0 1 5.055 5.055H21a.75.75 0 0 1 0 1.5h-3.195a6.75 6.75 0 0 1-5.055 5.055V21a.75.75 0 0 1-1.5 0v-3.195a6.75 6.75 0 0 1-5.055-5.055H3a.75.75 0 0 1 0-1.5h3.195a6.75 6.75 0 0 1 5.055-5.055V3c0-.414.336-.75.75-.75z" />
  </svg>
);

const createDefaultWelcomeMessages = (): ChatMessage[] => [
  {
    id: 'welcome-intro',
    role: 'assistant',
    content:
      "Hello! I am Claude. How can I help you today? Feel free to ask questions, explore complex ideas, draft writing, or attach photos and documents for deep analysis.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const createNewSession = (title = 'New Chat', messages?: ChatMessage[]): ChatSession => ({
  id: 'chat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: messages || createDefaultWelcomeMessages(),
  isAutoNamed: false,
});

const QUICK_STARTERS = [
  { title: 'Explain a complex concept', desc: 'Quantum computing and superposition in simple terms' },
  { title: 'Draft production code', desc: 'Write a TypeScript debounce utility with generics' },
  { title: 'Analyze literature', desc: 'Thematic conflicts in Dostoyevsky’s Crime and Punishment' },
  { title: 'Compare AI architectures', desc: 'Transformer multi-head attention versus traditional RNNs' },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function App() {
  // Session Authentication & Dynamic Lockout State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('gemini_auth_success') === 'true';
  });
  const [attempts, setAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [waitTime, setWaitTime] = useState<number>(10);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Multi-chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [createNewSession('New Chat')];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    return saved || '';
  });

  // Current active session
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || createNewSession();

  // Ensure currentSessionId matches
  useEffect(() => {
    if (!sessions.some((s) => s.id === currentSessionId) && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
      if (currentSessionId) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, currentSessionId);
      }
    } catch (e) {
      console.warn('Failed to save sessions to localStorage', e);
    }
  }, [sessions, currentSessionId]);

  // Input & Streaming State
  const [inputText, setInputText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Attachment State
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lockout countdown timer loop
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        setLockoutRemaining(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Keyboard shortcut: Cmd+N or Ctrl+N to start new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll on new messages or during streaming
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages, isStreaming]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText, pendingAttachments]);

  // Initial welcome message upon authentication
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('gemini_auth_success', 'true');
    setAttempts(0);
  };

  // Create New Chat
  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setPendingAttachments([]);

    const newSess = createNewSession('New Chat');
    setSessions((prev) => [newSess, ...prev]);
    setCurrentSessionId(newSess.id);
    setIsSidebarOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Select Chat Session
  const handleSelectSession = (id: string) => {
    if (id === currentSessionId) {
      setIsSidebarOpen(false);
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setPendingAttachments([]);
    setCurrentSessionId(id);
    setIsSidebarOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Delete Entire Chat Session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewSession('New Chat');
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Delete Individual Message: When deleting a user message, also delete the AI response
  const handleDeleteMessage = (messageId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;

        const msgIndex = s.messages.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return s;

        const targetMsg = s.messages[msgIndex];
        const newMessages = [...s.messages];

        if (targetMsg.role === 'user') {
          // If deleting user message, remove user message + immediately following AI response
          let removeCount = 1;
          if (msgIndex + 1 < newMessages.length && newMessages[msgIndex + 1].role === 'assistant') {
            removeCount = 2;
          }
          newMessages.splice(msgIndex, removeCount);
        } else {
          // If deleting assistant message
          newMessages.splice(msgIndex, 1);
        }

        return {
          ...s,
          messages: newMessages.length === 0 ? createDefaultWelcomeMessages() : newMessages,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Rename Chat Session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, isAutoNamed: true } : s))
    );
  };

  // Clear all chats
  const handleClearAllChats = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setPendingAttachments([]);
    const fresh = createNewSession('New Chat');
    setSessions([fresh]);
    setCurrentSessionId(fresh.id);
  };

  // Restart / Reset Current Chat
  const handleRestart = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setPendingAttachments([]);

    const resetMessages: ChatMessage[] = createDefaultWelcomeMessages();

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages: resetMessages, updatedAt: Date.now() }
          : s
      )
    );
  };

  const handleLogout = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAuthenticated(false);
    localStorage.removeItem('gemini_auth_success');
    setIsStreaming(false);
    setStreamingMessageId(null);
  };

  // Handle file uploads (Images & Documents)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 25MB limit. Please choose a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const commaIdx = dataUrl.indexOf(',');
        const base64Data = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : '';

        const newAttachment: ChatAttachment = {
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          base64Data,
        };

        setPendingAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Asynchronously generate auto-name in background without blocking chat
  const triggerAutoNaming = async (sessionId: string, promptText: string) => {
    try {
      const res = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title && typeof data.title === 'string' && data.title.trim()) {
          const cleanTitle = data.title.trim().replace(/^["']|["']$/g, '');
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId ? { ...s, title: cleanTitle, isAutoNamed: true } : s
            )
          );
        }
      }
    } catch (e) {
      console.warn('Auto-naming failed:', e);
    }
  };

  // Unified Chat Stream Executor
  const executeChatStream = async (
    targetSessionId: string,
    assistantMessageId: string,
    messagesForApi: Array<{ role: string; content: string; attachments?: ChatAttachment[] }>
  ) => {
    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let streamBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
              setSessions((prev) =>
                prev.map((sess) =>
                  sess.id === targetSessionId
                    ? {
                        ...sess,
                        updatedAt: Date.now(),
                        messages: sess.messages.map((msg) =>
                          msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
                        ),
                      }
                    : sess
                )
              );
            } else if (parsed.error) {
              if (!accumulatedText) {
                accumulatedText = `⚠️ *${parsed.error}*`;
                setSessions((prev) =>
                  prev.map((sess) =>
                    sess.id === targetSessionId
                      ? {
                          ...sess,
                          messages: sess.messages.map((msg) =>
                            msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
                          ),
                        }
                      : sess
                  )
                );
              }
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMsg = err instanceof Error ? err.message : 'Connection interrupted';
      setSessions((prev) =>
        prev.map((sess) =>
          sess.id === targetSessionId
            ? {
                ...sess,
                messages: sess.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: `⚠️ *Error: ${errorMsg}*`,
                      }
                    : msg
                ),
              }
            : sess
        )
      );
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // Streaming message sender calling backend API
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && pendingAttachments.length === 0) || isStreaming) return;

    if (textToSend === undefined) {
      setInputText('');
    }

    const currentAttachments = [...pendingAttachments];
    setPendingAttachments([]);

    const userMessageId = 'u-' + Math.random().toString(36).substring(2, 9);
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    const assistantMessageId = 'a-' + Math.random().toString(36).substring(2, 9);
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const targetSessionId = currentSession.id;
    const isFirstUserMessage = !currentSession.isAutoNamed;

    const updatedMessages = [...currentSession.messages, userMessage];
    const initialTitle =
      isFirstUserMessage && currentSession.title === 'New Chat'
        ? (text || currentAttachments[0]?.name || 'New Chat').slice(0, 28)
        : currentSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              title: initialTitle,
              messages: [...updatedMessages, placeholderAssistant],
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setIsStreaming(true);
    setStreamingMessageId(assistantMessageId);

    if (isFirstUserMessage) {
      triggerAutoNaming(targetSessionId, text || currentAttachments[0]?.name || 'Chat');
    }

    const formattedForApi = updatedMessages
      .filter((m) => !m.content.startsWith('-----------'))
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

    await executeChatStream(targetSessionId, assistantMessageId, formattedForApi);
  };

  // Edit an existing message, reset the AI response, and resend
  const handleEditAndResend = async (
    messageId: string,
    newContent: string,
    attachments?: ChatAttachment[]
  ) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }

    const targetSessionId = currentSession.id;
    const msgIndex = currentSession.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Retain all messages prior to this user message
    const previousMessages = currentSession.messages.slice(0, msgIndex);

    const updatedUserMessage: ChatMessage = {
      ...currentSession.messages[msgIndex],
      content: newContent,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newAssistantId = 'a-' + Math.random().toString(36).substring(2, 9);
    const placeholderAssistant: ChatMessage = {
      id: newAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Reset subsequent messages and add the updated user message and fresh placeholder
    const newSessionMessages = [...previousMessages, updatedUserMessage, placeholderAssistant];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              messages: newSessionMessages,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setIsStreaming(true);
    setStreamingMessageId(newAssistantId);

    const formattedForApi = [...previousMessages, updatedUserMessage]
      .filter((m) => !m.content.startsWith('-----------'))
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

    await executeChatStream(targetSessionId, newAssistantId, formattedForApi);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const isConversationEmpty = currentSession.messages.length <= 1;

  return (
    <div className="flex h-screen w-screen bg-[#FBF9F6] text-[#191919] font-sans overflow-hidden antialiased">
      {/* Hidden File Input for Paperclip Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx"
        className="hidden"
      />

      {/* Floating Left Edge Arrow Tab to Re-open Sidebar */}
      {!isSidebarOpen && (
        <button
          id="reopen-sidebar-tab"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-16 left-0 z-40 flex items-center justify-center h-10 w-6 rounded-r-lg border border-l-0 border-[#D5CDBD] bg-white hover:bg-[#FAF8F5] text-[#CC785C] shadow-sm hover:w-7 transition-all group cursor-pointer"
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Claude Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 shrink-0 transition-all duration-300 md:static ${
          isSidebarOpen
            ? 'w-72 translate-x-0 md:opacity-100'
            : 'w-0 -translate-x-full md:translate-x-0 md:w-0 md:opacity-0 overflow-hidden pointer-events-none'
        }`}
      >
        <div className="w-72 h-full">
          <StreamlitSidebar
            isAuthenticated={isAuthenticated}
            sessions={sessions}
            currentSessionId={currentSession.id}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onClearAllChats={handleClearAllChats}
            onRestart={handleRestart}
            onLogout={handleLogout}
            messageCount={currentSession.messages.length}
            attempts={attempts}
            lockoutRemaining={lockoutRemaining}
            showInspector={showInspector}
            onToggleInspector={() => setShowInspector((prev) => !prev)}
            onSelectPrompt={(prompt) => {
              if (window.innerWidth < 768) setIsSidebarOpen(false);
              handleSendMessage(prompt);
            }}
            onOpenCodeModal={() => setShowCodeModal(true)}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#191919]/20 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Primary Claude Chat Canvas */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#FBF9F6]">
        {!isAuthenticated ? (
          <div className="flex-1 overflow-y-auto">
            <AuthCard
              onSuccess={handleAuthSuccess}
              attempts={attempts}
              setAttempts={setAttempts}
              lockoutUntil={lockoutUntil}
              setLockoutUntil={setLockoutUntil}
              waitTime={waitTime}
              setWaitTime={setWaitTime}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Minimal Claude Top Bar */}
            <StreamlitHeader
              onToggleCode={() => setShowCodeModal((prev) => !prev)}
              showCode={showCodeModal}
              isRunning={isStreaming}
            />

            {/* Chat Content Viewport */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 max-w-3xl w-full mx-auto flex flex-col">
              {isConversationEmpty ? (
                /* Claude Welcome Hero for New Chats */
                <div className="flex-1 flex flex-col justify-center items-center py-12 text-center select-none">
                  <div className="h-12 w-12 rounded-2xl bg-[#F4EFE6] border border-[#E8E1D4] flex items-center justify-center mb-5 shadow-2xs">
                    <ClaudeSparkIcon className="h-7 w-7 text-[#CC785C]" />
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#191919] tracking-tight mb-2">
                    How can I help you today?
                  </h1>
                  <p className="text-sm text-[#7A746B] max-w-md mb-8">
                    Engage in deep reasoning, write code, analyze topics, or attach files and photos.
                  </p>

                  {/* Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                    {QUICK_STARTERS.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleSendMessage(item.desc)}
                        className="p-3.5 rounded-xl border border-[#E6E0D6] bg-white hover:bg-[#FAF8F5] hover:border-[#D6CEC1] transition-all text-left group shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                      >
                        <p className="text-xs font-semibold text-[#191919] group-hover:text-[#CC785C] transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[12px] text-[#7A746B] line-clamp-1 mt-0.5">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages Feed */
                <div className="py-4">
                  {currentSession.messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreaming && msg.id === streamingMessageId}
                      onDelete={handleDeleteMessage}
                      onEditAndResend={handleEditAndResend}
                    />
                  ))}

                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Claude Floating Input Box (Centered, Warm Shadow, Paperclip, Terracotta Arrow) */}
            <div className="relative px-4 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[#FBF9F6] via-[#FBF9F6]/90 to-transparent">
              <div className="max-w-3xl mx-auto w-full">
                <form
                  onSubmit={handleSubmit}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl sm:rounded-3xl bg-white border shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:shadow-[0_12px_36px_rgba(0,0,0,0.09)] transition-all overflow-hidden ${
                    isDragging
                      ? 'border-[#CC785C] ring-2 ring-[#CC785C]/20 bg-[#FAF7F3]'
                      : 'border-[#E5DFD5] focus-within:border-[#D5CCC0]'
                  }`}
                >
                  {/* Pending Attached Files Previews */}
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1 border-b border-[#F0ECE4]">
                      {pendingAttachments.map((att) => {
                        const isImg = att.type.startsWith('image/');
                        return (
                          <div
                            key={att.id}
                            className="group relative flex items-center gap-2 rounded-xl border border-[#E2DDD2] bg-[#FAF8F5] p-1.5 pr-2.5 text-xs text-[#2A2724] shadow-2xs"
                          >
                            {isImg ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="h-9 w-9 rounded-lg object-cover border border-[#DCD6C9]"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFECE5] text-[#CC785C]">
                                {att.name.endsWith('.pdf') ? (
                                  <FileText className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0 pr-1">
                              <p className="font-medium truncate max-w-[120px] sm:max-w-[160px]">
                                {att.name}
                              </p>
                              <p className="text-[10px] text-[#8C8479]">
                                {formatFileSize(att.size)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePendingAttachment(att.id)}
                              className="p-1 rounded-full text-[#8C8479] hover:bg-[#EAE4D8] hover:text-[#191919] transition-colors"
                              title="Remove file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    id="claude-chat-input"
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isStreaming
                        ? 'Claude is responding...'
                        : pendingAttachments.length > 0
                        ? 'Ask something about attached file(s)...'
                        : 'Reply to Claude...'
                    }
                    disabled={isStreaming}
                    className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-[#191919] placeholder-[#9E978C] outline-none resize-none font-sans leading-relaxed selection:bg-[#EADFCF]"
                  />

                  {/* Input Toolbar */}
                  <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                    {/* Left: Attachment & Model Indicator */}
                    <div className="flex items-center gap-1.5 text-[#7A746B]">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 p-1.5 px-2 rounded-lg hover:bg-[#F2ECE1] text-[#6B655B] hover:text-[#191919] transition-colors text-xs font-medium"
                        title="Attach photos, PDFs, or documents"
                      >
                        <Paperclip className="h-4 w-4 text-[#CC785C]" />
                        <span className="hidden sm:inline">Attach</span>
                      </button>

                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-[#8C8479] pl-1">
                        <span>Claude 3.8</span>
                      </span>
                    </div>

                    {/* Right: Minimalist Arrow Send Button */}
                    <button
                      id="claude-send-btn"
                      type="submit"
                      disabled={(!inputText.trim() && pendingAttachments.length === 0) || isStreaming}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#CC785C] hover:bg-[#B8654B] text-white shadow-2xs hover:scale-105 active:scale-95 disabled:bg-[#ECE6DC] disabled:text-[#B5AD9F] disabled:hover:scale-100 disabled:cursor-not-allowed transition-all"
                      title="Send message"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </form>

                {/* Subtle Claude Footer */}
                <p className="text-center mt-2.5 text-[11px] text-[#8C8479] font-sans">
                  Claude can make mistakes. Please verify important information.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Streamlit Python Code Inspection Modal */}
      {showCodeModal && <PythonCodeModal onClose={() => setShowCodeModal(false)} />}
    </div>
  );
}
