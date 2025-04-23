import { VectorDatabase } from 'chaite';
/**
 * 基于Vectra实现的简单向量数据库，作为默认实现
 * @implements {VectorDatabase}
 */
export declare class VectraVectorDatabase implements VectorDatabase {
    private index;
    /**
     * 构造函数
     * @param indexFile 索引文件路径
     */
    constructor(indexFile: string);
    /**
     * 初始化向量数据库
     * @returns Promise<void>
     */
    init(): Promise<void>;
    /**
     * 添加单个向量
     * @param vector 向量数组
     * @param text 关联文本
     * @returns Promise<string> 返回向量ID
     */
    addVector(vector: number[], text: string): Promise<string>;
    /**
     * 批量添加向量
     * @param vectors 向量数组
     * @param texts 关联文本数组
     * @returns Promise<string[]> 返回向量ID数组
     */
    addVectors(vectors: number[][], texts: string[]): Promise<string[]>;
    /**
     * 搜索相似向量
     * @param queryVector 查询向量
     * @param k 返回结果数量
     * @returns Promise<Array<{ id: string, score: number, text: string }>> 返回搜索结果
     */
    search(queryVector: number[], k: number): Promise<Array<{
        id: string;
        score: number;
        text: string;
    }>>;
    /**
     * 获取指定ID的向量
     * @param id 向量ID
     * @returns Promise<{ vector: number[], text: string } | null> 返回向量和关联文本，或 null
     */
    getVector(id: string): Promise<{
        vector: number[];
        text: string;
    } | null>;
    /**
     * 删除指定ID的向量
     * @param id 向量ID
     * @returns Promise<boolean> 是否成功删除
     */
    deleteVector(id: string): Promise<boolean>;
    /**
     * 更新指定ID的向量和文本
     * @param id 向量ID
     * @param newVector 新向量
     * @param newText 新文本
     * @returns Promise<boolean> 是否成功更新
     */
    updateVector(id: string, newVector: number[], newText: string): Promise<boolean>;
    /**
     * 获取向量总数
     * @returns Promise<number> 向量总数
     */
    count(): Promise<number>;
    /**
     * 清空向量数据库
     * @returns Promise<void>
     */
    clear(): Promise<void>;
}
