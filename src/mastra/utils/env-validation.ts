import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "staging", "production"]).optional(),
  PORT: z.string().optional(),
});

export function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env);
    
    // LLM APIキーのチェック（警告のみ）
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
      console.warn("⚠️ Warning: No LLM API keys found. Some features may not work.");
    } else {
      console.log("✅ Environment variables validated successfully");
    }
    
    return env;
  } catch (error) {
    console.error("❌ Environment validation failed:", error.errors || error.message);
    throw new Error("Required environment variables are not set");
  }
}

export async function testApiConnections() {
  const results = {
    openai: false,
    anthropic: false,
    errors: [] as string[]
  };

  // Test OpenAI connection if key exists
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        results.openai = true;
        console.log("✅ OpenAI API connection successful");
      } else {
        results.errors.push(`OpenAI API: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      results.errors.push(`OpenAI API connection error: ${error.message}`);
    }
  }

  // Test Anthropic connection if key exists
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [{ role: "user", content: "test" }],
        }),
      });

      if (response.ok || response.status === 400) {
        results.anthropic = true;
        console.log("✅ Anthropic API connection successful");
      } else {
        results.errors.push(`Anthropic API: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      results.errors.push(`Anthropic API connection error: ${error.message}`);
    }
  }

  return results;
}

// Add a diagnostics endpoint for development environments
export const diagnosticsRoute = (registerApiRoute: any) => registerApiRoute("/diagnostics/env", {
  method: "GET",
  handler: async (c: any) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "Diagnostics endpoint is disabled in production" }, 403);
    }

    try {
      const env = validateEnvironment();
      const apiTests = await testApiConnections();
      
      return c.json({
        status: "success",
        environment: {
          NODE_ENV: env.NODE_ENV,
          hasOpenAIKey: !!env.OPENAI_API_KEY,
          hasAnthropicKey: !!env.ANTHROPIC_API_KEY,
        },
        apiConnections: apiTests,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return c.json({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      }, 500);
    }
  },
});