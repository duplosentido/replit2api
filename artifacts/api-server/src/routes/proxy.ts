import { Router, Request, Response, type IRouter } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

interface FlushableResponse extends Response {
  flush?: () => void;
}

const router: IRouter = Router();

const PROXY_API_KEY = process.env.PROXY_API_KEY ?? "";

const MODELS = [
  { id: "gpt-5.2", owned_by: "openai" },
  { id: "gpt-5-mini", owned_by: "openai" },
  { id: "gpt-5-nano", owned_by: "openai" },
  { id: "o4-mini", owned_by: "openai" },
  { id: "o3", owned_by: "openai" },
  { id: "claude-opus-4-6", owned_by: "anthropic" },
  { id: "claude-sonnet-4-6", owned_by: "anthropic" },
  { id: "claude-haiku-4-5", owned_by: "anthropic" },
  { id: "glm-4.5", owned_by: "z-ai" },
  { id: "glm-4.5-air", owned_by: "z-ai" },
  { id: "glm-4.6", owned_by: "z-ai" },
  { id: "glm-4.7", owned_by: "z-ai" },
  { id: "glm-5", owned_by: "z-ai" },
  { id: "glm-5-turbo", owned_by: "z-ai" },
  { id: "glm-5.1", owned_by: "z-ai" },
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
});

function authenticate(req: Request, res: FlushableResponse): boolean {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${PROXY_API_KEY}`) {
    res.status(401).json({ error: { message: "Invalid API key", type: "authentication_error" } });
    return false;
  }
  return true;
}

function isOpenAICompatibleModel(model: string): boolean {
  return model.startsWith("gpt") || model.startsWith("o") || model.startsWith("glm");
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith("claude");
}

interface ChatMessage {
  role: string;
  content: string;
}

// GET /v1/models
router.get("/models", (_req: Request, res: Response) => {
  res.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: m.owned_by,
    })),
  });
});

// POST /v1/chat/completions
router.post("/chat/completions", async (req: Request, res: FlushableResponse) => {
  if (!authenticate(req, res)) return;

  const { model, messages, stream, ...rest } = req.body as {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    [key: string]: unknown;
  };

  if (!model || !messages) {
    res.status(400).json({ error: { message: "model and messages are required" } });
    return;
  }

  if (isOpenAICompatibleModel(model)) {
    await handleOpenAI(req, res, model, messages, stream ?? false, rest);
  } else if (isAnthropicModel(model)) {
    await handleAnthropic(req, res, model, messages, stream ?? false, rest);
  } else {
    res.status(400).json({ error: { message: `Unknown model: ${model}` } });
  }
});

async function handleOpenAI(
  req: Request,
  res: FlushableResponse,
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  rest: Record<string, unknown>,
) {
  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const keepalive = setInterval(() => {
      try { res.write(": keepalive\n\n"); res.flush?.(); } catch { /* ignore */ }
    }, 5000);

    req.on("close", () => clearInterval(keepalive));

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        stream: true,
        ...rest,
      });

      for await (const chunk of completion) {
        const data = JSON.stringify(chunk);
        res.write(`data: ${data}\n\n`);
        res.flush?.();
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "OpenAI request failed";
      res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
      res.end();
    } finally {
      clearInterval(keepalive);
    }
  } else {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        ...rest,
      });
      res.json(completion);
    } catch (err) {
      const message = err instanceof Error ? err.message : "OpenAI request failed";
      res.status(500).json({ error: { message } });
    }
  }
}

async function handleAnthropic(
  req: Request,
  res: FlushableResponse,
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  rest: Record<string, unknown>,
) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const systemPrompt = systemMessages.map((m) => m.content).join("\n") || undefined;

  const anthropicMessages: Anthropic.MessageParam[] = chatMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const maxTokens = (rest.max_tokens as number) || 4096;

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const keepalive = setInterval(() => {
      try { res.write(": keepalive\n\n"); res.flush?.(); } catch { /* ignore */ }
    }, 5000);

    req.on("close", () => clearInterval(keepalive));

    const completionId = `chatcmpl-${Date.now()}`;
    let chunkIndex = 0;

    try {
      const streamResponse = anthropic.messages.stream({
        model,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        system: systemPrompt,
      });

      streamResponse.on("text", (text: string) => {
        const chunk = {
          id: completionId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              delta: chunkIndex === 0
                ? { role: "assistant", content: text }
                : { content: text },
              finish_reason: null,
            },
          ],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        res.flush?.();
        chunkIndex++;
      });

      await streamResponse.finalMessage();

      const doneChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
      res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Anthropic request failed";
      res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
      res.end();
    } finally {
      clearInterval(keepalive);
    }
  } else {
    try {
      const response = await anthropic.messages.create({
        model,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        system: systemPrompt,
      });

      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: textContent },
            finish_reason: response.stop_reason === "end_turn" ? "stop" : response.stop_reason,
          },
        ],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Anthropic request failed";
      res.status(500).json({ error: { message } });
    }
  }
}

export default router;
