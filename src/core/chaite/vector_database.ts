import { LocalIndex } from 'vectra';
import { md5 } from '../../utils/common.js';
import { VectorDatabase } from 'chaite';

/**
 * 基于Vectra实现的简单向量数据库，作为默认实现
 * @implements {VectorDatabase}
 */
export class VectraVectorDatabase implements VectorDatabase {
  private index: LocalIndex;

  /**
   * 构造函数
   * @param indexFile 索引文件路径
   */
  constructor(indexFile: string) {
    this.index = new LocalIndex(indexFile);
  }

  /**
   * 初始化向量数据库
   * @returns Promise<void>
   */
  async init(): Promise<void> {
    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
    }
  }

  /**
   * 添加单个向量
   * @param vector 向量数组
   * @param text 关联文本
   * @returns Promise<string> 返回向量ID
   */
  async addVector(vector: number[], text: string): Promise<string> {
    const id = md5(text);
    await this.index.insertItem({
      vector,
      id,
      metadata: { text }
    });
    return id;
  }

  /**
   * 批量添加向量
   * @param vectors 向量数组
   * @param texts 关联文本数组
   * @returns Promise<string[]> 返回向量ID数组
   */
  async addVectors(vectors: number[][], texts: string[]): Promise<string[]> {
    return await Promise.all(vectors.map((v, i) => this.addVector(v, texts[i])));
  }

  /**
   * 搜索相似向量
   * @param queryVector 查询向量
   * @param k 返回结果数量
   * @returns Promise<Array<{ id: string, score: number, text: string }>> 返回搜索结果
   */
  async search(queryVector: number[], k: number): Promise<Array<{ id: string; score: number; text: string }>> {
    const results = await this.index.queryItems(queryVector, k);
    return results.map(r => ({ id: r.item.id, score: r.score, text: r.item.metadata.text }));
  }

  /**
   * 获取指定ID的向量
   * @param id 向量ID
   * @returns Promise<{ vector: number[], text: string } | null> 返回向量和关联文本，或 null
   */
  async getVector(id: string): Promise<{ vector: number[]; text: string } | null> {
    try {
      const result = await this.index.getItem(id);
      if (!result) {
        return null;
      }
      return {
        vector: result.vector,
        text: result.metadata.text
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 删除指定ID的向量
   * @param id 向量ID
   * @returns Promise<boolean> 是否成功删除
   */
  async deleteVector(id: string): Promise<boolean> {
    await this.index.deleteItem(id);
    return true;
  }

  /**
   * 更新指定ID的向量和文本
   * @param id 向量ID
   * @param newVector 新向量
   * @param newText 新文本
   * @returns Promise<boolean> 是否成功更新
   */
  async updateVector(id: string, newVector: number[], newText: string): Promise<boolean> {
    await this.index.upsertItem({
      id,
      vector: newVector,
      metadata: { text: newText }
    });
    return true;
  }

  /**
   * 获取向量总数
   * @returns Promise<number> 向量总数
   */
  async count(): Promise<number> {
    return (await this.index.getIndexStats()).items;
  }

  /**
   * 清空向量数据库
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    await this.index.deleteIndex();
  }
}