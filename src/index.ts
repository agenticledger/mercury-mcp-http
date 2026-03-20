#!/usr/bin/env node
/**
 * Mercury MCP Server — Exposed via Streamable HTTP
 *
 * Auth model: Client sends their own Mercury API token as Bearer token.
 * Supports both raw passthrough and OAuth Client Credentials flow.
 * No credentials are stored on the server.
 */

import { randomUUID, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema as _zodToJsonSchema } from 'zod-to-json-schema';
import { MercuryClient } from './api-client.js';
import { tools } from './tools.js';

function zodToJsonSchema(schema: any): any {
  return _zodToJsonSchema(schema);
}

// ==================== CONFIG ====================

const PORT = parseInt(process.env.PORT || '3100', 10);
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${PORT}`;
const SLUG = 'mercury';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

// ==================== OAuth Client Credentials (in-memory tokens, 1hr TTL) ====================

interface OAuthToken {
  accessToken: string;
  apiKey: string; // the real Mercury API key
  expiresAt: number;
}

const oauthTokens = new Map<string, OAuthToken>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of oauthTokens) {
    if (now > v.expiresAt) oauthTokens.delete(k);
  }
}, 5 * 60 * 1000);

// ==================== OAuth Discovery ====================

app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.json({
    issuer: SERVER_BASE_URL,
    token_endpoint: `${SERVER_BASE_URL}/oauth/token`,
    revocation_endpoint: `${SERVER_BASE_URL}/oauth/revoke`,
    grant_types_supported: ['client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    service_documentation: `https://financemcps.agenticledger.ai/${SLUG}/`,
  });
});

// ==================== OAuth Token Exchange ====================

app.post('/oauth/token', express.urlencoded({ extended: false }), (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (grant_type !== 'client_credentials') {
    res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only client_credentials is supported' });
    return;
  }

  if (!client_secret) {
    res.status(400).json({ error: 'invalid_request', error_description: 'client_secret (your Mercury API key) is required' });
    return;
  }

  const accessToken = `mcp_${randomBytes(32).toString('hex')}`;
  const expiresIn = 3600; // 1 hour

  oauthTokens.set(accessToken, {
    accessToken,
    apiKey: client_secret,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  console.log(`[oauth] Token issued for client_id=${client_id || 'anonymous'}`);

  res.json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    scope: 'mcp',
  });
});

// ==================== OAuth Token Revocation ====================

app.post('/oauth/revoke', express.urlencoded({ extended: false }), (req, res) => {
  const { token } = req.body;
  if (token && oauthTokens.has(token)) {
    oauthTokens.delete(token);
    console.log(`[oauth] Token revoked`);
  }
  // Always return 200 per RFC 7009
  res.json({ status: 'revoked' });
});

// ==================== API Key Resolution ====================

/**
 * Dual-mode API key resolver:
 * - mcp_ prefix = OAuth token, look up real API key from in-memory store
 * - Otherwise = raw passthrough, use as-is
 */
function resolveApiKey(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return null;

  // OAuth-issued token
  if (bearer.startsWith('mcp_')) {
    const tokenData = oauthTokens.get(bearer);
    if (!tokenData) return null;
    if (Date.now() > tokenData.expiresAt) {
      oauthTokens.delete(bearer);
      return null;
    }
    return tokenData.apiKey;
  }

  // Raw passthrough
  return bearer;
}

// ==================== Health Check ====================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'mercury-mcp-http',
    version: '1.0.0',
    tools: tools.length,
    transport: 'streamable-http',
    auth: 'bearer-passthrough + oauth-client-credentials',
  });
});

// ==================== Root / Discovery ====================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

app.get('/', (req, res) => {
  const accept = req.headers.accept || '';

  if (accept.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html');
    res.send(renderLandingPage());
    return;
  }

  // JSON for agents
  res.json({
    name: 'Mercury MCP Server',
    provider: 'AgenticLedger',
    version: '1.0.0',
    description: 'MCP server for Mercury Banking API. Manage accounts, transactions, recipients, payments, invoicing, and treasury operations.',
    mcpEndpoint: '/mcp',
    transport: 'streamable-http',
    tools: tools.length,
    auth: {
      type: 'bearer-passthrough',
      description: 'Pass your Mercury API token as the Bearer token. No credentials are stored on this server.',
      header: 'Authorization: Bearer <your-mercury-api-token>',
      howToGetKey: 'Generate an API token in your Mercury dashboard at https://app.mercury.com → Settings → API Tokens',
      oauthFlow: {
        discovery: '/.well-known/oauth-authorization-server',
        tokenEndpoint: '/oauth/token',
        grantType: 'client_credentials',
        description: 'Pass your Mercury API token as client_secret in the client_credentials flow to get an mcp_ token.',
      },
    },
    configTemplate: {
      mcpServers: {
        mercury: {
          url: `${SERVER_BASE_URL}/mcp`,
          headers: {
            Authorization: 'Bearer <your-mercury-api-token>',
          },
        },
      },
    },
    links: {
      health: '/health',
      documentation: `https://financemcps.agenticledger.ai/${SLUG}/`,
    },
  });
});

function renderLandingPage(): string {
  const configTemplate = JSON.stringify(
    {
      mcpServers: {
        mercury: {
          url: `${SERVER_BASE_URL}/mcp`,
          headers: {
            Authorization: 'Bearer YOUR_API_TOKEN',
          },
        },
      },
    },
    null,
    2,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mercury MCP Server — AgenticLedger</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',system-ui,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6}
    .header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 0}
    .header-inner{max-width:720px;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:12px}
    .header img{height:36px}
    .header span{font-weight:600;font-size:1.1rem;color:#2563EB}
    .container{max-width:720px;margin:0 auto;padding:40px 24px}
    h1{font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:8px}
    .subtitle{color:#64748b;font-size:1rem;margin-bottom:32px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px}
    .card h2{font-size:1.1rem;font-weight:600;margin-bottom:12px;color:#0f172a}
    .card p{color:#475569;font-size:0.95rem;margin-bottom:12px}
    label{display:block;font-weight:500;font-size:0.9rem;margin-bottom:6px;color:#334155}
    input[type="text"]{width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:0.95rem;margin-bottom:16px;transition:border-color .15s}
    input[type="text"]:focus{outline:none;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
    .config-block{position:relative;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:20px;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:0.85rem;line-height:1.7;white-space:pre-wrap;word-break:break-all;margin-top:8px}
    .copy-btn{position:absolute;top:12px;right:12px;background:#2563EB;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-family:inherit;font-size:0.8rem;font-weight:500;cursor:pointer;transition:background .15s}
    .copy-btn:hover{background:#1d4ed8}
    .copy-btn.copied{background:#16a34a}
    .badges{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:#f0f9ff;color:#2563EB;border:1px solid #bfdbfe;border-radius:20px;padding:6px 14px;font-size:0.8rem;font-weight:500}
    .badge svg{width:14px;height:14px;flex-shrink:0}
    .info{color:#64748b;font-size:0.85rem;margin-top:20px}
    .info a{color:#2563EB;text-decoration:none}
    .info a:hover{text-decoration:underline}
    .step-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:#2563EB;color:#fff;border-radius:50%;font-size:0.75rem;font-weight:600;margin-right:8px;flex-shrink:0}
    .step{display:flex;align-items:flex-start;margin-bottom:12px}
    .step p{color:#475569;font-size:0.95rem}
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <img src="/static/logo.png" alt="AgenticLedger" onerror="this.style.display='none'" />
      <span>AgenticLedger</span>
    </div>
  </div>
  <div class="container">
    <h1>Mercury MCP Server</h1>
    <p class="subtitle">Manage accounts, transactions, recipients, payments, invoicing, and treasury operations through MCP tools.</p>

    <div class="card">
      <h2>How Authentication Works</h2>
      <p>This server uses <strong>bearer-passthrough</strong> authentication. Pass your Mercury API token directly as the Bearer token.</p>
      <div class="config-block">Authorization: Bearer &lt;your-mercury-api-token&gt;</div>
      <div class="step" style="margin-top:16px">
        <span class="step-num">1</span>
        <p>Log in to <a href="https://app.mercury.com" target="_blank">app.mercury.com</a></p>
      </div>
      <div class="step">
        <span class="step-num">2</span>
        <p>Go to <strong>Settings &rarr; API Tokens</strong> and generate a token</p>
      </div>
      <div class="step">
        <span class="step-num">3</span>
        <p>Enter it below to generate your MCP client configuration</p>
      </div>
    </div>

    <div class="card">
      <h2>Generate Your MCP Config</h2>
      <label for="apiKey">Mercury API Token</label>
      <input type="text" id="apiKey" placeholder="Paste your API token here..." autocomplete="off" spellcheck="false" />

      <label>MCP Client Configuration</label>
      <div class="config-block" id="configOutput"><button class="copy-btn" id="copyBtn" onclick="copyConfig()">Copy</button>${escapeHtml(configTemplate)}</div>
    </div>

    <div class="card">
      <h2>Trust &amp; Security</h2>
      <div class="badges">
        <span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          No credentials stored
        </span>
        <span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
          Fully stateless
        </span>
        <span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Per-session auth
        </span>
        <span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          Bearer passthrough
        </span>
      </div>
      <p class="info" style="margin-top:16px">Your credentials are sent directly to Mercury's API on each request. This server never persists or logs them.</p>
    </div>

    <p class="info">
      <strong>Endpoints:</strong>
      MCP &rarr; <a href="/mcp">/mcp</a> &nbsp;|&nbsp;
      Health &rarr; <a href="/health">/health</a> &nbsp;|&nbsp;
      Docs &rarr; <a href="https://financemcps.agenticledger.ai/${SLUG}/" target="_blank">Documentation</a> &nbsp;|&nbsp;
      <a href="https://financemcps.agenticledger.ai/" target="_blank">Explore Other MCPs</a>
    </p>
  </div>

  <script>
    const baseUrl = ${JSON.stringify(SERVER_BASE_URL)};
    const apiKeyInput = document.getElementById('apiKey');
    const configOutput = document.getElementById('configOutput');
    const copyBtn = document.getElementById('copyBtn');

    function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function updateConfig() {
      const key = apiKeyInput.value.trim() || 'YOUR_API_TOKEN';
      const config = {
        mcpServers: {
          mercury: {
            url: baseUrl + '/mcp',
            headers: { Authorization: 'Bearer ' + key }
          }
        }
      };
      configOutput.innerHTML = '<button class="copy-btn" id="copyBtn" onclick="copyConfig()">Copy</button>' + escapeHtml(JSON.stringify(config, null, 2));
    }

    apiKeyInput.addEventListener('input', updateConfig);

    function copyConfig() {
      const key = apiKeyInput.value.trim() || 'YOUR_API_TOKEN';
      const config = {
        mcpServers: {
          mercury: {
            url: baseUrl + '/mcp',
            headers: { Authorization: 'Bearer ' + key }
          }
        }
      };
      navigator.clipboard.writeText(JSON.stringify(config, null, 2)).then(function() {
        var btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

// ==================== MCP Server ====================

interface SessionState {
  server: Server;
  transport: StreamableHTTPServerTransport;
  client: MercuryClient;
}

const sessions = new Map<string, SessionState>();

function createMCPServer(client: MercuryClient): Server {
  const server = new Server(
    { name: 'mercury-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.handler(client, args as any);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ==================== MCP Endpoints ====================

// POST /mcp — MCP session entry point (auth REQUIRED)
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Existing session
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session — requires Bearer token
  const apiKey = resolveApiKey(req);
  if (!apiKey) {
    res.status(401).json({
      error: 'Authentication required. Provide a Mercury API token as Bearer token.',
      usage: 'Authorization: Bearer <your-mercury-api-token>',
      oauthFlow: `${SERVER_BASE_URL}/.well-known/oauth-authorization-server`,
    });
    return;
  }

  // Create per-session API client
  const client = new MercuryClient(apiKey);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const server = createMCPServer(client);

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) {
      sessions.delete(sid);
      console.log(`[mcp] Session closed: ${sid}`);
    }
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  const newSessionId = transport.sessionId;
  if (newSessionId) {
    sessions.set(newSessionId, { server, transport, client });
    console.log(`[mcp] New session: ${newSessionId}`);
  }
});

// GET /mcp — SSE stream for server notifications
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session. Send initialization POST first.' });
    return;
  }
  const { transport } = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// DELETE /mcp — close session
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const { transport, server } = sessions.get(sessionId)!;
  await transport.close();
  await server.close();
  sessions.delete(sessionId);
  res.status(200).json({ status: 'session closed' });
});

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`Mercury MCP HTTP Server v1.0.0`);
  console.log(`  MCP endpoint:   ${SERVER_BASE_URL}/mcp`);
  console.log(`  Health check:   ${SERVER_BASE_URL}/health`);
  console.log(`  OAuth discovery: ${SERVER_BASE_URL}/.well-known/oauth-authorization-server`);
  console.log(`  Tools:          ${tools.length}`);
  console.log(`  Transport:      Streamable HTTP`);
  console.log(`  Auth:           Bearer passthrough + OAuth client_credentials`);
});
