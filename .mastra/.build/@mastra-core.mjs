import { T as Telemetry, s as setupAITracing, g as getAllAITracing, a as shutdownAITracingRegistry, _ as __decorateElement, b as __runInitializers, c as __decoratorStart, I as InstrumentClass, A as Agent, W as Workflow } from './agent.mjs';
export { d as createWorkflow } from './agent.mjs';
import { r as registerHook } from './hooks.mjs';
import { M as MastraError } from './chunk-4O4YNORN.mjs';
import { C as ConsoleLogger, L as LogLevel } from './utils.mjs';
export { g as generateEmptyFromSchema } from './utils.mjs';

// src/storage/storageWithInit.ts
var isAugmentedSymbol = Symbol("isAugmented");
function augmentWithInit(storage) {
  let hasInitialized = null;
  const ensureInit = async () => {
    if (!hasInitialized) {
      hasInitialized = storage.init();
    }
    await hasInitialized;
  };
  if (storage[isAugmentedSymbol]) {
    return storage;
  }
  const proxy = new Proxy(storage, {
    get(target, prop) {
      if (prop === isAugmentedSymbol) {
        return true;
      }
      const value = target[prop];
      if (typeof value === "function" && prop !== "init") {
        return async (...args) => {
          await ensureInit();
          return Reflect.apply(value, target, args);
        };
      }
      return Reflect.get(target, prop);
    }
  });
  return proxy;
}

// src/logger/noop-logger.ts
var noopLogger = {
  debug: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  cleanup: async () => {
  },
  getTransports: () => /* @__PURE__ */ new Map(),
  trackException: () => {
  },
  getLogs: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false }),
  getLogsByRunId: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false })
};

// src/mastra/hooks.ts
function createOnScorerHook(mastra) {
  return async hookData => {
    if (!mastra.getStorage()) {
      return;
    }
    const storage = mastra.getStorage();
    const entityId = hookData.entity.id;
    const entityType = hookData.entityType;
    const scorer = hookData.scorer;
    let scorerToUse;
    try {
      if (entityType === "AGENT") {
        const agent = mastra.getAgentById(entityId);
        const scorers = await agent.getScorers();
        scorerToUse = scorers[scorer.id];
      } else if (entityType === "WORKFLOW") {
        const workflow = mastra.getWorkflowById(entityId);
        const scorers = await workflow.getScorers();
        scorerToUse = scorers[scorer.id];
      } else {
        return;
      }
      if (!scorerToUse) {
        throw new MastraError({
          id: "MASTRA_SCORER_NOT_FOUND",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: `Scorer with ID ${hookData.scorer.id} not found`
        });
      }
      let input = hookData.input;
      let output = hookData.output;
      if (entityType !== "AGENT") {
        output = {
          object: hookData.output
        };
      }
      const {
        structuredOutput,
        ...rest
      } = hookData;
      const runResult = await scorerToUse.scorer.run({
        ...rest,
        input,
        output
      });
      const payload = {
        ...rest,
        ...runResult,
        entityId,
        scorerId: hookData.scorer.id,
        metadata: {
          structuredOutput: !!structuredOutput
        }
      };
      await storage?.saveScore(payload);
    } catch (error) {
      const mastraError = new MastraError({
        id: "MASTRA_SCORER_FAILED_TO_RUN_HOOK",
        domain: "SCORER" /* SCORER */,
        category: "USER" /* USER */,
        details: {
          scorerId: scorer.id,
          entityId,
          entityType
        }
      }, error);
      mastra.getLogger()?.trackException(mastraError);
      mastra.getLogger()?.error(mastraError.toString());
    }
  };
}

// src/mastra/index.ts
var _Mastra_decorators, _init;
_Mastra_decorators = [InstrumentClass({
  prefix: "mastra",
  excludeMethods: ["getLogger", "getTelemetry"]
})];
var Mastra = class {
  #vectors;
  #agents;
  #logger;
  #legacy_workflows;
  #workflows;
  #tts;
  #deployer;
  #serverMiddleware = [];
  #telemetry;
  #storage;
  #memory;
  #networks;
  #vnext_networks;
  #server;
  #mcpServers;
  #bundler;
  #idGenerator;
  /**
   * @deprecated use getTelemetry() instead
   */
  get telemetry() {
    return this.#telemetry;
  }
  /**
   * @deprecated use getStorage() instead
   */
  get storage() {
    return this.#storage;
  }
  /**
   * @deprecated use getMemory() instead
   */
  get memory() {
    return this.#memory;
  }
  getIdGenerator() {
    return this.#idGenerator;
  }
  /**
   * Generate a unique identifier using the configured generator or default to crypto.randomUUID()
   * @returns A unique string ID
   */
  generateId() {
    if (this.#idGenerator) {
      const id = this.#idGenerator();
      if (!id) {
        const error = new MastraError({
          id: "MASTRA_ID_GENERATOR_RETURNED_EMPTY_STRING",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: "ID generator returned an empty string, which is not allowed"
        });
        this.#logger?.trackException(error);
        throw error;
      }
      return id;
    }
    return crypto.randomUUID();
  }
  setIdGenerator(idGenerator) {
    this.#idGenerator = idGenerator;
  }
  constructor(config) {
    if (config?.serverMiddleware) {
      this.#serverMiddleware = config.serverMiddleware.map(m => ({
        handler: m.handler,
        path: m.path || "/api/*"
      }));
    }
    let logger;
    if (config?.logger === false) {
      logger = noopLogger;
    } else {
      if (config?.logger) {
        logger = config.logger;
      } else {
        const levelOnEnv = process.env.NODE_ENV === "production" && process.env.MASTRA_DEV !== "true" ? LogLevel.WARN : LogLevel.INFO;
        logger = new ConsoleLogger({
          name: "Mastra",
          level: levelOnEnv
        });
      }
    }
    this.#logger = logger;
    this.#idGenerator = config?.idGenerator;
    let storage = config?.storage;
    if (storage) {
      storage = augmentWithInit(storage);
    }
    this.#telemetry = Telemetry.init(config?.telemetry);
    if (config?.telemetry?.enabled !== false && typeof globalThis !== "undefined" && globalThis.___MASTRA_TELEMETRY___ !== true) {
      this.#logger?.warn(`Mastra telemetry is enabled, but the required instrumentation file was not loaded. If you are using Mastra outside of the mastra server environment, see: https://mastra.ai/en/docs/observability/tracing#tracing-outside-mastra-server-environment`, `If you are using a custom instrumentation file or want to disable this warning, set the globalThis.___MASTRA_TELEMETRY___ variable to true in your instrumentation file.`);
    }
    if (config?.observability) {
      setupAITracing(config.observability);
    }
    if (this.#telemetry && storage) {
      this.#storage = this.#telemetry.traceClass(storage, {
        excludeMethods: ["__setTelemetry", "__getTelemetry", "batchTraceInsert", "getTraces", "getEvalsByAgentName"]
      });
      this.#storage.__setTelemetry(this.#telemetry);
    } else {
      this.#storage = storage;
    }
    if (config?.vectors) {
      let vectors = {};
      Object.entries(config.vectors).forEach(([key, vector]) => {
        if (this.#telemetry) {
          vectors[key] = this.#telemetry.traceClass(vector, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          vectors[key].__setTelemetry(this.#telemetry);
        } else {
          vectors[key] = vector;
        }
      });
      this.#vectors = vectors;
    }
    if (config?.networks) {
      this.#networks = config.networks;
    }
    if (config?.vnext_networks) {
      this.#vnext_networks = config.vnext_networks;
    }
    if (config?.mcpServers) {
      this.#mcpServers = config.mcpServers;
      Object.entries(this.#mcpServers).forEach(([key, server]) => {
        server.setId(key);
        if (this.#telemetry) {
          server.__setTelemetry(this.#telemetry);
        }
        server.__registerMastra(this);
        server.__setLogger(this.getLogger());
      });
    }
    if (config && `memory` in config) {
      const error = new MastraError({
        id: "MASTRA_CONSTRUCTOR_INVALID_MEMORY_CONFIG",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `
  Memory should be added to Agents, not to Mastra.

Instead of:
  new Mastra({ memory: new Memory() })

do:
  new Agent({ memory: new Memory() })
`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (config?.tts) {
      this.#tts = config.tts;
      Object.entries(this.#tts).forEach(([key, ttsCl]) => {
        if (this.#tts?.[key]) {
          if (this.#telemetry) {
            this.#tts[key] = this.#telemetry.traceClass(ttsCl, {
              excludeMethods: ["__setTelemetry", "__getTelemetry"]
            });
            this.#tts[key].__setTelemetry(this.#telemetry);
          }
        }
      });
    }
    const agents = {};
    if (config?.agents) {
      Object.entries(config.agents).forEach(([key, agent]) => {
        if (agents[key]) {
          const error = new MastraError({
            id: "MASTRA_AGENT_REGISTRATION_DUPLICATE_ID",
            domain: "MASTRA" /* MASTRA */,
            category: "USER" /* USER */,
            text: `Agent with name ID:${key} already exists`,
            details: {
              agentId: key
            }
          });
          this.#logger?.trackException(error);
          throw error;
        }
        agent.__registerMastra(this);
        agent.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        agents[key] = agent;
      });
    }
    this.#agents = agents;
    this.#networks = {};
    this.#vnext_networks = {};
    if (config?.networks) {
      Object.entries(config.networks).forEach(([key, network]) => {
        network.__registerMastra(this);
        this.#networks[key] = network;
      });
    }
    if (config?.vnext_networks) {
      Object.entries(config.vnext_networks).forEach(([key, network]) => {
        network.__registerMastra(this);
        this.#vnext_networks[key] = network;
      });
    }
    this.#legacy_workflows = {};
    if (config?.legacy_workflows) {
      Object.entries(config.legacy_workflows).forEach(([key, workflow]) => {
        workflow.__registerMastra(this);
        workflow.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        this.#legacy_workflows[key] = workflow;
        const workflowSteps = Object.values(workflow.steps).filter(step => !!step.workflowId && !!step.workflow);
        if (workflowSteps.length > 0) {
          workflowSteps.forEach(step => {
            this.#legacy_workflows[step.workflowId] = step.workflow;
          });
        }
      });
    }
    this.#workflows = {};
    if (config?.workflows) {
      Object.entries(config.workflows).forEach(([key, workflow]) => {
        workflow.__registerMastra(this);
        workflow.__registerPrimitives({
          logger: this.getLogger(),
          telemetry: this.#telemetry,
          storage: this.storage,
          memory: this.memory,
          agents,
          tts: this.#tts,
          vectors: this.#vectors
        });
        this.#workflows[key] = workflow;
      });
    }
    if (config?.server) {
      this.#server = config.server;
    }
    registerHook("onScorerRun" /* ON_SCORER_RUN */, createOnScorerHook(this));
    this.setLogger({
      logger
    });
  }
  getAgent(name) {
    const agent = this.#agents?.[name];
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with name ${String(name)} not found`,
        details: {
          status: 404,
          agentName: String(name),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return this.#agents[name];
  }
  getAgentById(id) {
    let agent = Object.values(this.#agents).find(a => a.id === id);
    if (!agent) {
      try {
        agent = this.getAgent(id);
      } catch {}
    }
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_AGENT_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with id ${String(id)} not found`,
        details: {
          status: 404,
          agentId: String(id),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return agent;
  }
  getAgents() {
    return this.#agents;
  }
  getVector(name) {
    const vector = this.#vectors?.[name];
    if (!vector) {
      const error = new MastraError({
        id: "MASTRA_GET_VECTOR_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Vector with name ${String(name)} not found`,
        details: {
          status: 404,
          vectorName: String(name),
          vectors: Object.keys(this.#vectors ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return vector;
  }
  getVectors() {
    return this.#vectors;
  }
  getDeployer() {
    return this.#deployer;
  }
  legacy_getWorkflow(id, {
    serialized
  } = {}) {
    const workflow = this.#legacy_workflows?.[id];
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_LEGACY_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with ID ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#legacy_workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (serialized) {
      return {
        name: workflow.name
      };
    }
    return workflow;
  }
  getWorkflow(id, {
    serialized
  } = {}) {
    const workflow = this.#workflows?.[id];
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with ID ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (serialized) {
      return {
        name: workflow.name
      };
    }
    return workflow;
  }
  getWorkflowById(id) {
    let workflow = Object.values(this.#workflows).find(a => a.id === id);
    if (!workflow) {
      try {
        workflow = this.getWorkflow(id);
      } catch {}
    }
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with id ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return workflow;
  }
  legacy_getWorkflows(props = {}) {
    if (props.serialized) {
      return Object.entries(this.#legacy_workflows).reduce((acc, [k, v]) => {
        return {
          ...acc,
          [k]: {
            name: v.name
          }
        };
      }, {});
    }
    return this.#legacy_workflows;
  }
  getWorkflows(props = {}) {
    if (props.serialized) {
      return Object.entries(this.#workflows).reduce((acc, [k, v]) => {
        return {
          ...acc,
          [k]: {
            name: v.name
          }
        };
      }, {});
    }
    return this.#workflows;
  }
  setStorage(storage) {
    this.#storage = augmentWithInit(storage);
  }
  setLogger({
    logger
  }) {
    this.#logger = logger;
    if (this.#agents) {
      Object.keys(this.#agents).forEach(key => {
        this.#agents?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#memory) {
      this.#memory.__setLogger(this.#logger);
    }
    if (this.#deployer) {
      this.#deployer.__setLogger(this.#logger);
    }
    if (this.#tts) {
      Object.keys(this.#tts).forEach(key => {
        this.#tts?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#storage) {
      this.#storage.__setLogger(this.#logger);
    }
    if (this.#vectors) {
      Object.keys(this.#vectors).forEach(key => {
        this.#vectors?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#mcpServers) {
      Object.keys(this.#mcpServers).forEach(key => {
        this.#mcpServers?.[key]?.__setLogger(this.#logger);
      });
    }
    const allTracingInstances = getAllAITracing();
    allTracingInstances.forEach(instance => {
      instance.__setLogger(this.#logger);
    });
  }
  setTelemetry(telemetry) {
    this.#telemetry = Telemetry.init(telemetry);
    if (this.#agents) {
      Object.keys(this.#agents).forEach(key => {
        if (this.#telemetry) {
          this.#agents?.[key]?.__setTelemetry(this.#telemetry);
        }
      });
    }
    if (this.#memory) {
      this.#memory = this.#telemetry.traceClass(this.#memory, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#memory.__setTelemetry(this.#telemetry);
    }
    if (this.#deployer) {
      this.#deployer = this.#telemetry.traceClass(this.#deployer, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#deployer.__setTelemetry(this.#telemetry);
    }
    if (this.#tts) {
      let tts = {};
      Object.entries(this.#tts).forEach(([key, ttsCl]) => {
        if (this.#telemetry) {
          tts[key] = this.#telemetry.traceClass(ttsCl, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          tts[key].__setTelemetry(this.#telemetry);
        }
      });
      this.#tts = tts;
    }
    if (this.#storage) {
      this.#storage = this.#telemetry.traceClass(this.#storage, {
        excludeMethods: ["__setTelemetry", "__getTelemetry"]
      });
      this.#storage.__setTelemetry(this.#telemetry);
    }
    if (this.#vectors) {
      let vectors = {};
      Object.entries(this.#vectors).forEach(([key, vector]) => {
        if (this.#telemetry) {
          vectors[key] = this.#telemetry.traceClass(vector, {
            excludeMethods: ["__setTelemetry", "__getTelemetry"]
          });
          vectors[key].__setTelemetry(this.#telemetry);
        }
      });
      this.#vectors = vectors;
    }
  }
  getTTS() {
    return this.#tts;
  }
  getLogger() {
    return this.#logger;
  }
  getTelemetry() {
    return this.#telemetry;
  }
  getMemory() {
    return this.#memory;
  }
  getStorage() {
    return this.#storage;
  }
  getServerMiddleware() {
    return this.#serverMiddleware;
  }
  setServerMiddleware(serverMiddleware) {
    if (typeof serverMiddleware === "function") {
      this.#serverMiddleware = [{
        handler: serverMiddleware,
        path: "/api/*"
      }];
      return;
    }
    if (!Array.isArray(serverMiddleware)) {
      const error = new MastraError({
        id: "MASTRA_SET_SERVER_MIDDLEWARE_INVALID_TYPE",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Invalid middleware: expected a function or array, received ${typeof serverMiddleware}`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    this.#serverMiddleware = serverMiddleware.map(m => {
      if (typeof m === "function") {
        return {
          handler: m,
          path: "/api/*"
        };
      }
      return {
        handler: m.handler,
        path: m.path || "/api/*"
      };
    });
  }
  getNetworks() {
    return Object.values(this.#networks || {});
  }
  vnext_getNetworks() {
    return Object.values(this.#vnext_networks || {});
  }
  getServer() {
    return this.#server;
  }
  getBundlerConfig() {
    return this.#bundler;
  }
  /**
   * Get a specific network by ID
   * @param networkId - The ID of the network to retrieve
   * @returns The network with the specified ID, or undefined if not found
   */
  getNetwork(networkId) {
    const networks = this.getNetworks();
    return networks.find(network => {
      const routingAgent = network.getRoutingAgent();
      return network.formatAgentId(routingAgent.name) === networkId;
    });
  }
  vnext_getNetwork(networkId) {
    const networks = this.vnext_getNetworks();
    return networks.find(network => network.id === networkId);
  }
  async getLogsByRunId({
    runId,
    transportId,
    fromDate,
    toDate,
    logLevel,
    filters,
    page,
    perPage
  }) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_BY_RUN_ID_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger?.getLogsByRunId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_BY_RUN_ID_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not configured or does not support getLogsByRunId operation",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return await this.#logger.getLogsByRunId({
      runId,
      transportId,
      fromDate,
      toDate,
      logLevel,
      filters,
      page,
      perPage
    });
  }
  async getLogs(transportId, params) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not set",
        details: {
          transportId
        }
      });
      throw error;
    }
    return await this.#logger.getLogs(transportId, params);
  }
  /**
   * Get all registered MCP server instances.
   * @returns A record of MCP server ID to MCPServerBase instance, or undefined if none are registered.
   */
  getMCPServers() {
    return this.#mcpServers;
  }
  /**
   * Get a specific MCP server instance.
   * If a version is provided, it attempts to find the server with that exact logical ID and version.
   * If no version is provided, it returns the server with the specified logical ID that has the most recent releaseDate.
   * The logical ID should match the `id` property of the MCPServer instance (typically set via MCPServerConfig.id).
   * @param serverId - The logical ID of the MCP server to retrieve.
   * @param version - Optional specific version of the MCP server to retrieve.
   * @returns The MCP server instance, or undefined if not found or if the specific version is not found.
   */
  getMCPServer(serverId, version) {
    if (!this.#mcpServers) {
      return void 0;
    }
    const allRegisteredServers = Object.values(this.#mcpServers || {});
    const matchingLogicalIdServers = allRegisteredServers.filter(server => server.id === serverId);
    if (matchingLogicalIdServers.length === 0) {
      this.#logger?.debug(`No MCP servers found with logical ID: ${serverId}`);
      return void 0;
    }
    if (version) {
      const specificVersionServer = matchingLogicalIdServers.find(server => server.version === version);
      if (!specificVersionServer) {
        this.#logger?.debug(`MCP server with logical ID '${serverId}' found, but not version '${version}'.`);
      }
      return specificVersionServer;
    } else {
      if (matchingLogicalIdServers.length === 1) {
        return matchingLogicalIdServers[0];
      }
      matchingLogicalIdServers.sort((a, b) => {
        const dateAVal = a.releaseDate && typeof a.releaseDate === "string" ? new Date(a.releaseDate).getTime() : NaN;
        const dateBVal = b.releaseDate && typeof b.releaseDate === "string" ? new Date(b.releaseDate).getTime() : NaN;
        if (isNaN(dateAVal) && isNaN(dateBVal)) return 0;
        if (isNaN(dateAVal)) return 1;
        if (isNaN(dateBVal)) return -1;
        return dateBVal - dateAVal;
      });
      if (matchingLogicalIdServers.length > 0) {
        const latestServer = matchingLogicalIdServers[0];
        if (latestServer && latestServer.releaseDate && typeof latestServer.releaseDate === "string" && !isNaN(new Date(latestServer.releaseDate).getTime())) {
          return latestServer;
        }
      }
      this.#logger?.warn(`Could not determine the latest server for logical ID '${serverId}' due to invalid or missing release dates, or no servers left after filtering.`);
      return void 0;
    }
  }
  /**
   * Shutdown Mastra and clean up all resources
   */
  async shutdown() {
    await shutdownAITracingRegistry();
    this.#logger?.info("Mastra shutdown completed");
  }
};
Mastra = /*@__PURE__*/(_ => {
  _init = __decoratorStart(null);
  Mastra = __decorateElement(_init, 0, "Mastra", _Mastra_decorators, Mastra);
  __runInitializers(_init, 1, Mastra);
  return Mastra;
})();

// src/agent/index.warning.ts
var Agent2 = class extends Agent {
  constructor(config) {
    super(config);
    this.logger.warn('Please import "Agent from "@mastra/core/agent" instead of "@mastra/core"');
  }
};

// src/workflows/workflow.warning.ts
var Workflow2 = class extends Workflow {
  constructor(args) {
    super(args);
    this.logger.warn('Please import "Workflow" from "@mastra/core/workflows" instead of "@mastra/core"');
  }
};

export { Agent2 as Agent, Mastra, Telemetry, Workflow2 as Workflow };
