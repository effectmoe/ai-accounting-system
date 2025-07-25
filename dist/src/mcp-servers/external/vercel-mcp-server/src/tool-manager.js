"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolManager = void 0;
const logger_1 = require("@/lib/logger");
class ToolManager {
    server;
    activeGroups = new Map();
    MAX_ACTIVE_GROUPS = 2;
    toolToGroupMap = {
        'edge_config': 'infrastructure',
        'secret': 'infrastructure',
        'env': 'infrastructure',
        'webhook': 'infrastructure',
        'logdrain': 'infrastructure',
        'speed_insights': 'infrastructure',
        'firewall': 'infrastructure',
        'user': 'access',
        'team': 'access',
        'auth': 'access',
        'access_group': 'access',
        'security': 'access',
        'project': 'projects',
        'list_projects': 'projects',
        'projects': 'projects',
        'deployment': 'projects',
        'member': 'projects',
        'transfer': 'projects',
        'show_projects': 'projects',
        'get_projects': 'projects',
        'view_projects': 'projects',
        'display_projects': 'projects',
        'fetch_projects': 'projects',
        'retrieve_projects': 'projects',
        'domain': 'domains',
        'dns': 'domains',
        'cert': 'domains',
        'alias': 'domains',
        'integration': 'integrations',
        'marketplace': 'integrations',
        'artifact': 'integrations'
    };
    constructor(server) {
        this.server = server;
    }
    async loadGroup(groupName) {
        if (this.activeGroups.has(groupName)) {
            this.activeGroups.get(groupName).lastUsed = Date.now();
            return;
        }
        if (this.activeGroups.size >= this.MAX_ACTIVE_GROUPS) {
            const oldestGroup = this.getLeastRecentlyUsedGroup();
            await this.unloadGroup(oldestGroup);
        }
        try {
            const group = await Promise.resolve(`${`./tool-groups/${groupName}/index.js`}`).then(s => __importStar(require(s)));
            const tools = await group.register(this.server);
            this.activeGroups.set(groupName, {
                lastUsed: Date.now(),
                tools
            });
            logger_1.logger.debug(`Loaded tool group: ${groupName}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to load tool group ${groupName}:`, error);
        }
    }
    async unloadGroup(groupName) {
        const group = this.activeGroups.get(groupName);
        if (!group)
            return;
        try {
            this.activeGroups.delete(groupName);
            logger_1.logger.debug(`Unloaded tool group: ${groupName}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to unload tool group ${groupName}:`, error);
        }
    }
    getLeastRecentlyUsedGroup() {
        let oldestTime = Infinity;
        let oldestGroup = '';
        for (const [group, usage] of this.activeGroups.entries()) {
            if (usage.lastUsed < oldestTime) {
                oldestTime = usage.lastUsed;
                oldestGroup = group;
            }
        }
        return oldestGroup;
    }
    getActiveGroups() {
        return Array.from(this.activeGroups.keys());
    }
    findGroupForTool(toolName) {
        for (const [tool, group] of Object.entries(this.toolToGroupMap)) {
            if (toolName.includes(tool)) {
                return group;
            }
        }
        return '';
    }
    async suggestAndLoadGroups(query) {
        const normalizedQuery = query.toLowerCase();
        let groupToLoad = '';
        const words = normalizedQuery.split(/[\s_-]+/);
        for (const word of words) {
            groupToLoad = this.findGroupForTool(word);
            if (groupToLoad)
                break;
        }
        if (!groupToLoad) {
            if (normalizedQuery.includes('edge') ||
                normalizedQuery.includes('secret') ||
                normalizedQuery.includes('env') ||
                normalizedQuery.includes('environment') ||
                normalizedQuery.includes('webhook') ||
                normalizedQuery.includes('log') ||
                normalizedQuery.includes('speed') ||
                normalizedQuery.includes('vitals')) {
                groupToLoad = 'infrastructure';
            }
            else if (normalizedQuery.includes('user') ||
                normalizedQuery.includes('team') ||
                normalizedQuery.includes('auth') ||
                normalizedQuery.includes('access') ||
                normalizedQuery.includes('firewall') ||
                normalizedQuery.includes('security')) {
                groupToLoad = 'access';
            }
            else if (normalizedQuery.includes('project') ||
                normalizedQuery.includes('projects') ||
                normalizedQuery.includes('list project') ||
                normalizedQuery.includes('list projects') ||
                normalizedQuery.includes('show project') ||
                normalizedQuery.includes('show projects') ||
                normalizedQuery.includes('get project') ||
                normalizedQuery.includes('get projects') ||
                normalizedQuery.includes('view project') ||
                normalizedQuery.includes('view projects') ||
                normalizedQuery.includes('display project') ||
                normalizedQuery.includes('display projects') ||
                normalizedQuery.includes('fetch project') ||
                normalizedQuery.includes('fetch projects') ||
                normalizedQuery.includes('retrieve project') ||
                normalizedQuery.includes('retrieve projects') ||
                normalizedQuery.includes('deploy') ||
                normalizedQuery.includes('member') ||
                normalizedQuery.includes('transfer') ||
                normalizedQuery.includes('file')) {
                groupToLoad = 'projects';
            }
            else if (normalizedQuery.includes('domain') ||
                normalizedQuery.includes('dns') ||
                normalizedQuery.includes('cert') ||
                normalizedQuery.includes('ssl') ||
                normalizedQuery.includes('tls') ||
                normalizedQuery.includes('alias')) {
                groupToLoad = 'domains';
            }
            else if (normalizedQuery.includes('integration') ||
                normalizedQuery.includes('marketplace') ||
                normalizedQuery.includes('artifact') ||
                normalizedQuery.includes('int_')) {
                groupToLoad = 'integrations';
            }
        }
        if (groupToLoad) {
            await this.loadGroup(groupToLoad);
        }
    }
    async getGroupTools(groupName) {
        try {
            const group = await Promise.resolve(`${`./tool-groups/${groupName}/index.js`}`).then(s => __importStar(require(s)));
            return group.register(this.server);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get tools for group ${groupName}:`, error);
            return [];
        }
    }
}
exports.ToolManager = ToolManager;
//# sourceMappingURL=tool-manager.js.map