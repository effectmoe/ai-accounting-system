// src/tools/validation.ts
function validateToolInput(schema, input, toolId) {
  if (!schema || !("safeParse" in schema)) {
    return { data: input };
  }
  let actualInput = input;
  if (input && typeof input === "object" && "context" in input) {
    actualInput = input.context;
  }
  if (actualInput && typeof actualInput === "object" && "inputData" in actualInput) {
    actualInput = actualInput.inputData;
  }
  const validation = schema.safeParse(actualInput);
  if (!validation.success) {
    const errorMessages = validation.error.errors.map((e) => `- ${e.path?.join(".") || "root"}: ${e.message}`).join("\n");
    const error = {
      error: true,
      message: `Tool validation failed${toolId ? ` for ${toolId}` : ""}. Please fix the following errors and try again:
${errorMessages}

Provided arguments: ${JSON.stringify(actualInput, null, 2)}`,
      validationErrors: validation.error.format()
    };
    return { data: input, error };
  }
  if (input && typeof input === "object" && "context" in input) {
    if (input.context && typeof input.context === "object" && "inputData" in input.context) {
      return { data: { ...input, context: { ...input.context, inputData: validation.data } } };
    }
    return { data: { ...input, context: validation.data } };
  }
  return { data: validation.data };
}

// src/tools/tool.ts
var Tool = class {
  id;
  description;
  inputSchema;
  outputSchema;
  execute;
  mastra;
  constructor(opts) {
    this.id = opts.id;
    this.description = opts.description;
    this.inputSchema = opts.inputSchema;
    this.outputSchema = opts.outputSchema;
    this.mastra = opts.mastra;
    if (opts.execute) {
      const originalExecute = opts.execute;
      this.execute = async (context, options) => {
        const { data, error } = validateToolInput(this.inputSchema, context, this.id);
        if (error) {
          return error;
        }
        return originalExecute(data, options);
      };
    }
  }
};

// src/tools/toolchecks.ts
function isVercelTool(tool) {
  return !!(tool && !(tool instanceof Tool) && "parameters" in tool);
}

export { Tool as T, isVercelTool as i, validateToolInput as v };
