"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workflow = exports.Step = void 0;
class Step {
    name;
    description;
    agent;
    action;
    input;
    condition;
    parallel;
    onError;
    constructor(config) {
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
exports.Step = Step;
class Workflow {
    name;
    description;
    version;
    input;
    output;
    steps;
    transform;
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.version = config.version;
        this.input = config.input;
        this.output = config.output;
        this.steps = config.steps;
        this.transform = config.transform;
    }
}
exports.Workflow = Workflow;
