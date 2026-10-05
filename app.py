"""
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
    """
    Manually parse .env without requiring python-dotenv.
    Searches current working directory and script directory for .env or .env.txt.
    """
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
                            val = val.strip().strip("'\"")
                            if key in ("GEMINI_API_KEY", "GOOGLE_API_KEY") and val:
                                os.environ[key] = val
                                if "GEMINI_API_KEY" not in os.environ:
                                    os.environ["GEMINI_API_KEY"] = val
            except Exception:
                pass

load_local_env()

# Attempt to import google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


def get_gemini_api_key():
    """Retrieve Gemini API key from environment, Streamlit secrets, or session state."""
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

CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

code, pre, kbd {
    font-family: 'JetBrains Mono', monospace !important;
}

section[data-testid="stSidebar"] {
    background-color: #0F172A !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #F8FAFC !important;
}

.claude-card {
    background: #FFFFFF !important;
    border-radius: 12px !important;
    border: 1px solid rgba(226, 232, 240, 0.8) !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
    padding: 1.5rem !important;
}

@media (prefers-color-scheme: dark) {
    .claude-card {
        background: #1E293B !important;
        border-color: rgba(51, 65, 85, 0.8) !important;
    }
}

.claude-pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
}

.claude-pill-teal {
    background: rgba(13, 148, 136, 0.12);
    color: #0D9488;
    border: 1px solid rgba(13, 148, 136, 0.25);
}

.claude-pill-emerald {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.25);
}

.claude-pill-rose {
    background: rgba(244, 63, 94, 0.12);
    color: #E11D48;
    border: 1px solid rgba(244, 63, 94, 0.25);
}

.claude-pill-slate {
    background: rgba(148, 163, 184, 0.15);
    color: #475569;
    border: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
"""

st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Multi-Chat Session State Initialization
# -----------------------------------------------------------------------------
def get_initial_welcome():
    return [
        {
            "role": "assistant",
            "content": "Welcome to **My Personal Gemini AI**! 🌟 I am your ultra-fast General AI Assistant powered by **Gemini 3.8 Flash** with instant replies.\n\nAsk me any question across programming, mathematics, science, writing, or analysis. Automatic chat history is enabled!",
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

# -----------------------------------------------------------------------------
# Authentication Guard
# -----------------------------------------------------------------------------
if not st.session_state.authenticated:
    st.markdown("""
    <div style='text-align: center; margin-top: 3rem; margin-bottom: 2rem;'>
        <div style='display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;'>
            <span class='claude-pill-badge claude-pill-teal'>✦ Instant Mode • Gemini 3.8 Flash</span>
        </div>
        <h1 style='font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;'>My Personal Gemini AI</h1>
        <p style='color: #64748B; font-size: 0.95rem; margin: 0;'>Instant-reply conversational intelligence with automatic chat naming</p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.6, 1])
    with col2:
        if is_locked_out:
            remaining_seconds = int(st.session_state.lockout_until - current_time) + 1
            st.markdown(f"""
            <div class='claude-card' style='text-align: center;'>
                <span class='claude-pill-badge claude-pill-rose' style='margin-bottom: 1rem;'>🔒 Security Lockout Active</span>
                <h3>Access Temporarily Denied</h3>
                <p style='color: #64748B;'>Security protocol engaged for <strong>{remaining_seconds}</strong> seconds.</p>
            </div>
            """, unsafe_allow_html=True)
            if st.button("🔄 Check Lockout Status", use_container_width=True):
                st.rerun()
        else:
            with st.form("login_form", clear_on_submit=True):
                st.markdown("<span style='font-weight: 600;'>Security Access Required</span>", unsafe_allow_html=True)
                pwd_input = st.text_input("Passcode:", type="password", placeholder="Enter 6-digit access code...")
                submitted = st.form_submit_button("Unlock Workspace", use_container_width=True)

                if submitted:
                    if pwd_input == "168168":
                        st.session_state.authenticated = True
                        st.session_state.attempts = 0
                        st.success("Access granted!")
                        time.sleep(0.3)
                        st.rerun()
                    else:
                        st.session_state.attempts += 1
                        if st.session_state.attempts >= 3:
                            st.session_state.lockout_until = time.time() + st.session_state.wait_time
                            st.session_state.wait_time += 10
                            st.session_state.attempts = 0
                            st.rerun()
                        else:
                            st.warning(f"Wrong password! {3 - st.session_state.attempts} attempt(s) remaining.")

            with st.expander("ℹ️ Access Code Hint"):
                st.markdown("Default passcode: `168168`")
    st.stop()

# -----------------------------------------------------------------------------
# Sidebar: Chat History, "+ New Chat", and Settings
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div style='margin-bottom: 1rem;'>
        <h2 style='font-size: 1.2rem; font-weight: 700; margin: 0; color: #F8FAFC;'>Gemini Workspace</h2>
        <span class='claude-pill-badge claude-pill-emerald'>● Active & Authenticated</span>
    </div>
    """, unsafe_allow_html=True)

    # + New Chat button
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

    st.divider()

    # Chat History list
    st.markdown("<div style='font-size: 0.75rem; text-transform: uppercase; color: #94A3B8; font-weight: 600; margin-bottom: 0.5rem;'>Chat History</div>", unsafe_allow_html=True)

    sorted_chats = sorted(st.session_state.chats.items(), key=lambda x: x[1].get("created_at", 0), reverse=True)
    for chat_id, chat_data in sorted_chats:
        is_active = (chat_id == st.session_state.active_chat_id)
        btn_label = f"💬 {chat_data['title'][:25]}"
        if is_active:
            btn_label = f"▶ {chat_data['title'][:25]}"

        if st.button(btn_label, key=f"sess_{chat_id}", use_container_width=True):
            st.session_state.active_chat_id = chat_id
            st.rerun()

    st.divider()

    # Intelligence Engine Card
    st.markdown("""
    <div style='font-size: 0.75rem; text-transform: uppercase; color: #94A3B8; font-weight: 600; margin-bottom: 0.5rem;'>Engine Optimization</div>
    <div style='display: flex; flex-direction: column; gap: 0.3rem;'>
        <span class='claude-pill-badge claude-pill-teal'>Model: gemini-3.8-flash</span>
        <span class='claude-pill-badge claude-pill-emerald'>Speed: Instant (ThinkingLevel.LOW)</span>
        <span class='claude-pill-badge claude-pill-slate'>Auto-Naming: Enabled</span>
    </div>
    """, unsafe_allow_html=True)

    st.divider()

    if st.button("🧹 Clear Current Chat", use_container_width=True):
        st.session_state.chats[st.session_state.active_chat_id]["messages"] = get_initial_welcome()
        st.rerun()

    if st.button("🔒 Logout", use_container_width=True):
        st.session_state.authenticated = False
        st.rerun()

# -----------------------------------------------------------------------------
# Main Chat Canvas
# -----------------------------------------------------------------------------
st.title(f"✦ {current_chat['title']}")
st.caption("Instant Streaming Intelligence • Auto-Named Conversation")

for msg in current_chat["messages"]:
    with st.chat_message(msg["role"], avatar="✨" if msg["role"] == "assistant" else "👤"):
        st.markdown(msg["content"])

user_input = st.chat_input("Ask anything (instant reply across code, math, science, writing)...")

if user_input:
    # 1. Append user message
    current_chat["messages"].append({
        "role": "user",
        "content": user_input,
        "time": datetime.now().strftime("%H:%M"),
    })

    # 2. Auto-name chat on first user message
    if not current_chat.get("is_auto_named", False):
        words = user_input.strip().split()
        summary_title = " ".join(words[:5]) if words else "New Chat"
        current_chat["title"] = summary_title[:32]
        current_chat["is_auto_named"] = True

    with st.chat_message("user", avatar="👤"):
        st.markdown(user_input)

    # 3. Call Gemini API with low-latency streaming
    with st.chat_message("assistant", avatar="✨"):
        api_key = get_gemini_api_key()

        if not api_key:
            err = "⚠️ **Gemini API Key Missing**. Please configure `GEMINI_API_KEY` in `.env` or `.streamlit/secrets.toml`."
            st.error(err)
            current_chat["messages"].append({"role": "assistant", "content": err, "time": datetime.now().strftime("%H:%M")})
        elif not GENAI_AVAILABLE:
            err = "⚠️ `google-genai` library not found. Run `pip install google-genai`."
            st.error(err)
            current_chat["messages"].append({"role": "assistant", "content": err, "time": datetime.now().strftime("%H:%M")})
        else:
            try:
                client = genai.Client(api_key=api_key)

                formatted_contents = []
                for m in current_chat["messages"]:
                    role = "model" if m["role"] == "assistant" else "user"
                    formatted_contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=m["content"])]
                        )
                    )

                def stream_gemini_response():
                    response_stream = client.models.generate_content_stream(
                        model="gemini-3.8-flash",
                        contents=formatted_contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            thinking_config=types.ThinkingConfig(thinking_level="LOW"),
                            temperature=0.7,
                        ),
                    )
                    for chunk in response_stream:
                        if chunk.text:
                            yield chunk.text

                full_response = st.write_stream(stream_gemini_response())

                current_chat["messages"].append({
                    "role": "assistant",
                    "content": full_response,
                    "time": datetime.now().strftime("%H:%M"),
                })
            except Exception as e:
                err_msg = f"❌ **Error calling Gemini API**: {str(e)}"
                st.error(err_msg)
                current_chat["messages"].append({"role": "assistant", "content": err_msg, "time": datetime.now().strftime("%H:%M")})
