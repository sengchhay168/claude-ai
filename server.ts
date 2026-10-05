import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Fast Automatic Title Generator for Chat History
  app.post("/api/title", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Missing or invalid 'message' parameter" });
        return;
      }

      const cleanMessage = message.trim().slice(0, 300);
      const ai = getGenAIClient();

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: cleanMessage,
          config: {
            systemInstruction:
              "You are a conversation summarizer. Generate an ultra-concise title of 2 to 5 words summarizing the user's conversation topic. Output only the plain text title without quotes, prefixes, or punctuation.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const title = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
        if (title && title.length < 50) {
          res.json({ title });
          return;
        }
      } catch {
        // Fallback to text heuristic if AI call fails or rate limited
      }

      // Fast deterministic fallback title
      const words = cleanMessage.split(/\s+/).slice(0, 5).join(" ");
      res.json({ title: words || "New Chat" });
    } catch {
      const raw = req.body?.message ? String(req.body.message).slice(0, 30) : "New Chat";
      res.json({ title: raw });
    }
  });

  // Ultra-fast streaming chat endpoint using Gemini with low latency thinking
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
        return;
      }

      // Send headers immediately to avoid buffering delay
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // Send immediate connection acknowledgment for instant UI feedback
      res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

      const ai = getGenAIClient();

      // Format messages for @google/genai contents (including multimodal image/document attachments)
      const contents = messages.map(
        (msg: {
          role: string;
          content: string;
          attachments?: Array<{ name: string; type: string; dataUrl?: string; base64Data?: string }>;
        }) => {
          const parts: Array<Record<string, unknown>> = [];

          if (msg.attachments && Array.isArray(msg.attachments)) {
            for (const att of msg.attachments) {
              let base64 = att.base64Data;
              if (!base64 && att.dataUrl) {
                const commaIdx = att.dataUrl.indexOf(",");
                if (commaIdx !== -1) {
                  base64 = att.dataUrl.slice(commaIdx + 1);
                }
              }

              if (base64) {
                // Ensure supported mime types
                let mimeType = att.type || "application/octet-stream";
                if (!mimeType || mimeType === "application/octet-stream") {
                  if (att.name?.endsWith(".png")) mimeType = "image/png";
                  else if (att.name?.match(/\.jpe?g$/i)) mimeType = "image/jpeg";
                  else if (att.name?.endsWith(".webp")) mimeType = "image/webp";
                  else if (att.name?.endsWith(".pdf")) mimeType = "application/pdf";
                  else if (att.name?.endsWith(".txt")) mimeType = "text/plain";
                  else if (att.name?.endsWith(".csv")) mimeType = "text/csv";
                  else if (att.name?.endsWith(".json")) mimeType = "application/json";
                  else if (att.name?.endsWith(".md")) mimeType = "text/markdown";
                }

                // If plain text, markdown, CSV, or JSON document, decode to text part so Gemini reads it directly
                const isTextDoc =
                  mimeType.startsWith("text/") ||
                  mimeType === "application/json" ||
                  Boolean(att.name?.match(/\.(txt|md|csv|json|py|js|ts|html|css|yaml|yml)$/i));

                if (isTextDoc) {
                  try {
                    const textDecoded = Buffer.from(base64, "base64").toString("utf8");
                    parts.push({
                      text: `[Attached Document: ${att.name || "file"}]\n\`\`\`\n${textDecoded}\n\`\`\``,
                    });
                  } catch {
                    parts.push({
                      inlineData: {
                        mimeType,
                        data: base64,
                      },
                    });
                  }
                } else {
                  // Images, PDFs, and binary documents as inlineData
                  parts.push({
                    inlineData: {
                      mimeType,
                      data: base64,
                    },
                  });
                }
              }
            }
          }

          const textContent =
            msg.content || (parts.length > 0 ? "Please analyze the attached image or document." : "");
          parts.push({ text: textContent });

          return {
            role: msg.role === "assistant" ? "model" : "user",
            parts,
          };
        }
      );

      const systemInstruction =
        "You are a premium, highly sophisticated, and analytical AI assistant deeply inspired by Anthropic's Claude. \nYour tone is intellectual, empathetic, direct, and collaborative. Avoid generic, robotic AI phrases. Speak like an elite research peer or a senior engineer. \nAlways prioritize high-quality, structured, and beautifully scannable answers. Because your interface uses an elegant, open-air layout, format your responses beautifully using rich markdown. Use bold highlights, clean spacing, and clear bulleted lists. When writing code, provide perfectly formatted blocks with clean spacing and minimal, helpful comments.";

      // Models: gemini-3.1-flash-lite primary for high availability and generous quota
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      let completed = false;
      let streamedAnyText = false;
      let lastError: unknown = null;

      for (const modelName of candidateModels) {
        try {
          const config: Record<string, unknown> = { systemInstruction };
          // thinkingConfig is only supported on Gemini 3 series models
          if (modelName.startsWith("gemini-3")) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config,
          });

          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              streamedAnyText = true;
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          completed = true;
          res.write("data: [DONE]\n\n");
          res.end();
          break;
        } catch (mErr: unknown) {
          console.warn(`Model ${modelName} encountered error:`, mErr);
          lastError = mErr;
          const errMsg = mErr instanceof Error ? mErr.message : String(mErr);

          // If text was already streamed and stream closed with SDK EOF segment issue, consider completed
          if (streamedAnyText && errMsg.toLowerCase().includes("incomplete json segment")) {
            completed = true;
            res.write("data: [DONE]\n\n");
            res.end();
            break;
          }

          // If chunks were already written to the client, cannot safely switch models mid-stream
          if (streamedAnyText) {
            break;
          }
        }
      }

      // Unary fallback if streaming failed before any text was sent
      if (!completed && !streamedAnyText) {
        try {
          console.log("Attempting unary generateContent fallback with gemini-3.1-flash-lite...");
          const fallbackResp = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const text = fallbackResp.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            completed = true;
            res.write("data: [DONE]\n\n");
            res.end();
          }
        } catch (fbErr) {
          console.warn("Unary fallback also failed:", fbErr);
          lastError = fbErr;
        }
      }

      if (!completed) {
        if (streamedAnyText) {
          // Tokens were already delivered to user, finish cleanly
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          let cleanErrorMsg = "Failed to generate AI response.";
          if (lastError) {
            const raw = lastError instanceof Error ? lastError.message : String(lastError);
            if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota")) {
              cleanErrorMsg = "API quota exceeded for this model. Please retry shortly.";
            } else {
              cleanErrorMsg = raw;
            }
          }
          res.write(`data: ${JSON.stringify({ error: cleanErrorMsg })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        }
      }
    } catch (err: unknown) {
      console.error("Gemini API Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Internal server error";

      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
