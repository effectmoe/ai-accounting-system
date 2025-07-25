#!/usr/bin/env node
import { EventEmitter } from 'events';
declare class MCPCoordinator extends EventEmitter {
    private server;
    private servers;
    private serverConfigs;
    private healthCheckInterval;
    constructor();
    private initializeServerConfigs;
    private setupToolHandlers;
    private handleListServers;
    private handleServerStatus;
    private handleStartServer;
    private handleStopServer;
    private handleRestartServer;
    private handleHealthCheck;
    private handleRouteRequest;
    private handleGetCapabilities;
    private handleSystemOverview;
    private handleConfigureServer;
    private startServer;
    private stopServer;
    private restartServer;
    private checkServerHealth;
    private checkAllServersHealth;
    private startHealthCheckMonitoring;
    private getCapabilityCategory;
    private getCapabilitiesByCategory;
    run(): Promise<void>;
    shutdown(): Promise<void>;
}
export { MCPCoordinator };
