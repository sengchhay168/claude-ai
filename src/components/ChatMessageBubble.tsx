import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Copy, Check, Trash2, FileText, File, ExternalLink, X, Pencil, ArrowUp } from 'lucide-react';
import { ChatMessage, ChatAttachment } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onDelete?: (id: string) => void;
  onEditAndResend?: (id: string, newContent: string, attachments?: ChatAttachment[]) => void;
}

// Anthropic Claude signature terracotta sunburst icon
const ClaudeSparkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-[#CC785C]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25c.414 0 .75.336.75.75v3.195a6.75 6.75 0 0 1 5.055 5.055H21a.75.75 0 0 1 0 1.5h-3.195a6.75 6.75 0 0 1-5.055 5.055V21a.75.75 0 0 1-1.5 0v-3.195a6.75 6.75 0 0 1-5.055-5.055H3a.75.75 0 0 1 0-1.5h3.195a6.75 6.75 0 0 1 5.055-5.055V3c0-.414.336-.75.75-.75z" />
  </svg>
);

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming = false,
  onDelete,
  onEditAndResend,
}) => {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Inline editing state for user messages
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(message.content);
  const [editAttachments, setEditAttachments] = useState<ChatAttachment[]>(message.attachments || []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditContent(message.content);
    setEditAttachments(message.attachments || []);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
    setEditAttachments(message.attachments || []);
  };

  const handleSaveAndResend = () => {
    if (!editContent.trim() && editAttachments.length === 0) return;
    if (onEditAndResend) {
      onEditAndResend(message.id, editContent.trim(), editAttachments);
    }
    setIsEditing(false);
  };

  // Special styling if it's the legacy boundary/delimiter line
  const isBanner = message.content.startsWith('-----------');

  if (isBanner) {
    return (
      <div className="my-6 flex justify-center">
        <div className="inline-flex items-center gap-2 text-xs font-serif italic text-[#8C857B] tracking-wide">
          <span>—</span>
          <span>{message.content.replace(/-/g, '').trim()}</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  // Render attached files/photos
  const renderAttachments = (attachments?: ChatAttachment[], canRemove = false) => {
    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter((att) => att.type.startsWith('image/'));
    const documents = attachments.filter((att) => !att.type.startsWith('image/'));

    return (
      <div className="space-y-2 mb-2.5">
        {/* Images Grid */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="group/img relative overflow-hidden rounded-xl border border-[#DED7CB] bg-white shadow-2xs"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  onClick={() => !canRemove && setSelectedPreviewImage(img.dataUrl)}
                  className={`h-24 w-24 sm:h-32 sm:w-32 object-cover ${!canRemove ? 'cursor-pointer' : ''}`}
                />
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => setEditAttachments((prev) => prev.filter((a) => a.id !== img.id))}
                    className="absolute top-1 right-1 p-1 rounded-full bg-[#191919]/70 text-white hover:bg-rose-600 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <div
                    onClick={() => setSelectedPreviewImage(img.dataUrl)}
                    className="absolute inset-0 bg-[#191919]/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4 drop-shadow" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="inline-flex items-center justify-between gap-2.5 rounded-xl border border-[#DED7CB] bg-white/90 px-3 py-2 text-xs text-[#2A2724] shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4EFE6] text-[#CC785C] shrink-0">
                    {doc.name.endsWith('.pdf') ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <File className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="font-medium truncate max-w-[180px] sm:max-w-xs">{doc.name}</p>
                    <p className="text-[10px] text-[#8C8479]">{formatFileSize(doc.size)}</p>
                  </div>
                </div>

                {canRemove && (
                  <button
                    type="button"
                    onClick={() => setEditAttachments((prev) => prev.filter((a) => a.id !== doc.id))}
                    className="p-1 rounded text-[#8C8479] hover:text-rose-600 hover:bg-[#F2ECE1] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // USER MESSAGE: Neatly aligned in soft warm stone capsule
  if (!isAssistant) {
    if (isEditing) {
      return (
        <div className="flex justify-end my-5 px-2 sm:px-0">
          <div className="w-full max-w-2xl rounded-2xl border border-[#CC785C]/60 bg-white p-4 shadow-md transition-all">
            <div className="text-xs font-serif font-medium text-[#CC785C] mb-2 flex items-center justify-between">
              <span>Edit your message</span>
              <span className="text-[11px] text-[#8C8479] font-sans">
                Saving will reset and regenerate the AI response
              </span>
            </div>

            {renderAttachments(editAttachments, true)}

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveAndResend();
                }
              }}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-[#E0D8CB] bg-[#FAF8F5] p-3 text-[14.5px] leading-relaxed text-[#191919] focus:bg-white focus:border-[#CC785C] focus:outline-none focus:ring-2 focus:ring-[#CC785C]/20 transition-all resize-none"
            />

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg border border-[#E2DDD3] bg-white hover:bg-[#F5F2EB] text-xs font-medium text-[#5A554E] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndResend}
                disabled={!editContent.trim() && editAttachments.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#CC785C] hover:bg-[#BA674C] text-xs font-medium text-white shadow-2xs transition-all disabled:opacity-50"
              >
                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Save & Resend</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end my-5 px-2 sm:px-0">
        <div className="group relative max-w-[85%] sm:max-w-2xl">
          <div className="bg-[#F0EDE6] text-[#191919] px-4.5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E2D8]">
            {/* Render any attached images/documents */}
            {renderAttachments(message.attachments)}

            {message.content && (
              <p className="whitespace-pre-wrap font-normal selection:bg-[#E2DACB]">{message.content}</p>
            )}
          </div>

          {/* Action Row for User Message */}
          <div className="mt-1 flex items-center justify-end gap-1.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-[#8C857B]">
            <span>{message.timestamp}</span>

            {/* Edit Button */}
            {onEditAndResend && (
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1 p-1 px-1.5 rounded hover:bg-[#EAE4D8] text-[#7A746B] hover:text-[#191919] transition-colors"
                title="Edit message & resend"
              >
                <Pencil className="h-3 w-3" />
                <span className="text-[11px]">Edit</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-[#EAE4D8] text-[#7A746B] hover:text-[#191919] transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            </button>

            {/* Delete Button (deletes both user message and AI response) */}
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded hover:bg-[#FBEBE7] text-[#8C857B] hover:text-[#B54A35] transition-colors"
                title="Delete message and AI response"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Image Fullscreen Preview Lightbox */}
        {selectedPreviewImage && (
          <div
            onClick={() => setSelectedPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#191919]/75 backdrop-blur-xs p-4"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={selectedPreviewImage}
                alt="Enlarged view"
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // AI MESSAGE: Claude's spacious open-air article layout
  return (
    <div className="group relative my-7 px-2 sm:px-0 text-[#191919]">
      {/* Claude Speaker Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F4EFE6] border border-[#E8E2D5] shadow-2xs">
          <ClaudeSparkIcon className="w-3.5 h-3.5 text-[#CC785C]" />
        </div>
        <span className="font-serif font-medium text-sm text-[#191919] tracking-tight">Claude</span>
      </div>

      {/* Article Text Content */}
      <div className="pl-8 sm:pl-8 text-[15.5px] leading-[1.78] text-[#191919]">
        {message.content ? (
          <div className="claude-prose">
            <Markdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#191919] mt-6 mb-3 tracking-tight">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg sm:text-xl font-serif font-medium text-[#191919] mt-5 mb-2.5 tracking-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base sm:text-lg font-semibold text-[#191919] mt-4 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0 leading-[1.78] text-[#222120] selection:bg-[#EADFCF]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="my-3 pl-6 list-disc space-y-1.5 marker:text-[#A39B8F]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-3 pl-6 list-decimal space-y-1.5 marker:text-[#8C857B]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-[1.7] text-[#222120]">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[#111111]">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#D9D1C3] pl-4 my-4 italic text-[#4A4641]">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = Boolean(className);
                  if (isBlock) {
                    return (
                      <code className={`${className} font-mono text-[13px] block overflow-x-auto`} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="rounded bg-[#EFECE6] border border-[#E2DDD3] px-1.5 py-0.5 font-mono text-[13px] text-[#242220]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <div className="relative my-4 overflow-hidden rounded-xl border border-[#383431] bg-[#1E1D1B] text-[#ECE7DF] shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#33302C] bg-[#272522] px-4 py-1.5 text-xs text-[#A8A29A]">
                      <span className="font-mono text-[11px] uppercase tracking-wider">code</span>
                    </div>
                    <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed">
                      {children}
                    </div>
                  </div>
                ),
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto rounded-lg border border-[#E5E0D6]">
                    <table className="min-w-full divide-y divide-[#E5E0D6] text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-[#F5F2EB] px-3.5 py-2 text-left font-semibold text-[#191919]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-t border-[#E5E0D6] px-3.5 py-2 text-[#2C2926]">{children}</td>
                ),
              }}
            >
              {message.content}
            </Markdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-[#CC785C] animate-pulse align-middle" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 py-2 text-sm text-[#79746E]">
            <span className="flex space-x-1 items-center">
              <span className="h-1.5 w-1.5 bg-[#CC785C] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-1.5 w-1.5 bg-[#CC785C] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-1.5 w-1.5 bg-[#CC785C] rounded-full animate-bounce"></span>
            </span>
            <span className="text-xs font-serif italic text-[#8C857B]">Claude is thinking...</span>
          </div>
        )}

        {/* Action Controls below response */}
        {message.content && !isStreaming && (
          <div className="mt-3 flex items-center gap-3 pt-1 text-xs text-[#8C857B] opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[#EFECE5] hover:text-[#191919] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[#FBEBE7] hover:text-[#B54A35] transition-colors"
                title="Delete response"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}

            <span className="text-[#C8C2B7]">•</span>
            <span className="text-[11px] font-mono">{message.timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
};
