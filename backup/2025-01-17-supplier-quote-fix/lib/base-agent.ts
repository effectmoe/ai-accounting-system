// Base Agent class for Mastra compatibility
export interface AgentConfig {
  name: string;
  description: string;
  version: string;
}

export abstract class Agent {
  protected name: string;
  protected description: string;
  protected version: string;
  
  constructor(config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
  }
  
  abstract execute(input: any): Promise<any>;
  
  getName(): string {
    return this.name;
  }
  
  getDescription(): string {
    return this.description;
  }
  
  getVersion(): string {
    return this.version;
  }
}