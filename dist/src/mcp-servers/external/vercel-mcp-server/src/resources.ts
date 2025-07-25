import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BASE_URL, DEFAULT_ACCESS_TOKEN, handleResponse } from "./index.js";

export function registerResources(server: McpServer) {
  // Project resource
  server.resource(
    "project",
    new ResourceTemplate("projects://{projectId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v9/projects/${variables.projectId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Team resource
  server.resource(
    "team",
    new ResourceTemplate("teams://{teamId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v2/teams/${variables.teamId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Deployment resource
  server.resource(
    "deployment",
    new ResourceTemplate("deployments://{deploymentId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v13/deployments/${variables.deploymentId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Environment Variables resource
  server.resource(
    "env-vars",
    new ResourceTemplate("env://{projectId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v9/projects/${variables.projectId}/env`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Domains resource
  server.resource(
    "domains",
    new ResourceTemplate("domains://{domain}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v5/domains/${variables.domain}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Webhook resource
  server.resource(
    "webhook",
    new ResourceTemplate("webhooks://{webhookId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/webhooks/${variables.webhookId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // User resource
  server.resource(
    "user",
    new ResourceTemplate("users://{userId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v2/user`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Integration resource
  server.resource(
    "integration",
    new ResourceTemplate("integrations://{integrationId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/integrations/${variables.integrationId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Project Member resource
  server.resource(
    "project-member",
    new ResourceTemplate("project-members://{projectId}/{userId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v9/projects/${variables.projectId}/members/${variables.userId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Access Group resource
  server.resource(
    "access-group",
    new ResourceTemplate("access-groups://{groupId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/access-groups/${variables.groupId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Log Drain resource
  server.resource(
    "log-drain",
    new ResourceTemplate("log-drains://{drainId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/log-drains/${variables.drainId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Secret resource
  server.resource(
    "secret",
    new ResourceTemplate("secrets://{projectId}/{name}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v9/projects/${variables.projectId}/env/${variables.name}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Alias resource
  server.resource(
    "alias",
    new ResourceTemplate("aliases://{aliasId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v2/aliases/${variables.aliasId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Artifact resource
  server.resource(
    "artifact",
    new ResourceTemplate("artifacts://{projectId}/{artifactId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v8/artifacts/${variables.projectId}/${variables.artifactId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Certificate resource
  server.resource(
    "certificate",
    new ResourceTemplate("certs://{certId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v5/now/certs/${variables.certId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // DNS resource
  server.resource(
    "dns",
    new ResourceTemplate("dns://{domain}/{recordId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v2/domains/${variables.domain}/records/${variables.recordId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Marketplace resource
  server.resource(
    "marketplace",
    new ResourceTemplate("marketplace://{integration}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/marketplace/integrations/${variables.integration}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Edge Config resource
  server.resource(
    "edge-config",
    new ResourceTemplate("edge-config://{configId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/edge-config/${variables.configId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Speed Insights resource
  server.resource(
    "speed-insights",
    new ResourceTemplate("speed-insights://{projectId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/speed-insights/${variables.projectId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Security resource
  server.resource(
    "security",
    new ResourceTemplate("security://{projectId}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v1/security/projects/${variables.projectId}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Auth resource
  server.resource(
    "auth",
    new ResourceTemplate("auth://{token}", { list: undefined }),
    async (uri, variables) => {
      const response = await fetch(`${BASE_URL}/v2/user/tokens/${variables.token}`, {
        headers: { Authorization: `Bearer ${DEFAULT_ACCESS_TOKEN}` }
      });
      const data = await handleResponse(response);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    }
  );

  // Static configuration resource
  server.resource(
    "config",
    "config://vercel",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          apiVersion: "v9",
          baseUrl: BASE_URL,
          defaultTeam: null,
          features: {
            deployments: true,
            teams: true,
            domains: true,
            envVars: true,
            analytics: true,
            webhooks: true,
            users: true,
            integrations: true,
            projectMembers: true,
            accessGroups: true,
            logDrains: true,
            secrets: true,
            aliases: true,
            artifacts: true,
            certificates: true,
            dns: true,
            marketplace: true,
            edgeConfig: true,
            speedInsights: true,
            security: true,
            auth: true
          }
        }, null, 2)
      }]
    })
  );
} 