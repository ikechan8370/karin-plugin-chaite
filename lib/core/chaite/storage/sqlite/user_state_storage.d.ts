import { ChaiteStorage, UserState } from 'chaite';
/**
 * 基于SQLite的用户状态存储实现
 * @extends {ChaiteStorage<UserState>}
 */
export declare class SQLiteUserStateStorage extends ChaiteStorage<UserState> {
    private dbPath;
    private db;
    private initialized;
    private tableName;
    /**
     * 构造函数
     * @param dbPath 数据库文件路径
     */
    constructor(dbPath: string);
    /**
     * 初始化数据库连接和表结构
     * @returns Promise<void>
     */
    initialize(): Promise<void>;
    /**
     * 确保数据库已初始化
     * @returns Promise<void>
     */
    ensureInitialized(): Promise<void>;
    /**
     * 获取用户状态
     * @param userId 用户ID
     * @returns Promise<UserState | null> 返回用户状态或 null
     */
    getItem(userId: string): Promise<UserState | null>;
    /**
     * 保存用户状态
     * @param userId 用户ID
     * @param userState 用户状态数据
     * @returns Promise<string> 返回用户ID
     */
    setItem(userId: string, userState: UserState): Promise<string>;
    /**
     * 删除用户状态
     * @param userId 用户ID
     * @returns Promise<void>
     */
    removeItem(userId: string): Promise<void>;
    /**
     * 获取所有用户状态
     * @returns Promise<UserState[]> 返回所有用户状态列表
     */
    listItems(): Promise<UserState[]>;
    /**
     * 根据过滤条件查询用户状态
     * @param filter 过滤条件
     * @returns Promise<UserState[]> 返回匹配的用户状态列表
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<UserState[]>;
    /**
     * 根据IN查询条件查询用户状态
     * @param query IN查询条件
     * @returns Promise<UserState[]> 返回匹配的用户状态列表
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<UserState[]>;
    /**
     * 清空所有用户状态
     * @returns Promise<void>
     */
    clear(): Promise<void>;
    /**
     * 获取存储名称
     * @returns string
     */
    getName(): string;
    /**
     * 关闭数据库连接
     * @returns Promise<void>
     */
    close(): Promise<void>;
}
