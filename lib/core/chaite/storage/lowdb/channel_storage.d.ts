import { ChaiteStorage, Channel } from 'chaite';
export declare class LowDBChannelStorage extends ChaiteStorage<Channel> {
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
     * @returns Promise<Channel | null> 返回对应的 Channel 或 null
     */
    getItem(key: string): Promise<Channel | null>;
    /**
     *
     * @param id Channel 的 ID
     * @param channel Channel 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, channel: Channel): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<Channel[]> 返回所有 Channel 列表
     */
    listItems(): Promise<Channel[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<Channel[]> 返回匹配的 Channel 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<Channel[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<Channel[]> 返回匹配的 Channel 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<Channel[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
