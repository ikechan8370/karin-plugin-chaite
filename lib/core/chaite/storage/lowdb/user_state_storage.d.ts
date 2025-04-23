import { ChaiteStorage, UserSettings, UserState } from 'chaite';
import { LowDBStorage } from './storage.js';
/**
 * 继承UserState
 */
export declare class YunzaiUserState implements UserState {
    userId: string;
    nickname: string;
    card: string;
    conversations: any[];
    settings: UserSettings;
    current: {
        conversationId: string;
        messageId: string;
    };
    id?: string;
    constructor(userId: string, nickname: string, card: string, conversationId?: string);
}
/**
 * @extends {ChaiteStorage<UserState>}
 */
export declare class LowDBUserStateStorage extends ChaiteStorage<UserState> {
    private storage;
    private collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage: LowDBStorage<Record<string, any>>);
    /**
     *
     * @param key 查找的键值
     * @returns Promise<UserState | null> 返回对应的 UserState 或 null
     */
    getItem(key: string): Promise<UserState | null>;
    /**
     *
     * @param id UserState 的 ID
     * @param state UserState 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, state: UserState): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<UserState[]> 返回所有 UserState 列表
     */
    listItems(): Promise<UserState[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<UserState[]> 返回匹配的 UserState 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<UserState[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<UserState[]> 返回匹配的 UserState 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<UserState[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
