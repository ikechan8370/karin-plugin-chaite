import { Low } from 'lowdb';
/**
 * 基于 LowDB 的简单存储类，提供 CRUD 和条件查询功能
 * @template T 存储的数据类型，必须是对象类型
 */
export declare class LowDBStorage<T extends object = Record<string, any>> {
    filePath: string;
    private adapter;
    db: Low<{
        collections: Record<string, T[]>;
    }>;
    private initialized;
    /**
     * 创建一个新的存储实例
     * @param options 配置选项
     */
    constructor(options?: {
        filename?: string;
        directory?: string;
    });
    /**
     * 初始化存储
     * @returns Promise<LowDBStorage<T>> 当前存储实例
     */
    init(): Promise<LowDBStorage<T>>;
    /**
     * 获取或创建一个集合
     * @param name 集合名称
     * @returns LowDBCollection<T> 集合实例
     */
    collection(name: string): LowDBCollection<T>;
    /**
     * 列出所有集合名称
     * @returns string[] 集合名称列表
     */
    listCollections(): string[];
    /**
     * 删除一个集合
     * @param name 要删除的集合名称
     * @returns Promise<boolean> 是否成功删除
     */
    dropCollection(name: string): Promise<boolean>;
    /**
     * 检查存储是否已初始化
     * @private
     */
    private _checkInit;
}
/**
 * 集合类，提供对特定数据集合的操作
 * @template T 集合中存储的数据类型，必须是对象类型
 */
export declare class LowDBCollection<T extends object = Record<string, any>> {
    private storage;
    private name;
    /**
     * 创建一个集合实例
     * @param storage 所属存储实例
     * @param name 集合名称
     */
    constructor(storage: LowDBStorage<T>, name: string);
    /**
     * 获取集合数据引用
     * @private
     */
    private get _collection();
    /**
     * 保存数据到存储
     * @private
     */
    private _save;
    /**
     * 设置或更新文档（等同于 insert 或 updateById）
     * @param id 文档ID
     * @param doc 要设置的文档
     * @returns Promise<T> 设置后的文档
     */
    set(id: string, doc: T): Promise<T>;
    /**
     * 删除文档（等同于 deleteById）
     * @param id 文档ID
     * @returns Promise<boolean> 是否成功删除
     */
    remove(id: string): Promise<boolean>;
    /**
     * 生成唯一ID
     * @private
     */
    private _generateId;
    /**
     * 创建新文档
     * @param doc 要插入的文档
     * @returns Promise<T & {id: string}> 插入的文档（带ID）
     */
    insert(doc: T): Promise<T & {
        id: string;
    }>;
    /**
     * 批量插入多个文档
     * @param docs 要插入的文档数组
     * @returns Promise<T[]> 插入的文档（带ID）
     */
    insertMany(docs: T[]): Promise<T[]>;
    /**
     * 根据ID查找单个文档
     * @param id 文档ID
     * @returns Promise<T | null> 查找到的文档或null
     */
    findById(id: string): Promise<T | null>;
    /**
     * 返回集合中的所有文档
     * @returns Promise<T[]> 文档数组
     */
    findAll(): Promise<T[]>;
    /**
     * 根据条件查找文档
     * @param query 查询条件（字段等值匹配）
     * @returns Promise<T[]> 匹配的文档数组
     */
    find(query?: Record<string, any>): Promise<Array<T>>;
    /**
     * 根据条件查找单个文档
     * @param query 查询条件
     * @returns Promise<T | null> 第一个匹配的文档或null
     */
    findOne(query?: Record<string, any>): Promise<T | null>;
    /**
     * 使用自定义函数进行高级查询
     * @param filterFn 过滤函数
     * @returns Promise<T[]> 匹配的文档数组
     */
    findWhere(filterFn: (doc: T) => boolean): Promise<T[]>;
    /**
     * 根据ID更新文档
     * @param id 文档ID
     * @param updates 要更新的字段
     * @returns Promise<T | null> 更新后的文档或null
     */
    updateById(id: string, updates: Partial<T>): Promise<T | null>;
    /**
     * 根据条件更新文档
     * @param query 查询条件
     * @param updates 要更新的字段
     * @returns Promise<number> 更新的文档数量
     */
    update(query: Record<string, any>, updates: Partial<T>): Promise<number>;
    /**
     * 根据ID删除文档
     * @param id 文档ID
     * @returns Promise<boolean> 是否成功删除
     */
    deleteById(id: string): Promise<boolean>;
    /**
     * 根据条件删除文档
     * @param query 查询条件
     * @returns Promise<number> 删除的文档数量
     */
    delete(query: Record<string, any>): Promise<number>;
    /**
     * 清空集合中的所有文档
     * @returns Promise<number> 删除的文档数量
     */
    deleteAll(): Promise<number>;
    /**
     * 返回集合中文档的数量
     * @param query 查询条件
     * @returns Promise<number> 文档数量
     */
    count(query?: Record<string, any>): Promise<number>;
}
declare const ChatGPTStorage: LowDBStorage<Record<string, any>>;
export declare const ChatGPTHistoryStorage: LowDBStorage<Record<string, any>>;
export default ChatGPTStorage;
