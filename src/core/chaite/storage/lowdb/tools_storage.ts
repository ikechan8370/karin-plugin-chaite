import { ChaiteStorage, ToolDTO } from 'chaite';
import { LowDBStorage, LowDBCollection } from './storage'; // 假设这是你之前定义的存储类文件路径

/**
 * @extends {ChaiteStorage<ToolDTO>}
 */
export class LowDBToolsStorage extends ChaiteStorage<ToolDTO> {
  private storage: LowDBStorage<Record<string, any>>;
  private collection: LowDBCollection<Record<string, any>>;

  getName(): string {
    return 'LowDBToolsStorage';
  }

  /**
   *
   * @param storage LowDBStorage 实例
   */
  constructor(storage: LowDBStorage<Record<string, any>>) {
    super();
    this.storage = storage;
    /**
     * 集合
     */
    this.collection = this.storage.collection('tools');
  }

  /**
   *
   * @param key 查找的键值
   * @returns Promise<ToolDTO | null> 返回对应的 ToolDTO 或 null
   */
  async getItem(key: string): Promise<ToolDTO | null> {
    const obj = await this.collection.findOne({ id: key });
    if (!obj) {
      return null;
    }
    return new ToolDTO(obj);
  }

  /**
   *
   * @param id ToolDTO 的 ID
   * @param tools ToolDTO 实例
   * @returns Promise<string> 返回 ID
   */
  async setItem(id: string, tools: ToolDTO): Promise<string> {
    if (id && (await this.getItem(id))) {
      await this.collection.updateById(id, tools);
      return id;
    }
    const result = await this.collection.insert(tools);
    return result.id;
  }

  /**
   *
   * @param key 删除的键值
   * @returns Promise<void>
   */
  async removeItem(key: string): Promise<void> {
    await this.collection.deleteById(key);
  }

  /**
   *
   * @returns Promise<ToolDTO[]> 返回所有 ToolDTO 列表
   */
  async listItems(): Promise<ToolDTO[]> {
    const list = await this.collection.findAll();
    return list.map((item) => new ToolDTO({}).fromString(JSON.stringify(item)));
  }

  /**
   *
   * @param filter 过滤条件对象
   * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
   */
  async listItemsByEqFilter(filter: Record<string, unknown>): Promise<ToolDTO[]> {
    const allList = await this.listItems();
    return allList.filter((item: ToolDTO) => {
      for (const key in filter) {
        if (item[key as keyof ToolDTO] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   *
   * @param query 查询条件数组
   * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
   */
  async listItemsByInQuery(query: Array<{ field: string; values: unknown[] }>): Promise<ToolDTO[]> {
    const allList = await this.listItems();
    return allList.filter((item: ToolDTO) => {
      for (const { field, values } of query) {
        if (!values.includes(item[field as keyof ToolDTO])) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 清空所有数据
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    await this.collection.deleteAll();
  }
}