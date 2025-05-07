import { ChaiteStorage, ToolsGroupDTO } from 'chaite'
import { LowDBStorage, LowDBCollection } from './storage' // 假设这是你之前定义的存储类文件路径

/**
 * @extends {ChaiteStorage<ToolsGroupDTO>}
 */
export class LowDBToolsGroupDTOsStorage extends ChaiteStorage<ToolsGroupDTO> {
  private storage: LowDBStorage<ToolsGroupDTO>
  private collection: LowDBCollection<ToolsGroupDTO>

  /**
   *
   * @param storage LowDBStorage 实例
   */
  constructor (storage: LowDBStorage<ToolsGroupDTO>) {
    super()
    this.storage = storage
    /**
     * 集合
     */
    this.collection = this.storage.collection('tool_groups')
  }

  /**
   *
   * @param key 查找的键值
   * @returns Promise<ToolsGroupDTO | null> 返回对应的 ToolsGroupDTO 或 null
   */
  async getItem (key: string): Promise<ToolsGroupDTO | null> {
    const obj = await this.collection.findOne({ id: key })
    if (!obj) {
      return null
    }
    return new ToolsGroupDTO(obj)
  }

  /**
   *
   * @param id ToolsGroupDTO 的 ID
   * @param preset ToolsGroupDTO 实例
   * @returns Promise<string> 返回 ID
   */
  async setItem (id: string, preset: ToolsGroupDTO): Promise<string> {
    if (id && (await this.getItem(id))) {
      await this.collection.updateById(id, preset)
      return id
    }
    const result = await this.collection.insert(preset)
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
   * @returns Promise<ToolsGroupDTO[]> 返回所有 ToolsGroupDTO 列表
   */
  async listItems (): Promise<ToolsGroupDTO[]> {
    const list = await this.collection.findAll()
    return list.map((item: ToolsGroupDTO) => new ToolsGroupDTO({}).fromString(JSON.stringify(item)))
  }

  /**
   *
   * @param filter 过滤条件对象
   * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<ToolsGroupDTO[]> {
    const allList = await this.listItems()
    return allList.filter((item: ToolsGroupDTO) => {
      for (const key in filter) {
        if (item[key as keyof ToolsGroupDTO] !== filter[key]) {
          return false
        }
      }
      return true
    })
  }

  /**
   *
   * @param query 查询条件数组
   * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[] }>): Promise<ToolsGroupDTO[]> {
    const allList = await this.listItems()
    return allList.filter((item: ToolsGroupDTO) => {
      for (const { field, values } of query) {
        if (!values.includes(item[field as keyof ToolsGroupDTO])) {
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
