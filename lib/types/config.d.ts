import { CustomConfig } from "chaite";
interface BasicConfig {
    toggleMode: 'at' | 'prefix';
    togglePrefix: string;
    debug: boolean;
    commandPrefix: string;
}
interface BymConfig {
    enable: boolean;
    hit: string[];
    probability: number;
    defaultPreset: string;
    presetPrefix?: string;
    presetMap: Array<{
        keywords: string[];
        presetId: string;
        priority: number;
        recall?: boolean;
    }>;
    maxTokens: number;
    temperature: number;
    sendReasoning: boolean;
}
interface LLMConfig {
    defaultModel: string;
    embeddingModel: string;
    dimensions: number;
    defaultChatPresetId: string;
    enableCustomPreset: boolean;
    customPresetUserWhiteList: string[];
    customPresetUserBlackList: string[];
    promptBlockWords: string[];
    responseBlockWords: string[];
    blockStrategy: 'full' | 'mask';
    blockWordMask: string;
    enableGroupContext: boolean;
    groupContextLength: number;
    groupContextTemplatePrefix: string;
    groupContextTemplateMessage: string;
    groupContextTemplateSuffix: string;
}
interface ManagementConfig {
    blackGroups: number[];
    whiteGroups: number[];
    blackUsers: string[];
    whiteUsers: string[];
    defaultRateLimit: number;
}
interface ChaiteConfig {
    dataDir: string;
    processorsDirPath: string;
    toolsDirPath: string;
    cloudBaseUrl: string;
    cloudApiKey: string;
    authKey: string;
    host: string;
    port: number;
    storage: 'sqlite' | 'lowdb';
}
interface ChatGPTConfig extends CustomConfig {
    basic: BasicConfig;
    bym: BymConfig;
    llm: LLMConfig;
    management: ManagementConfig;
    chaite: ChaiteConfig;
}
export { ChatGPTConfig, BasicConfig, BymConfig, LLMConfig, ManagementConfig, ChaiteConfig };
