// Base Workflow classes for Mastra compatibility
import { z } from 'zod';

export interface StepConfig {
  name: string;
  description?: string;
  agent?: string;
  action?: (context: any) => Promise<any>;
  input?: (context: any) => any;
  condition?: (context: any) => boolean;
  parallel?: boolean;
  onError?: 'continue' | 'stop';
}

export class Step {
  public name: string;
  public description?: string;
  public agent?: string;
  public action?: (context: any) => Promise<any>;
  public input?: (context: any) => any;
  public condition?: (context: any) => boolean;
  public parallel?: boolean;
  public onError?: 'continue' | 'stop';
  
  constructor(config: StepConfig) {
    this.name = config.name;
    this.description = config.description;
    this.agent = config.agent;
    this.action = config.action;
    this.input = config.input;
    this.condition = config.condition;
    this.parallel = config.parallel;
    this.onError = config.onError;
  }
}

export interface WorkflowConfig {
  name: string;
  description: string;
  version: string;
  input: z.ZodType<any>;
  output: z.ZodType<any>;
  steps: Step[];
  transform?: (context: any) => any;
}

export class Workflow {
  public name: string;
  public description: string;
  public version: string;
  public input: z.ZodType<any>;
  public output: z.ZodType<any>;
  public steps: Step[];
  public transform?: (context: any) => any;
  
  constructor(config: WorkflowConfig) {
    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
    this.input = config.input;
    this.output = config.output;
    this.steps = config.steps;
    this.transform = config.transform;
  }
}