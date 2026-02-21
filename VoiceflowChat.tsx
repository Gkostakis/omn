/**
 * VoiceflowChat.tsx — Framer Code Component
 *
 * HOW TO INSTALL IN FRAMER:
 *   1. Open your Framer project
 *   2. Go to Assets panel → Code → + (New Code File)
 *   3. Name it "VoiceflowChat"
 *   4. Replace ALL content with this file
 *   5. Save (Cmd+S)
 *   6. Drag it onto your page canvas from the Assets panel
 *   7. In the right panel, paste your Vercel proxy URL into "Proxy URL"
 *   8. Publish your Framer page
 *
 * PROPERTY CONTROLS (visible in Framer's right panel):
 *   • Proxy URL      — Your Vercel deployment URL + /api/chat
 *   • Placeholder    — Input placeholder text
 *   • Welcome text   — The greeting shown before first message
 *   • Hue A / B / C  — The three gradient orb hue angles (0–360)
 *
 * REQUIREMENTS:
 *   This component calls your Vercel proxy, not Voiceflow directly.
 *   Your API key lives in Vercel only — never in this file.
 */

import { addPropertyControls, ControlType } from "framer"
import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from "react"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Role = "user" | "assistant" | "error"

interface Message {
  id: string
  role: Role
  text: string
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

let _counter = 0
function newID(): string {
  return `msg-${Date.now()}-${++_counter}`
}

function generateSessionID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ─────────────────────────────────────────────────────────────
// Sub-components (inline — Framer needs a single file)
// ─────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", height: 28 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#bbb",
            display: "inline-block",
            animation: `vcTyping 1.4s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface Props {
  proxyUrl: string
  placeholder: string
  welcomeText: string
  hueA: number
  hueB: number
  hueC: number
}

export default function VoiceflowChat({
  proxyUrl = "https://YOUR-PROJECT.vercel.app/api/chat",
  placeholder = "Say something…",
  welcomeText = "How can I help?",
  hueA = 210,
  hueB = 340,
  hueC = 45,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const sessionID = useRef<string>(generateSessionID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mounted, setMounted] = useState(false)

  // Track which message IDs have played their animation
  const animatedIDs = useRef<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    // Inject keyframes once
    if (typeof document !== "undefined" && !document.getElementById("vc-keyframes")) {
      const style = document.createElement("style")
      style.id = "vc-keyframes"
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes vcTyping {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes vcFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vcOrb1 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(4%, 6%) scale(1.06); }
          100% { transform: translate(-3%, 3%) scale(0.97); }
        }
        @keyframes vcOrb2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-5%, -4%) scale(1.04); }
          100% { transform: translate(3%, -2%) scale(1.08); }
        }
        @keyframes vcOrb3 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(2%, -6%) scale(0.95); }
          100% { transform: translate(-4%, 4%) scale(1.05); }
        }
        .vc-msg-enter {
          animation: vcFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .vc-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(180,160,220,0.3);
          border-color: rgba(180,160,220,0.55) !important;
        }
        .vc-send:hover:not(:disabled) {
          background: #333 !important;
          transform: scale(1.06);
        }
        .vc-send:active:not(:disabled) {
          transform: scale(0.94);
        }
        .vc-textarea {
          scrollbar-width: none;
        }
        .vc-textarea::-webkit-scrollbar {
          display: none;
        }
        .vc-scroll::-webkit-scrollbar {
          display: none;
        }
        .vc-scroll {
          scrollbar-width: none;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`
  }, [input])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // ── Send ────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return
    if (!proxyUrl || proxyUrl.includes("YOUR-PROJECT")) {
      setMessages((prev) => [
        ...prev,
        {
          id: newID(),
          role: "error",
          text: "No proxy URL set. Add your Vercel URL in the Framer property panel.",
        },
      ])
      return
    }

    const userMsg: Message = { id: newID(), role: "user", text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: sessionID.current,
          action: { type: "text", payload: text },
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? "Unexpected error")

      setMessages((prev) => [
        ...prev,
        { id: newID(), role: "assistant", text: data.text?.trim() || "…" },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: newID(),
          role: "error",
          text: err instanceof Error ? err.message : "Something went wrong.",
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping, proxyUrl])

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = input.trim().length > 0 && !isTyping

  // ── Styles ──────────────────────────────────────────────────
  const s = styles(hueA, hueB, hueC)

  if (!mounted) return null

  return (
    <div style={s.root}>
      {/* Gradient orbs */}
      <div style={s.orb1} aria-hidden />
      <div style={s.orb2} aria-hidden />
      <div style={s.orb3} aria-hidden />

      {/* Message canvas */}
      <div className="vc-scroll" style={s.scroll} role="log" aria-live="polite">
        {/* Welcome / empty state */}
        {messages.length === 0 && !isTyping && (
          <div style={s.empty}>
            <p style={s.emptyText}>{welcomeText}</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isNew = !animatedIDs.current.has(msg.id)
          if (isNew) animatedIDs.current.add(msg.id)
          const isUser = msg.role === "user"
          const isError = msg.role === "error"

          return (
            <div
              key={msg.id}
              className={isNew ? "vc-msg-enter" : ""}
              style={{
                ...s.msgRow,
                justifyContent: isUser ? "flex-end" : "flex-start",
                opacity: isNew ? 0 : 1,
              }}
            >
              <div
                style={
                  isUser
                    ? s.userBubble
                    : isError
                    ? s.errorText
                    : s.assistantText
                }
              >
                {msg.text.split("\n\n").map((para, i) => (
                  <p key={i} style={i > 0 ? { marginTop: 16 } : {}}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ ...s.msgRow, justifyContent: "flex-start" }}>
            <TypingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={s.inputOuter}>
        {/* Fade-out mask above input */}
        <div style={s.inputFade} aria-hidden />

        <div style={s.inputWrap}>
          <div style={s.inputBar} className="vc-inputbar">
            <textarea
              ref={textareaRef}
              className="vc-textarea vc-input"
              value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isTyping}
              placeholder={placeholder}
              rows={1}
              aria-label="Chat input"
              style={s.textarea}
            />
            <button
              onClick={send}
              disabled={!canSend}
              aria-label="Send"
              className="vc-send"
              style={{
                ...s.sendBtn,
                background: canSend ? "#1a1a1a" : "#f0f0f0",
                color: canSend ? "#fff" : "#ccc",
                opacity: canSend ? 1 : 0,
                pointerEvents: canSend ? "auto" : "none",
                cursor: canSend ? "pointer" : "default",
              }}
            >
              <SendIcon />
            </button>
          </div>

          <p style={s.privacyNote}>
            No data stored. Conversations reset on refresh.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Styles — returns a style object map, uses hues for gradient
// ─────────────────────────────────────────────────────────────

function styles(hueA: number, hueB: number, hueC: number) {
  const font = "'DM Sans', ui-sans-serif, system-ui, sans-serif"

  return {
    root: {
      position: "relative" as const,
      width: "100%",
      height: "100%",
      minHeight: "100vh",
      background: "#ffffff",
      overflow: "hidden",
      fontFamily: font,
      WebkitFontSmoothing: "antialiased",
      display: "flex",
      flexDirection: "column" as const,
    },

    // ── Gradient orbs ──────────────────────────────────────────
    orb1: {
      position: "absolute" as const,
      top: "-20%",
      left: "-15%",
      width: "70vw",
      height: "70vw",
      borderRadius: "50%",
      background: `radial-gradient(circle, hsl(${hueA}deg, 70%, 75%), transparent 70%)`,
      filter: "blur(120px)",
      opacity: 0.12,
      animation: "vcOrb1 32s ease-in-out infinite alternate",
      pointerEvents: "none" as const,
      zIndex: 0,
    },
    orb2: {
      position: "absolute" as const,
      bottom: "-15%",
      right: "-10%",
      width: "60vw",
      height: "60vw",
      borderRadius: "50%",
      background: `radial-gradient(circle, hsl(${hueB}deg, 65%, 80%), transparent 70%)`,
      filter: "blur(100px)",
      opacity: 0.11,
      animation: "vcOrb2 26s ease-in-out infinite alternate",
      animationDelay: "-8s",
      pointerEvents: "none" as const,
      zIndex: 0,
    },
    orb3: {
      position: "absolute" as const,
      top: "30%",
      left: "35%",
      width: "50vw",
      height: "50vw",
      borderRadius: "50%",
      background: `radial-gradient(circle, hsl(${hueC}deg, 60%, 85%), transparent 70%)`,
      filter: "blur(100px)",
      opacity: 0.08,
      animation: "vcOrb3 38s ease-in-out infinite alternate",
      animationDelay: "-14s",
      pointerEvents: "none" as const,
      zIndex: 0,
    },

    // ── Message scroll area ────────────────────────────────────
    scroll: {
      position: "relative" as const,
      zIndex: 1,
      flex: 1,
      overflowY: "auto" as const,
      paddingTop: 64,
      paddingBottom: 180,
      display: "flex",
      flexDirection: "column" as const,
      gap: 28,
    },

    // ── Empty state ────────────────────────────────────────────
    empty: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "55vh",
      padding: "0 24px",
    },
    emptyText: {
      color: "#d0d0d0",
      fontSize: 36,
      fontWeight: 300,
      letterSpacing: "-0.5px",
      textAlign: "center" as const,
      lineHeight: 1.3,
      margin: 0,
    },

    // ── Message row (wraps the bubble/text) ───────────────────
    msgRow: {
      width: "100%",
      maxWidth: 800,
      marginLeft: "auto",
      marginRight: "auto",
      padding: "0 24px",
      display: "flex",
      boxSizing: "border-box" as const,
    },

    // ── User bubble ───────────────────────────────────────────
    userBubble: {
      maxWidth: "80%",
      background: "#f5f5f5",
      borderRadius: 24,
      padding: "12px 20px",
      color: "#777",
      fontSize: 15,
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: "0.01em",
      margin: 0,
    },

    // ── Assistant text (no bubble — large open text) ──────────
    assistantText: {
      maxWidth: "90%",
      color: "#1a1a1a",
      fontSize: 26,
      fontWeight: 300,
      lineHeight: 1.65,
      letterSpacing: "-0.3px",
      margin: 0,
    },

    // ── Error text ────────────────────────────────────────────
    errorText: {
      maxWidth: "90%",
      color: "#e57373",
      fontSize: 15,
      fontWeight: 300,
      fontStyle: "italic" as const,
      lineHeight: 1.6,
      margin: 0,
    },

    // ── Input fixed area ──────────────────────────────────────
    inputOuter: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingBottom: 28,
      paddingLeft: 16,
      paddingRight: 16,
    },
    inputFade: {
      position: "absolute" as const,
      bottom: "100%",
      left: 0,
      right: 0,
      height: 96,
      background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.96))",
      pointerEvents: "none" as const,
    },
    inputWrap: {
      maxWidth: 800,
      marginLeft: "auto",
      marginRight: "auto",
    },
    inputBar: {
      display: "flex",
      alignItems: "flex-end",
      gap: 12,
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(0,0,0,0.09)",
      borderRadius: 32,
      padding: "12px 16px",
      boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
      transition: "border-color 0.3s, box-shadow 0.3s",
    },
    textarea: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      resize: "none" as const,
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
      fontSize: 16,
      fontWeight: 300,
      color: "#1a1a1a",
      lineHeight: 1.6,
      maxHeight: 136,
      overflowY: "auto" as const,
    },
    sendBtn: {
      flexShrink: 0,
      width: 36,
      height: 36,
      borderRadius: "50%",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.25s ease",
      outline: "none",
    },
    privacyNote: {
      textAlign: "center" as const,
      fontSize: 11,
      color: "#bbb",
      marginTop: 10,
      letterSpacing: "0.04em",
      fontWeight: 300,
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Framer Property Controls
// These show up in the right panel when you select the component
// ─────────────────────────────────────────────────────────────

addPropertyControls(VoiceflowChat, {
  proxyUrl: {
    type: ControlType.String,
    title: "Proxy URL",
    placeholder: "https://your-project.vercel.app/api/chat",
    description: "Your deployed Vercel proxy endpoint",
  },
  welcomeText: {
    type: ControlType.String,
    title: "Welcome Text",
    defaultValue: "How can I help?",
  },
  placeholder: {
    type: ControlType.String,
    title: "Input Placeholder",
    defaultValue: "Say something…",
  },
  hueA: {
    type: ControlType.Number,
    title: "Hue — Orb 1",
    defaultValue: 210,
    min: 0,
    max: 360,
    step: 1,
    description: "HSL hue for the top-left gradient orb",
  },
  hueB: {
    type: ControlType.Number,
    title: "Hue — Orb 2",
    defaultValue: 340,
    min: 0,
    max: 360,
    step: 1,
    description: "HSL hue for the bottom-right gradient orb",
  },
  hueC: {
    type: ControlType.Number,
    title: "Hue — Orb 3",
    defaultValue: 45,
    min: 0,
    max: 360,
    step: 1,
    description: "HSL hue for the center gradient orb",
  },
})
