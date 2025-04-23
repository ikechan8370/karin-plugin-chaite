import { ChaiteStorage, Channel } from 'chaite';
export declare class SQLiteChannelStorage extends ChaiteStorage<Channel> {
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
     * 将 Channel 对象转换为数据库记录
     * @param {Channel} channel
     * @returns {Record<string, any>} 数据库记录
     */
    _channelToRecord(channel: Channel): Record<string, any>;
    /**
     * 将数据库记录转换为 Channel 对象
     * @param {Record<string, any>} record 数据库记录
     * @returns {Channel | null} Channel 对象
     */
    _recordToChannel(record: Record<string, any> | undefined): Channel | null;
    /**
     * 获取单个渠道
     * @param {string} key 渠道ID
     * @returns {Promise<Channel | null>}
     */
    getItem(key: string): Promise<Channel | null>;
    /**
     * 保存渠道
     * @param {string} id 渠道ID
     * @param {Channel} channel 渠道对象
     * @returns {Promise<string>}
     */
    setItem(id: string, channel: Channel): Promise<string>;
    /**
     * 删除渠道
     * @param {string} key 渠道ID
     * @returns {Promise<void>}
     */
    removeItem(key: string): Promise<void>;
    /**
     * 查询所有渠道
     * @returns {Promise<Channel[]>}
     */
    listItems(): Promise<Channel[]>;
    /**
     * 根据条件筛选渠道
     * @param {Record<string, unknown>} filter 筛选条件
     * @returns {Promise<Channel[]>}
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<Channel[]>;
    /**
     * 根据IN条件筛选渠道
     * @param {Array<{ field: string; values: unknown[]; }>} query
     * @returns {Promise<Channel[]>}
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<Channel[]>;
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
