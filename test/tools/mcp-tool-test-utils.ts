export type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}>;

export class MockMcpServer {
  tools = new Map<string, { config: unknown; handler: ToolHandler }>();

  registerTool(name: string, config: unknown, handler: ToolHandler) {
    this.tools.set(name, { config, handler });
  }
}

export function registerAndGetTool(
  register: (server: unknown) => void,
  toolName: string,
): { handler: ToolHandler; config: unknown } {
  const server = new MockMcpServer();
  register(server as unknown);
  const tool = server.tools.get(toolName);
  if (!tool) throw new Error(`Tool not registered: ${toolName}`);
  return { handler: tool.handler, config: tool.config };
}
