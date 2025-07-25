export interface DeploymentConfig {
    platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure';
    environment: 'development' | 'staging' | 'production';
    buildCommand?: string;
    outputDirectory?: string;
    environmentVariables?: Record<string, string>;
    domains?: string[];
    regions?: string[];
}
export interface DeploymentResult {
    success: boolean;
    deploymentId?: string;
    url?: string;
    buildLogs?: string[];
    error?: string;
    duration?: number;
}
declare const deploymentAgent: {
    name: string;
    description: string;
    version: string;
    actions: {
        deployToVercel: (config: DeploymentConfig) => Promise<DeploymentResult>;
        checkDeploymentStatus: (deploymentId: string) => Promise<{
            status: "pending" | "building" | "ready" | "error";
            url?: string;
            error?: string;
        }>;
        setEnvironmentVariables: (variables: Record<string, string>, environment?: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        rollback: (deploymentId?: string) => Promise<DeploymentResult>;
        getDeploymentLogs: (deploymentId: string) => Promise<{
            success: boolean;
            logs?: string[];
            error?: string;
        }>;
        validateConfig: (config: DeploymentConfig) => Promise<{
            valid: boolean;
            errors?: string[];
            warnings?: string[];
        }>;
    };
};
export default deploymentAgent;
