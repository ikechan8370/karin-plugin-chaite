import { ChaiteStorage, ProcessorDTO } from 'chaite';
export declare class SQLiteProcessorsStorage extends ChaiteStorage<ProcessorDTO> {
    private dbPath;
    private db;
    private initialized;
    private tableName;
    getName(): string;
    /**
     *
     * @param {string} dbPath 数据库文件路径
     */
    constructor(dbPath: string);
    /**
     * 初始化数据库连接和表结构
     * @returns {Promise<void>}
     */
    initialize(): Promise<void>;
    /**
     * 确保数据库已初始化
     */
    ensureInitialized(): Promise<void>;
    /**
     * 将 ProcessorDTO 对象转换为数据库记录
     * @param {ProcessorDTO} processor
     * @returns {Record<string, any>} 数据库记录
     */
    _processorToRecord(processor: ProcessorDTO): Record<string, any>;
    /**
     * 将数据库记录转换为 ProcessorDTO 对象
     * @param {Record<string, any>} record 数据库记录
     * @returns {ProcessorDTO | null} ProcessorDTO 对象
     */
    _recordToProcessor(record: Record<string, any> | undefined): ProcessorDTO | null;
    /**
     * 获取单个处理器
     * @param {string} key 处理器ID
     * @returns {Promise<ProcessorDTO | null>}
     */
    getItem(key: string): Promise<ProcessorDTO | null>;
    /**
     * 保存处理器
     * @param {string} id 处理器ID
     * @param {ProcessorDTO} processor 处理器对象
     * @returns {Promise<string>}
     */
    setItem(id: string, processor: ProcessorDTO): Promise<string>;
    /**
     * 删除处理器
     * @param {string} key 处理器ID
     * @returns {Promise<void>}
     */
    removeItem(key: string): Promise<void>;
    /**
     * 查询所有处理器
     * @returns {Promise<ProcessorDTO[]>}
     */
    listItems(): Promise<ProcessorDTO[]>;
    /**
     * 根据条件筛选处理器
     * @param {Record<string, unknown>} filter 筛选条件
     * @returns {Promise<ProcessorDTO[]>}
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ProcessorDTO[]>;
    /**
     * 根据IN条件筛选处理器
     * @param {Array<{ field: string; values: unknown[]; }>} query
     * @returns {Promise<ProcessorDTO[]>}
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ProcessorDTO[]>;
    /**
     * 清空表中所有数据
     * @returns {Promise<void>}
     */
    clear(): Promise<void>;
    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
}
