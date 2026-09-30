/**
 * CHAANBEAN CENTRAL MCP GATEWAY
 *
 * Implements the core architecture principle:
 * AI Recommends -> Rules Authorize -> MCP Executes -> Audit Records
 *
 * Coordinates:
 * 1. Core Server (6 tools)
 * 2. Company Server (6 tools)
 * 3. Credit Server (4 tools)
 * 4. Recovery Server (4 tools)
 * 5. Communication Server (3 tools)
 * 6. Legal Server (3 tools)
 * Total: 26 Priority Tools
 */

import { prisma } from "@/lib/db";
import {
  McpDomain,
  McpToolDefinition,
  McpToolExecutionRequest,
  McpToolExecutionResponse,
  McpToolHandler,
} from "./types";
import { CORE_TOOL_DEFINITIONS, CORE_TOOL_HANDLERS } from "./servers/core-server";
import { COMPANY_TOOL_DEFINITIONS, COMPANY_TOOL_HANDLERS } from "./servers/company-server";
import { CREDIT_TOOL_DEFINITIONS, CREDIT_TOOL_HANDLERS } from "./servers/credit-server";
import { RECOVERY_TOOL_DEFINITIONS, RECOVERY_TOOL_HANDLERS } from "./servers/recovery-server";
import { COMMUNICATION_TOOL_DEFINITIONS, COMMUNICATION_TOOL_HANDLERS } from "./servers/communication-server";
import { LEGAL_TOOL_DEFINITIONS, LEGAL_TOOL_HANDLERS } from "./servers/legal-server";

export class McpGateway {
  private static toolRegistry: Map<string, McpToolDefinition> = new Map();
  private static handlerRegistry: Map<string, McpToolHandler> = new Map();
  private static idempotencyCache: Map<string, McpToolExecutionResponse> = new Map();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    // Register all tools and handlers
    const allDefs = [
      ...CORE_TOOL_DEFINITIONS,
      ...COMPANY_TOOL_DEFINITIONS,
      ...CREDIT_TOOL_DEFINITIONS,
      ...RECOVERY_TOOL_DEFINITIONS,
      ...COMMUNICATION_TOOL_DEFINITIONS,
      ...LEGAL_TOOL_DEFINITIONS,
    ];

    allDefs.forEach((def) => {
      this.toolRegistry.set(def.name, def);
    });

    const allHandlers: Record<string, McpToolHandler> = {
      ...CORE_TOOL_HANDLERS,
      ...COMPANY_TOOL_HANDLERS,
      ...CREDIT_TOOL_HANDLERS,
      ...RECOVERY_TOOL_HANDLERS,
      ...COMMUNICATION_TOOL_HANDLERS,
      ...LEGAL_TOOL_HANDLERS,
    };

    Object.entries(allHandlers).forEach(([name, handler]) => {
      this.handlerRegistry.set(name, handler);
    });

    this.initialized = true;
  }

  /**
   * Returns list of registered MCP tools, optionally filtered by domain.
   */
  public static listTools(domain?: McpDomain): McpToolDefinition[] {
    this.initialize();
    const tools = Array.from(this.toolRegistry.values());
    if (domain) {
      return tools.filter((t) => t.domain === domain);
    }
    return tools;
  }

  /**
   * Executes an MCP tool request with tenant isolation, authorization, idempotency, and audit logging.
   */
  public static async executeTool(
    request: McpToolExecutionRequest
  ): Promise<McpToolExecutionResponse> {
    this.initialize();

    const { tool, arguments: args, context } = request;
    const toolDef = this.toolRegistry.get(tool);

    if (!toolDef) {
      return {
        success: false,
        tool,
        domain: request.domain,
        error: `Tool "${tool}" is not registered in the MCP gateway catalogue.`,
        executedAt: new Date().toISOString(),
      };
    }

    // 1. TENANT ISOLATION CHECK (Mandatory guardrail)
    if (!context || !context.tenantId) {
      return {
        success: false,
        tool,
        domain: toolDef.domain,
        error: "Tenant context is mandatory for all MCP operations. Cross-tenant access denied.",
        executedAt: new Date().toISOString(),
      };
    }

    let tenant = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        tenant = await prisma.company.findUnique({
          where: { id: context.tenantId },
        });
        break;
      } catch (err: unknown) {
        if (attempts >= 3) {
          return {
            success: false,
            tool,
            domain: toolDef.domain,
            error: `Tenant validation failed: ${err instanceof Error ? err.message : String(err)}`,
            executedAt: new Date().toISOString(),
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!tenant) {
      return {
        success: false,
        tool,
        domain: toolDef.domain,
        error: `Invalid or non-existent tenant: ${context.tenantId}`,
        executedAt: new Date().toISOString(),
      };
    }

    // 2. PARAMETER SCHEMA & TYPE VALIDATION
    if (toolDef.parameters && typeof toolDef.parameters === "object") {
      for (const [paramName, paramDef] of Object.entries(toolDef.parameters)) {
        const val = args ? args[paramName] : undefined;
        if (paramDef.required && (val === undefined || val === null || val === "")) {
          return {
            success: false,
            tool,
            domain: toolDef.domain,
            error: `Missing required parameter: ${paramName}`,
            executedAt: new Date().toISOString(),
          };
        }
        if (val !== undefined && val !== null) {
          if (paramDef.type === "number" && (typeof val !== "number" || isNaN(val))) {
            return {
              success: false,
              tool,
              domain: toolDef.domain,
              error: `Invalid type for parameter '${paramName}': expected number, got ${typeof val}`,
              executedAt: new Date().toISOString(),
            };
          }
          if (paramDef.type === "string" && typeof val !== "string") {
            return {
              success: false,
              tool,
              domain: toolDef.domain,
              error: `Invalid type for parameter '${paramName}': expected string, got ${typeof val}`,
              executedAt: new Date().toISOString(),
            };
          }
          if (paramDef.type === "boolean" && typeof val !== "boolean") {
            return {
              success: false,
              tool,
              domain: toolDef.domain,
              error: `Invalid type for parameter '${paramName}': expected boolean, got ${typeof val}`,
              executedAt: new Date().toISOString(),
            };
          }
          if (paramDef.type === "array" && !Array.isArray(val)) {
            return {
              success: false,
              tool,
              domain: toolDef.domain,
              error: `Invalid type for parameter '${paramName}': expected array, got ${typeof val}`,
              executedAt: new Date().toISOString(),
            };
          }
        }
      }
    }

    // 3. IDEMPOTENCY & REPLAY PROTECTION
    const idempotencyKey = context.idempotencyKey;
    const cacheKey = idempotencyKey ? `${context.tenantId}:${tool}:${idempotencyKey}` : null;

    if (cacheKey && toolDef.isSideEffecting) {
      // Tier 1: Check in-memory fast replay cache
      const cachedInMemory = this.idempotencyCache.get(cacheKey);
      if (cachedInMemory) {
        return {
          ...cachedInMemory,
          isIdempotentReplay: true,
        };
      }

      // Tier 2: Check persistent database audit log
      try {
        const existingAudit = await prisma.aiDecisionLog.findFirst({
          where: {
            companyId: context.tenantId,
            promptHash: `idemp_${tool}_${idempotencyKey}`,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingAudit && existingAudit.rawResponse) {
          try {
            const parsed = JSON.parse(existingAudit.rawResponse);
            const replayResp: McpToolExecutionResponse = {
              success: true,
              tool,
              domain: toolDef.domain,
              data: parsed.result,
              isIdempotentReplay: true,
              auditRecordId: existingAudit.id,
              executedAt: existingAudit.createdAt.toISOString(),
            };
            this.idempotencyCache.set(cacheKey, replayResp);
            return replayResp;
          } catch {
            // If parse fails, proceed with execution
          }
        }
      } catch (err) {
        console.warn("Idempotency lookup warning:", err);
      }
    }

    const handler = this.handlerRegistry.get(tool);
    if (!handler) {
      return {
        success: false,
        tool,
        domain: toolDef.domain,
        error: `No handler registered for tool "${tool}".`,
        executedAt: new Date().toISOString(),
      };
    }

    try {
      // 3. EXECUTE TOOL HANDLER
      const result = await handler(args, context);

      // 4. AUDIT RECORDING
      let auditRecordId = "";
      const promptHash = idempotencyKey
        ? `idemp_${tool}_${idempotencyKey}`
        : `tool_${tool}_${Date.now()}`;

      try {
        const auditLog = await prisma.aiDecisionLog.create({
          data: {
            companyId: context.tenantId,
            module: `mcp_${toolDef.domain}`,
            promptHash,
            decisionSummary: `Executed MCP Tool "${tool}" in domain "${toolDef.domain}".`,
            confidenceScore: 1.0,
            rawResponse: JSON.stringify({
              arguments: args,
              result,
            }),
          },
        });
        auditRecordId = auditLog.id;
      } catch (auditErr) {
        console.warn("Audit logging non-fatal error:", auditErr);
      }

      const executionResponse: McpToolExecutionResponse = {
        success: true,
        tool,
        domain: toolDef.domain,
        data: result,
        isIdempotentReplay: false,
        auditRecordId,
        executedAt: new Date().toISOString(),
      };

      // Store in idempotency replay cache if key present
      if (cacheKey && toolDef.isSideEffecting) {
        this.idempotencyCache.set(cacheKey, executionResponse);
      }

      return executionResponse;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Internal tool execution failed.";
      return {
        success: false,
        tool,
        domain: toolDef.domain,
        error: errorMsg,
        executedAt: new Date().toISOString(),
      };
    }
  }
}
