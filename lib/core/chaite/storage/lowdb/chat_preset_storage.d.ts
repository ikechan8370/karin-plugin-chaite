import { ChaiteStorage, ChatPreset } from 'chaite';
/**
 * @extends {ChaiteStorage<ChatPreset>}
 */
export declare class LowDBChatPresetsStorage extends ChaiteStorage<ChatPreset> {
    private storage;
    private collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage: any);
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ChatPreset | null> 返回对应的 ChatPreset 或 null
     */
    getItem(key: string): Promise<ChatPreset | null>;
    /**
     *
     * @param id ChatPreset 的 ID
     * @param preset ChatPreset 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, preset: ChatPreset): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<ChatPreset[]> 返回所有 ChatPreset 列表
     */
    listItems(): Promise<ChatPreset[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ChatPreset[]> 返回匹配的 ChatPreset 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ChatPreset[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<ChatPreset[]> 返回匹配的 ChatPreset 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ChatPreset[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
