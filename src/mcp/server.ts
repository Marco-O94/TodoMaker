import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pkg from "../../package.json" with { type: "json" };
import { tools } from "./tools.js";

/**
 * MCP server over stdio. stdout is the transport — all logging MUST go to stderr,
 * or the JSON-RPC protocol gets corrupted. Identity comes from package.json so the
 * advertised version never drifts.
 */
const server = new McpServer({ name: pkg.name, version: pkg.version });

for (const tool of tools) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    tool.handler as Parameters<typeof server.registerTool>[2],
  );
}

await server.connect(new StdioServerTransport());
console.error(`[${pkg.name}] MCP server ready on stdio`);
