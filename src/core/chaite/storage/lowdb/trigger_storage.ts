import { ChaiteStorage, TriggerDTO } from 'chaite';
import { LowDBStorage, LowDBCollection } from './storage'; // 假设这是您之前定义的存储类文件路径

/**
 * @extends {ChaiteStorage<TriggerDTO>}
 */
export class LowDBTriggerStorage extends ChaiteStorage<TriggerDTO> {
  private storage: LowDBStorage<Record<string, any>>;
  private collection: LowDBCollection<Record<string, any>>;

  getName(): string {
    return 'LowDBTriggerStorage';
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
    this.collection = this.storage.collection('triggers');
  }

  /**
   * 获取单个触发器
   * @param key 查找的键值
   * @returns Promise<TriggerDTO | null> 返回对应的 TriggerDTO 或 null
   */
  async getItem(key: string): Promise<TriggerDTO | null> {
    const obj = await this.collection.findOne({ id: key });
    if (!obj) {
      return null;
    }
    return new TriggerDTO(obj);
  }

  /**
   * 保存触发器
   * @param id TriggerDTO 的 ID
   * @param trigger TriggerDTO 实例
   * @returns Promise<string> 返回 ID
   */
  async setItem(id: string, trigger: TriggerDTO): Promise<string> {
    // 设置或更新时间戳
    if (!trigger.createdAt) {
      trigger.createdAt = new Date().toISOString();
    }
    trigger.updatedAt = new Date().toISOString();

    if (id && (await this.getItem(id))) {
      await this.collection.updateById(id, trigger);
      return id;
    }
    const result = await this.collection.insert(trigger);
    return result.id;
  }

  /**
   * 删除触发器
   * @param key 删除的键值
   * @returns Promise<void>
   */
  async removeItem(key: string): Promise<void> {
    await this.collection.deleteById(key);
  }

  /**
   * 获取所有触发器
   * @returns Promise<TriggerDTO[]> 返回所有 TriggerDTO 列表
   */
  async listItems(): Promise<TriggerDTO[]> {
    const list = await this.collection.findAll();
    return list.map((item) => new TriggerDTO({}).fromString(JSON.stringify(item)));
  }

  /**
   * 根据条件筛选触发器
   * @param filter 过滤条件对象
   * @returns Promise<TriggerDTO[]> 返回匹配的 TriggerDTO 列表
   */
  async listItemsByEqFilter(filter: Record<string, unknown>): Promise<TriggerDTO[]> {
    const allList = await this.listItems();
    return allList.filter((item: TriggerDTO) => {
      for (const key in filter) {
        if (item[key as keyof TriggerDTO] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 根据IN条件筛选触发器
   * @param query 查询条件数组
   * @returns Promise<TriggerDTO[]> 返回匹配的 TriggerDTO 列表
   */
  async listItemsByInQuery(query: Array<{ field: string; values: unknown[] }>): Promise<TriggerDTO[]> {
    const allList = await this.listItems();
    return allList.filter((item: TriggerDTO) => {
      for (const { field, values } of query) {
        if (!values.includes(item[field as keyof TriggerDTO])) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 清空所有触发器
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    await this.collection.deleteAll();
  }
}

export default LowDBTriggerStorage;