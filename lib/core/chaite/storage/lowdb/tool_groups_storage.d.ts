import { ChaiteStorage, ToolsGroupDTO } from 'chaite';
import { LowDBStorage } from './storage.js';
/**
 * @extends {ChaiteStorage<ToolsGroupDTO>}
 */
export declare class LowDBToolsGroupDTOsStorage extends ChaiteStorage<ToolsGroupDTO> {
    private storage;
    private collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage: LowDBStorage<ToolsGroupDTO>);
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ToolsGroupDTO | null> 返回对应的 ToolsGroupDTO 或 null
     */
    getItem(key: string): Promise<ToolsGroupDTO | null>;
    /**
     *
     * @param id ToolsGroupDTO 的 ID
     * @param preset ToolsGroupDTO 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, preset: ToolsGroupDTO): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<ToolsGroupDTO[]> 返回所有 ToolsGroupDTO 列表
     */
    listItems(): Promise<ToolsGroupDTO[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ToolsGroupDTO[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ToolsGroupDTO[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
