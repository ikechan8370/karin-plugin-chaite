import { ChaiteStorage, UserSettings, UserState } from 'chaite'
import * as crypto from 'node:crypto'
import { LowDBStorage, LowDBCollection } from './storage' // 假设这是你之前定义的存储类文件路径

/**
 * 继承UserState
 */
export class KarinUserState implements UserState {
  userId: string
  nickname: string
  card: string
  conversations: any[] // 如果有具体类型，可以替换 any
  settings: UserSettings
  current: {
    conversationId: string;
    messageId: string;
  }

  id?: string // 可选字段，符合存储逻辑

  constructor (userId: string, nickname: string, card: string, conversationId: string = crypto.randomUUID()) {
    this.userId = userId
    this.nickname = nickname
    this.card = card
    this.conversations = []
    this.settings = {} as UserSettings
    this.current = {
      conversationId,
      messageId: crypto.randomUUID()
    }
  }
}

/**
 * @extends {ChaiteStorage<UserState>}
 */
export class LowDBUserStateStorage extends ChaiteStorage<UserState> {
  private storage: LowDBStorage<Record<string, any>>
  private collection: LowDBCollection<Record<string, any>>

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
    this.collection = this.storage.collection('user_states')
  }

  /**
   *
   * @param key 查找的键值
   * @returns Promise<UserState | null> 返回对应的 UserState 或 null
   */
  async getItem (key: string): Promise<UserState | null> {
    return this.collection.findOne({ id: key }) as Promise<UserState | null>
  }

  /**
   *
   * @param id UserState 的 ID
   * @param state UserState 实例
   * @returns Promise<string> 返回 ID
   */
  async setItem (id: string, state: UserState): Promise<string> {
    if (id && (await this.getItem(id))) {
      await this.collection.updateById(id, state)
      return id
    }
    // 设置 id 字段
    (state as UserState & { id?: string }).id = id
    const result = await this.collection.insert(state)
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
   * @returns Promise<UserState[]> 返回所有 UserState 列表
   */
  async listItems (): Promise<UserState[]> {
    return await this.collection.findAll() as UserState[]
  }

  /**
   *
   * @param filter 过滤条件对象
   * @returns Promise<UserState[]> 返回匹配的 UserState 列表
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<UserState[]> {
    const allList = await this.listItems()
    return allList.filter((item: UserState) => {
      for (const key in filter) {
        if (item[key as keyof UserState] !== filter[key]) {
          return false
        }
      }
      return true
    })
  }

  /**
   *
   * @param query 查询条件数组
   * @returns Promise<UserState[]> 返回匹配的 UserState 列表
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[] }>): Promise<UserState[]> {
    const allList = await this.listItems()
    return allList.filter((item: UserState) => {
      for (const { field, values } of query) {
        if (!values.includes(item[field as keyof UserState])) {
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
