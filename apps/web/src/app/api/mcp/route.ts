import { NextResponse } from 'next/server';
import { verifyMcpToken } from '@/lib/mcp-token';
import { MCP_TOOL_DEFINITIONS, executeMcpTool } from '@/lib/mcp-tools';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MCP_RATE_LIMIT_WINDOW_MS = 60_000;
const MCP_RATE_LIMIT_MAX_REQUESTS = 120;

function parseAuthHeader(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

export async function POST(req: Request) {
  const token = parseAuthHeader(req);
  const context = token ? await verifyMcpToken(token) : null;

  if (context) {
    const { allowed } = await checkRateLimit(`mcp:${context.tokenId}`, {
      windowMs: MCP_RATE_LIMIT_WINDOW_MS,
      maxRequests: MCP_RATE_LIMIT_MAX_REQUESTS,
    });
    if (!allowed) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32001, message: 'Rate limit exceeded' }, id: null },
        { status: 429 }
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400 }
    );
  }

  const parsed = body as { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };
  const id = parsed.id ?? null;
  const method = parsed.method;
  const params = (parsed.params as Record<string, unknown>) ?? {};

  if (!method) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id },
      { status: 400 }
    );
  }

  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'dependwatch',
          version: '1.0.0',
        },
      },
    });
  }

  if (method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
  }

  if (method === 'tools/call') {
    const name = typeof params.name === 'string' ? params.name : '';
    const args = typeof params.arguments === 'object' && params.arguments !== null
      ? (params.arguments as Record<string, unknown>)
      : {};
    if (!name) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Invalid params: tool name required' },
      });
    }
    try {
      const result = await executeMcpTool(name, args, context);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: result.content,
          isError: false,
        },
      });
    } catch (err) {
      console.error('[mcp] tools/call', name, err);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }],
          isError: true,
        },
      });
    }
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}
