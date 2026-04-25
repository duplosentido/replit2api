import { useState, useEffect, useCallback } from "react";

const MODELS = [
  { id: "gpt-5.2", provider: "OpenAI" },
  { id: "gpt-5-mini", provider: "OpenAI" },
  { id: "gpt-5-nano", provider: "OpenAI" },
  { id: "o4-mini", provider: "OpenAI" },
  { id: "o3", provider: "OpenAI" },
  { id: "claude-opus-4-6", provider: "Anthropic" },
  { id: "claude-sonnet-4-6", provider: "Anthropic" },
  { id: "claude-haiku-4-5", provider: "Anthropic" },
];

const CHERRY_STEPS = [
  {
    step: 1,
    title: "Open Settings",
    desc: 'In CherryStudio, go to Settings > Model Provider > Add Provider.',
  },
  {
    step: 2,
    title: "Configure Base URL",
    desc: "Set Base URL to your deployed domain (e.g. https://your-domain.replit.app).",
  },
  {
    step: 3,
    title: "Set API Key",
    desc: "Enter your PROXY_API_KEY as the API Key.",
  },
  {
    step: 4,
    title: "Select Models",
    desc: "Click Fetch Models or manually add model IDs from the list below.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button onClick={handleCopy} style={styles.copyBtn}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function EndpointRow({ label, path }: { label: string; path: string }) {
  const url = `${window.location.origin}${path}`;
  return (
    <div style={styles.endpointRow}>
      <div>
        <span style={styles.endpointLabel}>{label}</span>
        <code style={styles.code}>{url}</code>
      </div>
      <CopyButton text={url} />
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    fetch(`${window.location.origin}/api/healthz`)
      .then((r) => {
        setStatus(r.ok ? "online" : "offline");
      })
      .catch(() => setStatus("offline"));
  }, []);

  const baseUrl = window.location.origin;

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>API Portal</h1>
          <div style={styles.statusBadge}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor:
                  status === "online"
                    ? "#22c55e"
                    : status === "offline"
                      ? "#ef4444"
                      : "#eab308",
              }}
            />
            <span style={styles.statusText}>
              {status === "checking"
                ? "Checking..."
                : status === "online"
                  ? "Online"
                  : "Offline"}
            </span>
          </div>
        </header>

        {/* Endpoints */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Endpoints</h2>
          <div style={styles.card}>
            <EndpointRow label="Base URL" path="" />
            <EndpointRow label="Models" path="/v1/models" />
            <EndpointRow label="Chat Completions" path="/v1/chat/completions" />
          </div>
        </section>

        {/* API Key */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Authentication</h2>
          <div style={styles.card}>
            <p style={styles.text}>
              All requests to <code style={styles.inlineCode}>/v1/chat/completions</code> require
              an <code style={styles.inlineCode}>Authorization</code> header:
            </p>
            <div style={styles.codeBlock}>
              <code>Authorization: Bearer YOUR_PROXY_API_KEY</code>
              <CopyButton text="Authorization: Bearer YOUR_PROXY_API_KEY" />
            </div>
          </div>
        </section>

        {/* CherryStudio Guide */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>CherryStudio Setup</h2>
          <div style={styles.card}>
            {CHERRY_STEPS.map((s) => (
              <div key={s.step} style={styles.stepRow}>
                <div style={styles.stepNumber}>{s.step}</div>
                <div>
                  <div style={styles.stepTitle}>{s.title}</div>
                  <div style={styles.stepDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ ...styles.codeBlock, marginTop: 16 }}>
              <code>Base URL: {baseUrl}</code>
              <CopyButton text={baseUrl} />
            </div>
          </div>
        </section>

        {/* Models */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Available Models</h2>
          <div style={styles.card}>
            <div style={styles.modelGrid}>
              {MODELS.map((m) => (
                <div key={m.id} style={styles.modelItem}>
                  <div style={styles.modelId}>{m.id}</div>
                  <span
                    style={{
                      ...styles.providerBadge,
                      backgroundColor:
                        m.provider === "OpenAI"
                          ? "rgba(16,163,127,0.15)"
                          : "rgba(217,119,87,0.15)",
                      color: m.provider === "OpenAI" ? "#10a37f" : "#d97757",
                    }}
                  >
                    {m.provider}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* cURL Example */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Test</h2>
          <div style={styles.card}>
            <div style={styles.codeBlock}>
              <pre style={styles.pre}>{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -d '{
    "model": "gpt-5-nano",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
              <CopyButton
                text={`curl ${baseUrl}/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\\n  -d '{\n    "model": "gpt-5-nano",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`}
              />
            </div>
          </div>
        </section>

        <footer style={styles.footer}>
          <p>Powered by OpenAI & Anthropic</p>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#e5e5e5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottom: "1px solid #262626",
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    border: "1px solid #262626",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontSize: 13,
    fontWeight: 500,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#141414",
    border: "1px solid #262626",
    borderRadius: 12,
    padding: 20,
  },
  endpointRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #1e1e1e",
  },
  endpointLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#737373",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: 4,
  },
  code: {
    fontSize: 14,
    color: "#a78bfa",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  inlineCode: {
    backgroundColor: "#1e1e1e",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 13,
    color: "#a78bfa",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  copyBtn: {
    background: "none",
    border: "1px solid #333",
    color: "#a3a3a3",
    padding: "4px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    transition: "all 0.15s",
  },
  text: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#a3a3a3",
    margin: "0 0 12px 0",
  },
  codeBlock: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #262626",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 13,
    color: "#d4d4d4",
    overflowX: "auto",
  },
  pre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all" as const,
    fontSize: 13,
    lineHeight: 1.6,
  },
  stepRow: {
    display: "flex",
    gap: 16,
    padding: "12px 0",
    borderBottom: "1px solid #1e1e1e",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "#262626",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: "#a3a3a3",
    lineHeight: 1.5,
  },
  modelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 10,
  },
  modelItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #262626",
    borderRadius: 8,
  },
  modelId: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e5e5e5",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  providerBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
  },
  footer: {
    textAlign: "center" as const,
    color: "#525252",
    fontSize: 13,
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #1e1e1e",
  },
};
