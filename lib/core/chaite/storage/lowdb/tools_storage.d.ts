import { ChaiteStorage, ToolDTO } from 'chaite';
import { LowDBStorage } from './storage.js';
/**
 * @extends {ChaiteStorage<ToolDTO>}
 */
export declare class LowDBToolsStorage extends ChaiteStorage<ToolDTO> {
    private storage;
    private collection;
    getName(): string;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage: LowDBStorage<Record<string, any>>);
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ToolDTO | null> 返回对应的 ToolDTO 或 null
     */
    getItem(key: string): Promise<ToolDTO | null>;
    /**
     *
     * @param id ToolDTO 的 ID
     * @param tools ToolDTO 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, tools: ToolDTO): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<ToolDTO[]> 返回所有 ToolDTO 列表
     */
    listItems(): Promise<ToolDTO[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ToolDTO[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ToolDTO[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
