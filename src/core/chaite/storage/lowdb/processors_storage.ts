import { ChaiteStorage, Processor, ProcessorDTO } from 'chaite'
import { LowDBCollection, LowDBStorage } from './storage'

export class LowDBProcessorsStorage extends ChaiteStorage<ProcessorDTO> {
  private storage: LowDBStorage<Record<string, any>> // 假设 storage 的具体类型未知，使用 any，或者替换为具体的类型
  private collection: LowDBCollection<Record<string, any>> // 假设 collection 的具体类型未知，使用 any，或者替换为具体的类型

  /**
   *
   * @param storage LowDBStorage 实例
   */
  constructor (storage: LowDBStorage<Record<string, any>>) {
    super()
    this.storage = storage
    /**
     * 集合
     */
    this.collection = this.storage.collection('processors')
  }

  /**
   *
   * @param key 查找的键值
   * @returns Promise<ProcessorDTO | null> 返回对应的 Processor 或 null
   */
  async getItem (key: string): Promise<ProcessorDTO | null> {
    const obj = await this.collection.findOne({ id: key })
    if (!obj) {
      return null
    }
    return new ProcessorDTO(obj)
  }

  /**
   *
   * @param id Processor 的 ID
   * @param processor Processor 实例
   * @returns Promise<string> 返回 ID
   */
  async setItem (id: string, processor: Processor): Promise<string> {
    if (id && (await this.getItem(id))) {
      await this.collection.updateById(id, processor)
      return id
    }
    const result = await this.collection.insert(processor)
    return result.id
  }

  /**
   *
   * @param key 删除的键值
   * @returns Promise<void>
   */
  async removeItem (key: string): Promise<void> {
    await this.collection.deleteById(key)
  }

  /**
   *
   * @returns Promise<ProcessorDTO[]> 返回所有 Processor 列表
   */
  async listItems (): Promise<ProcessorDTO[]> {
    const list = await this.collection.findAll()
    return list.map((item: any) => new ProcessorDTO({}).fromString(JSON.stringify(item)))
  }

  /**
   *
   * @param filter 过滤条件对象
   * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<ProcessorDTO[]> {
    const allList = await this.listItems()
    return allList.filter((item: ProcessorDTO) => {
      for (const key in filter) {
        if (item[key as keyof ProcessorDTO] !== filter[key]) {
          return false
        }
      }
      return true
    })
  }

  /**
   *
   * @param query 查询条件数组
   * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[] }>): Promise<ProcessorDTO[]> {
    const allList = await this.listItems()
    return allList.filter((item: ProcessorDTO) => {
      for (const { field, values } of query) {
        if (!values.includes(item[field as keyof ProcessorDTO])) {
          return false
        }
      }
      return true
    })
  }

  /**
   * 清空所有数据
   * @returns Promise<void>
   */
  async clear (): Promise<void> {
    await this.collection.deleteAll()
  }
}
