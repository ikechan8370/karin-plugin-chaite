import { ChaiteStorage, Processor, ProcessorDTO } from 'chaite';
import { LowDBStorage } from './storage.js';
export declare class LowDBProcessorsStorage extends ChaiteStorage<ProcessorDTO> {
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
     * @returns Promise<ProcessorDTO | null> 返回对应的 Processor 或 null
     */
    getItem(key: string): Promise<ProcessorDTO | null>;
    /**
     *
     * @param id Processor 的 ID
     * @param processor Processor 实例
     * @returns Promise<string> 返回 ID
     */
    setItem(id: string, processor: Processor): Promise<string>;
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    removeItem(key: string): Promise<void>;
    /**
     *
     * @returns Promise<ProcessorDTO[]> 返回所有 Processor 列表
     */
    listItems(): Promise<ProcessorDTO[]>;
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ProcessorDTO[]>;
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ProcessorDTO[]>;
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
