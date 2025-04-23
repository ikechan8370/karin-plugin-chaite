import { User } from 'chaite';
/**
 * 认证，以便共享上传
 * @param apiKey API 密钥
 * @returns Promise<User | null> 返回用户对象或 null
 */
export declare function authCloud(apiKey?: string): Promise<User | null>;
/**
 * 初始化 RAG 管理器
 * @param model 模型名称
 * @param dimensions 向量维度
 * @returns Promise<void>
 */
export declare function initRagManager(model: string, dimensions: number): Promise<void>;
/**
 * 初始化 Chaite
 * @returns Promise<void>
 */
export declare function initChaite(): Promise<void>;
