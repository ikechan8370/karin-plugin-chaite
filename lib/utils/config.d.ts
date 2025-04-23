import { ChatGPTConfig } from '../types/config.js';
/**
 * @description 配置文件
 */
export declare const config: () => ChatGPTConfig & {
    save: () => void;
};
/**
 * @description package.json
 */
export declare const pkg: () => any;
