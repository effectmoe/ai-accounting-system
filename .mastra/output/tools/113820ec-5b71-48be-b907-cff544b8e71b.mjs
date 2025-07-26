import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const designArchitectureTool = {
  name: "design_architecture",
  description: "\u30B7\u30B9\u30C6\u30E0\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u3092\u8A2D\u8A08\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      project_name: { type: "string", description: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u540D" },
      architecture_type: {
        type: "string",
        enum: ["monolithic", "microservices", "serverless", "event-driven", "hybrid"],
        description: "\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u30BF\u30A4\u30D7"
      },
      requirements: {
        type: "object",
        properties: {
          scalability: { type: "string", description: "\u30B9\u30B1\u30FC\u30E9\u30D3\u30EA\u30C6\u30A3\u8981\u4EF6" },
          performance: { type: "string", description: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u8981\u4EF6" },
          availability: { type: "string", description: "\u53EF\u7528\u6027\u8981\u4EF6" },
          security: { type: "string", description: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8981\u4EF6" }
        }
      },
      tech_stack: { type: "array", items: { type: "string" }, description: "\u4F7F\u7528\u6280\u8853" }
    },
    required: ["project_name", "architecture_type", "requirements"]
  },
  handler: async (params) => {
    logger.info("Designing architecture:", params);
    const db = await getDatabase();
    const collection = db.collection("architectures");
    const architecture = {
      project_name: params.project_name,
      architecture_type: params.architecture_type,
      requirements: params.requirements,
      tech_stack: params.tech_stack || [],
      design_patterns: [],
      components: [],
      created_at: /* @__PURE__ */ new Date(),
      updated_at: /* @__PURE__ */ new Date()
    };
    switch (params.architecture_type) {
      case "microservices":
        architecture.design_patterns = ["API Gateway", "Service Discovery", "Circuit Breaker", "Event Sourcing"];
        architecture.components = [
          { name: "API Gateway", type: "infrastructure", tech: "Kong/Nginx" },
          { name: "Service Registry", type: "infrastructure", tech: "Consul/Eureka" },
          { name: "Message Queue", type: "infrastructure", tech: "RabbitMQ/Kafka" },
          { name: "User Service", type: "service", tech: "Node.js/TypeScript" },
          { name: "Order Service", type: "service", tech: "Node.js/TypeScript" }
        ];
        break;
      case "serverless":
        architecture.design_patterns = ["Function as a Service", "Backend for Frontend", "Event-driven"];
        architecture.components = [
          { name: "API Gateway", type: "infrastructure", tech: "AWS API Gateway" },
          { name: "Lambda Functions", type: "compute", tech: "AWS Lambda" },
          { name: "DynamoDB", type: "database", tech: "AWS DynamoDB" },
          { name: "S3 Storage", type: "storage", tech: "AWS S3" }
        ];
        break;
      default:
        architecture.design_patterns = ["MVC", "Repository Pattern", "Dependency Injection"];
        architecture.components = [
          { name: "Web Server", type: "infrastructure", tech: "Nginx" },
          { name: "Application Server", type: "compute", tech: "Node.js" },
          { name: "Database", type: "database", tech: "PostgreSQL/MongoDB" }
        ];
    }
    const result = await collection.insertOne(architecture);
    return {
      success: true,
      architecture_id: result.insertedId.toString(),
      architecture,
      recommendations: [
        "CI/CD\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u306E\u69CB\u7BC9\u3092\u63A8\u5968\u3057\u307E\u3059",
        "\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0\u3068\u30ED\u30AE\u30F3\u30B0\u306E\u5B9F\u88C5\u304C\u5FC5\u8981\u3067\u3059",
        "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u30B9\u30AD\u30E3\u30F3\u306E\u81EA\u52D5\u5316\u3092\u691C\u8A0E\u3057\u3066\u304F\u3060\u3055\u3044"
      ]
    };
  }
};
const designDatabaseSchemaTool = {
  name: "design_database_schema",
  description: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u30B9\u30AD\u30FC\u30DE\u3092\u8A2D\u8A08\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      database_type: {
        type: "string",
        enum: ["mongodb", "postgresql", "mysql", "dynamodb", "redis"],
        description: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u30BF\u30A4\u30D7"
      },
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "\u30A8\u30F3\u30C6\u30A3\u30C6\u30A3\u540D" },
            fields: { type: "array", items: { type: "object" }, description: "\u30D5\u30A3\u30FC\u30EB\u30C9\u5B9A\u7FA9" },
            relations: { type: "array", items: { type: "object" }, description: "\u30EA\u30EC\u30FC\u30B7\u30E7\u30F3" },
            indexes: { type: "array", items: { type: "object" }, description: "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9" }
          }
        },
        description: "\u30A8\u30F3\u30C6\u30A3\u30C6\u30A3\u5B9A\u7FA9"
      },
      use_cases: { type: "array", items: { type: "string" }, description: "\u30E6\u30FC\u30B9\u30B1\u30FC\u30B9" }
    },
    required: ["database_type", "entities"]
  },
  handler: async (params) => {
    logger.info("Designing database schema:", params);
    const db = await getDatabase();
    const collection = db.collection("database_schemas");
    const schema = {
      database_type: params.database_type,
      entities: params.entities,
      use_cases: params.use_cases || [],
      created_at: /* @__PURE__ */ new Date(),
      optimizations: [],
      migrations: []
    };
    if (params.database_type === "mongodb") {
      schema.optimizations = [
        "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u57CB\u3081\u8FBC\u307F\u3068\u53C2\u7167\u306E\u9069\u5207\u306A\u4F7F\u3044\u5206\u3051",
        "\u8907\u5408\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u306E\u4F5C\u6210",
        "\u30B7\u30E3\u30FC\u30C7\u30A3\u30F3\u30B0\u30AD\u30FC\u306E\u9078\u5B9A"
      ];
    } else if (["postgresql", "mysql"].includes(params.database_type)) {
      schema.optimizations = [
        "\u6B63\u898F\u5316\u30EC\u30D9\u30EB\u306E\u6700\u9069\u5316\uFF083NF/BCNF\uFF09",
        "\u30D1\u30FC\u30C6\u30A3\u30B7\u30E7\u30CB\u30F3\u30B0\u306E\u691C\u8A0E",
        "\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u6226\u7565\u306E\u7B56\u5B9A"
      ];
    }
    schema.migrations = params.entities.map((entity) => ({
      version: "1.0.0",
      entity: entity.name,
      script: generateMigrationScript(params.database_type, entity)
    }));
    const result = await collection.insertOne(schema);
    return {
      success: true,
      schema_id: result.insertedId.toString(),
      schema,
      ddl_scripts: generateDDLScripts(params.database_type, params.entities)
    };
  }
};
const generateProjectStructureTool = {
  name: "generate_project_structure",
  description: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u69CB\u9020\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      project_type: {
        type: "string",
        enum: ["web-app", "api", "cli", "library", "monorepo"],
        description: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u30BF\u30A4\u30D7"
      },
      language: { type: "string", description: "\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u8A00\u8A9E" },
      framework: { type: "string", description: "\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF" },
      features: {
        type: "array",
        items: { type: "string" },
        description: "\u5FC5\u8981\u306A\u6A5F\u80FD\uFF08testing, ci/cd, docker\u7B49\uFF09"
      }
    },
    required: ["project_type", "language"]
  },
  handler: async (params) => {
    logger.info("Generating project structure:", params);
    let structure = {
      project_type: params.project_type,
      language: params.language,
      framework: params.framework,
      directories: {},
      files: {},
      dependencies: {},
      scripts: {}
    };
    if (params.project_type === "web-app" && params.language === "typescript") {
      structure.directories = {
        "src/": {
          "components/": "React\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8",
          "pages/": "\u30DA\u30FC\u30B8\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8",
          "hooks/": "\u30AB\u30B9\u30BF\u30E0\u30D5\u30C3\u30AF",
          "utils/": "\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3\u95A2\u6570",
          "services/": "API\u30B5\u30FC\u30D3\u30B9",
          "types/": "TypeScript\u578B\u5B9A\u7FA9",
          "styles/": "\u30B9\u30BF\u30A4\u30EB\u30B7\u30FC\u30C8"
        },
        "public/": "\u9759\u7684\u30D5\u30A1\u30A4\u30EB",
        "tests/": "\u30C6\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB",
        "docs/": "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8"
      };
      structure.files = {
        "package.json": "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u8A2D\u5B9A",
        "tsconfig.json": "TypeScript\u8A2D\u5B9A",
        "next.config.js": "Next.js\u8A2D\u5B9A",
        ".eslintrc.json": "ESLint\u8A2D\u5B9A",
        ".prettierrc": "Prettier\u8A2D\u5B9A",
        "README.md": "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u8AAC\u660E"
      };
      structure.dependencies = {
        "react": "^18.2.0",
        "next": "^14.0.0",
        "typescript": "^5.0.0",
        "@types/react": "^18.2.0",
        "@types/node": "^20.0.0"
      };
      structure.scripts = {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "eslint . --ext .ts,.tsx",
        "test": "jest"
      };
    }
    if (params.features?.includes("docker")) {
      structure.files["Dockerfile"] = "Docker\u30B3\u30F3\u30C6\u30CA\u8A2D\u5B9A";
      structure.files["docker-compose.yml"] = "Docker Compose\u8A2D\u5B9A";
    }
    if (params.features?.includes("ci/cd")) {
      structure.directories[".github/workflows/"] = "GitHub Actions\u8A2D\u5B9A";
      structure.files[".github/workflows/ci.yml"] = "CI/CD\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3";
    }
    return {
      success: true,
      structure,
      setup_commands: [
        `mkdir -p ${params.project_type}`,
        `cd ${params.project_type}`,
        "npm init -y",
        `npm install ${Object.entries(structure.dependencies).map(([pkg, ver]) => `${pkg}@${ver}`).join(" ")}`
      ],
      best_practices: [
        "\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u306F\u5358\u4E00\u8CAC\u4EFB\u306E\u539F\u5247\u306B\u5F93\u3063\u3066\u8A2D\u8A08",
        "\u30C6\u30B9\u30C8\u30AB\u30D0\u30EC\u30C3\u30B880%\u4EE5\u4E0A\u3092\u76EE\u6A19",
        "\u30B3\u30FC\u30C9\u30EC\u30D3\u30E5\u30FC\u3068CI/CD\u306E\u5C0E\u5165",
        "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u7D99\u7D9A\u7684\u306A\u66F4\u65B0"
      ]
    };
  }
};
function generateMigrationScript(dbType, entity) {
  if (dbType === "mongodb") {
    return `db.createCollection('${entity.name}')`;
  } else if (dbType === "postgresql") {
    return `CREATE TABLE ${entity.name} (id SERIAL PRIMARY KEY)`;
  }
  return "";
}
function generateDDLScripts(dbType, entities) {
  return entities.map((entity) => generateMigrationScript(dbType, entity));
}
const constructionTools = [
  designArchitectureTool,
  designDatabaseSchemaTool,
  generateProjectStructureTool
];

export { constructionTools, designArchitectureTool, designDatabaseSchemaTool, generateProjectStructureTool };
//# sourceMappingURL=113820ec-5b71-48be-b907-cff544b8e71b.mjs.map
