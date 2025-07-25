"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    name;
    description;
    version;
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.version = config.version;
    }
    getName() {
        return this.name;
    }
    getDescription() {
        return this.description;
    }
    getVersion() {
        return this.version;
    }
}
exports.Agent = Agent;
