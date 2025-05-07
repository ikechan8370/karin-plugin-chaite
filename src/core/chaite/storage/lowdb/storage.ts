import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import fs from 'fs'
import { dataDir } from '../../../../utils/config'
import { karinPathData } from 'node-karin'

/**
 * 基于 LowDB 的简单存储类，提供 CRUD 和条件查询功能
 * @template T 存储的数据类型，必须是对象类型
 */
export class LowDBStorage<T extends object = Record<string, any>> {
  filePath: string
  private adapter: JSONFile<{ collections: Record<string, T[]> }>
  db: Low<{ collections: Record<string, T[]> }>
  private initialized: boolean

  /**
   * 创建一个新的存储实例
   * @param options 配置选项
   */
  constructor (options: { filename?: string; directory?: string } = {}) {
    const { filename = 'db.json', directory = path.join(process.cwd(), 'data') } = options
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }
    this.filePath = path.join(directory, filename)
    this.adapter = new JSONFile<{ collections: Record<string, T[]> }>(this.filePath)
    this.db = new Low<{ collections: Record<string, T[]> }>(this.adapter, { collections: {} })
    this.initialized = false
  }

  /**
   * 初始化存储
   * @returns Promise<LowDBStorage<T>> 当前存储实例
   */
  async init (): Promise<LowDBStorage<T>> {
    // 读取数据文件，如果不存在则创建默认结构
    await this.db.read()
    this.db.data ||= { collections: {} }
    await this.db.write()
    this.initialized = true
    return this
  }

  /**
   * 获取或创建一个集合
   * @param name 集合名称
   * @returns LowDBCollection<T> 集合实例
   */
  collection (name: string): LowDBCollection<T> {
    this._checkInit()
    // 确保集合存在
    if (!this.db.data.collections[name]) {
      this.db.data.collections[name] = []
      this.db.write()
    }
    return new LowDBCollection<T>(this, name)
  }

  /**
   * 列出所有集合名称
   * @returns string[] 集合名称列表
   */
  listCollections (): string[] {
    this._checkInit()
    return Object.keys(this.db.data.collections)
  }

  /**
   * 删除一个集合
   * @param name 要删除的集合名称
   * @returns Promise<boolean> 是否成功删除
   */
  async dropCollection (name: string): Promise<boolean> {
    this._checkInit()
    if (this.db.data.collections[name]) {
      delete this.db.data.collections[name]
      await this.db.write()
      return true
    }
    return false
  }

  /**
   * 检查存储是否已初始化
   * @private
   */
  private _checkInit (): void {
    if (!this.initialized) {
      throw new Error('存储尚未初始化，请先调用 init() 方法')
    }
  }
}

/**
 * 集合类，提供对特定数据集合的操作
 * @template T 集合中存储的数据类型，必须是对象类型
 */
export class LowDBCollection<T extends object = Record<string, any>> {
  private storage: LowDBStorage<T>
  private name: string

  /**
   * 创建一个集合实例
   * @param storage 所属存储实例
   * @param name 集合名称
   */
  constructor (storage: LowDBStorage<T>, name: string) {
    this.storage = storage
    this.name = name
  }

  /**
   * 获取集合数据引用
   * @private
   */
  private get _collection (): T[] {
    return this.storage.db.data.collections[this.name]
  }

  /**
   * 保存数据到存储
   * @private
   */
  private async _save (): Promise<void> {
    return this.storage.db.write()
  }

  /**
   * 设置或更新文档（等同于 insert 或 updateById）
   * @param id 文档ID
   * @param doc 要设置的文档
   * @returns Promise<T> 设置后的文档
   */
  async set (id: string, doc: T): Promise<T> {
    if (id && (await this.findById(id))) {
      return (await this.updateById(id, doc)) as T
    }
    // 设置 id 字段
    if (!('id' in doc)) {
      (doc as T & { id?: string }).id = id
    }
    return await this.insert(doc)
  }

  /**
   * 删除文档（等同于 deleteById）
   * @param id 文档ID
   * @returns Promise<boolean> 是否成功删除
   */
  async remove (id: string): Promise<boolean> {
    return await this.deleteById(id)
  }

  /**
   * 生成唯一ID
   * @private
   */
  private _generateId (): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * 创建新文档
   * @param doc 要插入的文档
   * @returns Promise<T & {id: string}> 插入的文档（带ID）
   */
  async insert (doc: T): Promise<T & { id: string }> {
    // 生成唯一ID，如果没有提供
    if (!('id' in doc)) {
      (doc as T & { id?: string }).id = this._generateId()
    }
    // 加上时间戳
    if (!('createdAt' in doc)) {
      (doc as T & { createdAt?: string }).createdAt = new Date().toISOString()
    }
    (doc as T & { updatedAt?: string }).updatedAt = new Date().toISOString()
    // 添加到集合
    this._collection.push(doc)
    await this._save()
    return doc as T & { id: string }
  }

  /**
   * 批量插入多个文档
   * @param docs 要插入的文档数组
   * @returns Promise<T[]> 插入的文档（带ID）
   */
  async insertMany (docs: T[]): Promise<T[]> {
    const inserted: T[] = []
    for (const doc of docs) {
      inserted.push(await this.insert(doc))
    }
    return inserted
  }

  /**
   * 根据ID查找单个文档
   * @param id 文档ID
   * @returns Promise<T | null> 查找到的文档或null
   */
  async findById (id: string): Promise<T | null> {
    return this._collection.find(doc => 'id' in doc && doc.id === id) || null
  }

  /**
   * 返回集合中的所有文档
   * @returns Promise<T[]> 文档数组
   */
  async findAll (): Promise<T[]> {
    return [...this._collection]
  }

  /**
   * 根据条件查找文档
   * @param query 查询条件（字段等值匹配）
   * @returns Promise<T[]> 匹配的文档数组
   */
  async find (query: Record<string, any> = {}): Promise<Array<T>> {
    return this._collection.filter(doc => {
      for (const key in query) {
        const value = query[key]
        // 处理嵌套属性 (例如 user.profile.name)
        if (key.includes('.')) {
          const parts = key.split('.')
          let current: any = doc
          for (let i = 0; i < parts.length; i++) {
            if (current === undefined || current === null) return false
            current = current[parts[i]]
          }
          if (current !== value) return false
        } else if (key in doc && doc[key as keyof T] !== value) {
          return false
        }
      }
      return true
    })
  }

  /**
   * 根据条件查找单个文档
   * @param query 查询条件
   * @returns Promise<T | null> 第一个匹配的文档或null
   */
  async findOne (query: Record<string, any> = {}): Promise<T | null> {
    const results = await this.find(query)
    return results.length > 0 ? results[0] : null
  }

  /**
   * 使用自定义函数进行高级查询
   * @param filterFn 过滤函数
   * @returns Promise<T[]> 匹配的文档数组
   */
  async findWhere (filterFn: (doc: T) => boolean): Promise<T[]> {
    return this._collection.filter(filterFn)
  }

  /**
   * 根据ID更新文档
   * @param id 文档ID
   * @param updates 要更新的字段
   * @returns Promise<T | null> 更新后的文档或null
   */
  async updateById (id: string, updates: Partial<T>): Promise<T | null> {
    const index = this._collection.findIndex(doc => 'id' in doc && doc.id === id)
    if (index === -1) return null
    // 防止覆盖ID
    const { id: _, ...safeUpdates } = updates as any
    // 更新文档
    const updatedDoc = {
      ...this._collection[index],
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    }
    this._collection[index] = updatedDoc
    await this._save()
    return updatedDoc
  }

  /**
   * 根据条件更新文档
   * @param query 查询条件
   * @param updates 要更新的字段
   * @returns Promise<number> 更新的文档数量
   */
  async update (query: Record<string, any>, updates: Partial<T>): Promise<number> {
    const matches = await this.find(query)
    let updated = 0
    for (const doc of matches) {
      if ('id' in doc) {
        await this.updateById((doc as { id: string }).id, updates)
        updated++
      }
    }
    return updated
  }

  /**
   * 根据ID删除文档
   * @param id 文档ID
   * @returns Promise<boolean> 是否成功删除
   */
  async deleteById (id: string): Promise<boolean> {
    const index = this._collection.findIndex(doc => 'id' in doc && doc.id === id)
    if (index === -1) return false
    this._collection.splice(index, 1)
    await this._save()
    return true
  }

  /**
   * 根据条件删除文档
   * @param query 查询条件
   * @returns Promise<number> 删除的文档数量
   */
  async delete (query: Record<string, any>): Promise<number> {
    const before = this._collection.length
    const remaining = this._collection.filter(doc => {
      for (const key in query) {
        if (!(key in doc) || doc[key as keyof T] !== query[key]) {
          return true // 保留不匹配的
        }
      }
      return false // 删除匹配的
    })
    this.storage.db.data.collections[this.name] = remaining
    await this._save()
    return before - remaining.length
  }

  /**
   * 清空集合中的所有文档
   * @returns Promise<number> 删除的文档数量
   */
  async deleteAll (): Promise<number> {
    const count = this._collection.length
    this.storage.db.data.collections[this.name] = []
    await this._save()
    return count
  }

  /**
   * 返回集合中文档的数量
   * @param query 查询条件
   * @returns Promise<number> 文档数量
   */
  async count (query: Record<string, any> = {}): Promise<number> {
    if (Object.keys(query).length === 0) {
      return this._collection.length
    }
    const matches = await this.find(query)
    return matches.length
  }
}

const storageLocation = path.resolve(dataDir, 'storage.json')
if (!fs.existsSync(storageLocation)) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(storageLocation, JSON.stringify({ collections: {} }))
}

const ChatGPTStorage = new LowDBStorage({
  filename: 'storage.json',
  directory: dataDir
})

if (ChatGPTStorage.db.data.collections.history) {
  ChatGPTStorage.dropCollection('history')
    .then(() => {
      // logger.debug 可能未定义，暂时注释
      // logger.debug('drop older version history collection');
    })
    .catch(() => {
      // logger.warn 可能未定义，暂时注释
      // logger.warn('failed to drop older version history collection', err);
    })
}

export const ChatGPTHistoryStorage = new LowDBStorage({
  filename: 'history.json',
  directory: karinPathData
})

export default ChatGPTStorage
