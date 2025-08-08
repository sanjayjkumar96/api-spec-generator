# Agent Integration

## Overview
The BedrockService has been refactored to use Amazon Bedrock Agent with alias for enhanced content generation. This integration allows the agent to leverage its configured knowledge bases and action groups for more sophisticated responses.

## Configuration

### Environment Variables
```bash
BEDROCK_MODEL_ID=apac.amazon.nova-pro-v1:0
BEDROCK_AGENT_ID=your-agent-id
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
AWS_REGION=ap-south-1
```

### Agent Details
- **Agent ID**: Configurable via `BEDROCK_AGENT_ID`
- **Agent Alias ID**: `TSTALIASID` (default)
- **Model**: Amazon Nova Pro (`apac.amazon.nova-pro-v1:0`)
- **Region**: `ap-south-1`

## Implementation Changes

### 1. Service Updates
- Added `BedrockAgentRuntimeClient` for agent operations
- Replaced `RetrieveAndGenerateCommand` with `InvokeAgentCommand`
- Enhanced response metadata to include agent and session information

### 2. Dependencies
- Added `@aws-sdk/client-bedrock-agent-runtime` package
- Updated BedrockResponse interface to include knowledge base metadata

### 3. Configuration
- Made agent ID and alias ID configurable via environment variables
- Added fallback to default alias ID if environment variable is not set

## Benefits

1. **Enhanced Capabilities**: The agent can access knowledge bases and execute action groups
2. **Orchestration**: Agent handles complex multi-step reasoning and tool usage
3. **Improved Accuracy**: Agent combines knowledge retrieval with reasoning capabilities
4. **Traceability**: Session IDs provide audit trails for agent interactions

## Usage

The service automatically uses the agent for all content generation requests. No changes are required in the calling code - the same `generateContent()` method is used.

```typescript
const response = await bedrockService.generateContent(
  "Generate API specifications for user management",
  "You are an expert API architect..."
);

// Response now includes agent metadata
console.log(response.metadata.agentId);
console.log(response.metadata.sessionId);
```

## Response Structure

```typescript
interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: {
    modelId?: string;
    agentId?: string;
    agentAliasId?: string;
    sessionId?: string;
    timestamp?: string;
    mockMode?: boolean;
  };
}
```

## Mock Mode
When `USE_MOCK_SERVICES=true`, the service continues to use mock responses for local development, maintaining the same interface while allowing development without AWS credentials.