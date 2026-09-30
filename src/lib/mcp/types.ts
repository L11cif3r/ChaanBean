/**
 * CHAANBEAN MCP TYPE DEFINITIONS
 */

export type McpDomain =
  | "core"
  | "company"
  | "credit"
  | "recovery"
  | "communication"
  | "legal";

export interface McpContext {
  tenantId: string;
  userId?: string;
  userRoles?: string[];
  idempotencyKey?: string;
}

export interface McpToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
}

export interface McpToolDefinition {
  name: string;
  domain: McpDomain;
  description: string;
  parameters: Record<string, McpToolParameter>;
  isSideEffecting?: boolean;
}

export interface McpToolExecutionRequest {
  domain: McpDomain;
  tool: string;
  arguments: Record<string, unknown>;
  context: McpContext;
}

export interface McpToolExecutionResponse<T = unknown> {
  success: boolean;
  tool: string;
  domain: McpDomain;
  data?: T;
  error?: string;
  isIdempotentReplay?: boolean;
  rulesEvaluated?: {
    permitted: boolean;
    ruleCode: string;
    reason: string;
  };
  auditRecordId?: string;
  executedAt: string;
}

export type McpToolHandler = (
  args: Record<string, any>,
  context: McpContext
) => Promise<unknown>;
