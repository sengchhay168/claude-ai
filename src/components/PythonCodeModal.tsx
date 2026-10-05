import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, X, Code } from 'lucide-react';

interface PythonCodeModalProps {
  onClose: () => void;
}

const PYTHON_CODE = `"""
================================================================================
✨ My Personal Gemini AI - Premium General AI Assistant
================================================================================
A production-ready, ultra-smooth Streamlit application powered by Google Gemini
for continuous, high-precision, streaming intelligence across all domains.

Features:
1. '168168' Secure Login Gate with dynamic non-blocking 10s lockout timer.
2. Multi-chat history with "+ New Chat" and automatic conversation naming.
3. Instant streaming generation using google-genai SDK with ThinkingLevel.LOW.
4. Permanent premium General AI Assistant System Instruction with structured formatting.
================================================================================
"""

import os
import time
import uuid
from datetime import datetime
import streamlit as st

# -----------------------------------------------------------------------------
# Zero-Dependency Automatic .env File Reader
# -----------------------------------------------------------------------------
def load_local_env():
    \"\"\"
    Manually parse .env without requiring python-dotenv.
    Searches current working directory and script directory for .env or .env.txt.
    \"\"\"
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    script_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
    candidate_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), ".env.txt"),
        os.path.join(script_dir, ".env"),
        os.path.join(script_dir, ".env.txt"),
    ]

    for path in candidate_paths:
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if line.startswith("export "):
                            line = line[7:].strip()
                        if "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\\"")
                            if key in ("GEMINI_API_KEY", "GOOGLE_API_KEY") and val:
                                os.environ[key] = val
                                if "GEMINI_API_KEY" not in os.environ:
                                    os.environ["GEMINI_API_KEY"] = val
            except Exception:
                pass

load_local_env()

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


def get_gemini_api_key():
    \"\"\"Retrieve Gemini API key from environment, Streamlit secrets, or session state.\"\"\"
    load_local_env()

    for var_name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        env_key = os.environ.get(var_name)
        if env_key and env_key.strip() and env_key != "MY_GEMINI_API_KEY":
            return env_key.strip()

    try:
        if hasattr(st, "secrets"):
            for sec_name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                if sec_name in st.secrets and st.secrets[sec_name]:
                    sec_val = str(st.secrets[sec_name]).strip()
                    if sec_val:
                        return sec_val
    except Exception:
        pass

    user_key = st.session_state.get("user_api_key", "")
    if user_key and user_key.strip():
        return user_key.strip()

    return None


st.set_page_config(
    page_title="My Personal Gemini AI",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="expanded",
)

def get_initial_welcome():
    return [
        {
            "role": "assistant",
            "content": "Welcome to **My Personal Gemini AI**! 🌟 Powered by **Gemini 3.8 Flash** with instant reply streaming.\\n\\nAsk me any question across programming, mathematics, science, writing, or analysis. Automatic chat history is enabled!",
            "time": datetime.now().strftime("%H:%M"),
        }
    ]

if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if "attempts" not in st.session_state:
    st.session_state.attempts = 0

if "wait_time" not in st.session_state:
    st.session_state.wait_time = 10

if "lockout_until" not in st.session_state:
    st.session_state.lockout_until = 0.0

if "chats" not in st.session_state:
    initial_id = "chat_default"
    st.session_state.chats = {
        initial_id: {
            "title": "Welcome Discussion",
            "messages": get_initial_welcome(),
            "created_at": time.time(),
            "is_auto_named": True,
        }
    }
    st.session_state.active_chat_id = initial_id

if "active_chat_id" not in st.session_state or st.session_state.active_chat_id not in st.session_state.chats:
    st.session_state.active_chat_id = list(st.session_state.chats.keys())[0]

current_chat = st.session_state.chats[st.session_state.active_chat_id]

SYSTEM_INSTRUCTION = (
    "You are an ultra-fast, intelligent, premium AI Assistant. "
    "You provide instantaneous, highly accurate answers across all domains. "
    "Maintain high clarity, clean structured formatting with bullet points and bold text. "
    "Always start answering immediately."
)

current_time = time.time()
is_locked_out = current_time < st.session_state.lockout_until

if not st.session_state.authenticated:
    st.title("My Personal Gemini AI")
    if is_locked_out:
        st.error(f"Locked out. Wait {int(st.session_state.lockout_until - current_time)}s.")
    else:
        with st.form("login_form"):
            pwd = st.text_input("Enter Passcode:", type="password")
            if st.form_submit_button("Unlock Workspace"):
                if pwd == "168168":
                    st.session_state.authenticated = True
                    st.rerun()
                else:
                    st.error("Incorrect passcode. Default is 168168.")
    st.stop()

with st.sidebar:
    st.title("Gemini Workspace")
    if st.button("➕ New Chat", use_container_width=True, type="primary"):
        new_id = f"chat_{int(time.time())}_{uuid.uuid4().hex[:4]}"
        st.session_state.chats[new_id] = {
            "title": "New Chat",
            "messages": get_initial_welcome(),
            "created_at": time.time(),
            "is_auto_named": False,
        }
        st.session_state.active_chat_id = new_id
        st.rerun()

    st.subheader("Chat History")
    for chat_id, chat_data in sorted(st.session_state.chats.items(), key=lambda x: x[1].get("created_at", 0), reverse=True):
        is_active = (chat_id == st.session_state.active_chat_id)
        label = f"▶ {chat_data['title'][:22]}" if is_active else f"💬 {chat_data['title'][:22]}"
        if st.button(label, key=f"btn_{chat_id}", use_container_width=True):
            st.session_state.active_chat_id = chat_id
            st.rerun()

st.title(f"✦ {current_chat['title']}")

for msg in current_chat["messages"]:
    with st.chat_message(msg["role"], avatar="✨" if msg["role"] == "assistant" else "👤"):
        st.markdown(msg["content"])

user_input = st.chat_input("Ask anything...")
if user_input:
    current_chat["messages"].append({"role": "user", "content": user_input, "time": datetime.now().strftime("%H:%M")})
    if not current_chat.get("is_auto_named", False):
        words = user_input.strip().split()
        current_chat["title"] = " ".join(words[:5])[:32] if words else "New Chat"
        current_chat["is_auto_named"] = True

    with st.chat_message("user", avatar="👤"):
        st.markdown(user_input)

    with st.chat_message("assistant", avatar="✨"):
        api_key = get_gemini_api_key()
        if not api_key:
            st.error("Missing GEMINI_API_KEY in .env or .streamlit/secrets.toml")
        else:
            client = genai.Client(api_key=api_key)
            formatted = [types.Content(role="model" if m["role"] == "assistant" else "user", parts=[types.Part.from_text(text=m["content"])]) for m in current_chat["messages"]]
            response_stream = client.models.generate_content_stream(
                model="gemini-3.8-flash",
                contents=formatted,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    thinking_config=types.ThinkingConfig(thinking_level="LOW"),
                ),
            )
            full_resp = st.write_stream(chunk.text for chunk in response_stream if chunk.text)
            current_chat["messages"].append({"role": "assistant", "content": full_resp, "time": datetime.now().strftime("%H:%M")})
`;

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([PYTHON_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'app.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#191919]/40 backdrop-blur-xs p-4 sm:p-6">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#E5E0D5] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D9] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5ECE5] text-[#CC785C] border border-[#E8D9CE]">
              <Code className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-medium text-[#191919] flex items-center gap-2">
                <span>Streamlit Standalone Source Code</span>
                <span className="font-mono text-[11px] bg-[#EFECE6] text-[#47433E] px-2 py-0.5 rounded-full font-normal border border-[#E0D9CD]">
                  app.py
                </span>
              </h2>
              <p className="text-xs text-[#7A746B]">
                100% self-contained Python script with Multi-Chat history, Auto-Naming & Instant Streaming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2DDD3] bg-white px-3 py-1.5 text-xs font-medium text-[#47433E] shadow-2xs hover:bg-[#FAF8F5] transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-[#CC785C] hover:bg-[#BA674C] px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download app.py</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8C8479] hover:text-[#191919] hover:bg-[#EFECE5] ml-2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Instructions Banner */}
        <div className="bg-[#F8F5EE] px-6 py-2.5 border-b border-[#EAE4D9] text-xs flex flex-wrap items-center justify-between gap-2 text-[#6B655B]">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[#CC785C]" />
            <span>How to run locally:</span>
            <code className="bg-[#EFEAE1] border border-[#E2DCD1] px-2 py-0.5 rounded font-mono text-[#2B2926] font-semibold">
              pip install streamlit google-genai
            </code>
            <span>then</span>
            <code className="bg-[#EFEAE1] border border-[#E2DCD1] px-2 py-0.5 rounded font-mono text-[#2B2926] font-semibold">
              streamlit run app.py
            </code>
          </div>
          <span className="text-[#CC785C] font-serif italic text-xs">
            Claude Architecture
          </span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#1F1E1D] text-[#ECE7DF] font-mono text-xs leading-relaxed">
          <pre>
            <code>{PYTHON_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
