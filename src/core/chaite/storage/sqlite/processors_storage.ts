import { ChaiteStorage, ProcessorDTO, User } from 'chaite'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { generateId } from '../../../../utils/common.js'

export class SQLiteProcessorsStorage extends ChaiteStorage<ProcessorDTO> {
  private dbPath: string
  private db: sqlite3.Database | null
  private initialized: boolean
  private tableName: string

  getName (): string {
    return 'SQLiteProcessorsStorage'
  }

  /**
   *
   * @param {string} dbPath 数据库文件路径
   */
  constructor (dbPath: string) {
    super()
    this.dbPath = dbPath
    this.db = null
    this.initialized = false
    this.tableName = 'processors'
  }

  /**
   * 初始化数据库连接和表结构
   * @returns {Promise<void>}
   */
  async initialize (): Promise<void> {
    if (this.initialized) return

    return new Promise<void>((resolve, reject) => {
      // 确保目录存在
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          return reject(err)
        }

        // 创建处理器表，将主要属性分列存储
        this.db!.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL, 
          code TEXT,
          cloudId INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          md5 TEXT,
          embedded INTEGER DEFAULT 0,
          uploader TEXT,
          extraData TEXT
        )`, (err) => {
          if (err) {
            return reject(err)
          }

          // 创建索引
          this.db!.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${this.tableName} (type)`, (err) => {
            if (err) {
              return reject(err)
            }
            this.initialized = true
            resolve()
          })
        })
      })
    })
  }

  /**
   * 确保数据库已初始化
   */
  async ensureInitialized (): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * 将 ProcessorDTO 对象转换为数据库记录
   * @param {ProcessorDTO} processor
   * @returns {Record<string, any>} 数据库记录
   */
  _processorToRecord (processor: ProcessorDTO): Record<string, any> {
    // 提取主要字段
    const {
      id, name, description, type, code, cloudId,
      createdAt, updatedAt, md5, embedded, uploader, ...rest
    } = processor

    return {
      id: id || '',
      name: name || '',
      description: description || '',
      type: type || '', // 'pre' 或 'post'
      code: code || '',
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      uploader: uploader ? JSON.stringify(uploader) : null,
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  }

  /**
   * 将数据库记录转换为 ProcessorDTO 对象
   * @param {Record<string, any>} record 数据库记录
   * @returns {ProcessorDTO | null} ProcessorDTO 对象
   */
  _recordToProcessor (record: Record<string, any> | undefined): ProcessorDTO | null {
    if (!record) return null

    // 解析 JSON 字段
    let uploader: Record<string, any> | null = null
    try {
      if (record.uploader) {
        uploader = JSON.parse(record.uploader)
      }
    } catch (e) {
      // 解析错误，使用 null
    }

    let extraData: Record<string, any> = {}
    try {
      if (record.extraData) {
        extraData = JSON.parse(record.extraData)
      }
    } catch (e) {
      // 解析错误，使用空对象
    }

    // 构造 ProcessorDTO 对象
    const processorData = {
      id: record.id,
      name: record.name,
      description: record.description,
      type: record.type, // 'pre' 或 'post'
      code: record.code,
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      uploader: uploader as User,
      ...extraData
    }

    return new ProcessorDTO(processorData)
  }

  /**
   * 获取单个处理器
   * @param {string} key 处理器ID
   * @returns {Promise<ProcessorDTO | null>}
   */
  async getItem (key: string): Promise<ProcessorDTO | null> {
    await this.ensureInitialized()

    return new Promise<ProcessorDTO | null>((resolve, reject) => {
      this.db!.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err, row) => {
        if (err) {
          return reject(err)
        }

        const processor = this._recordToProcessor(row as Record<string, any>)
        resolve(processor)
      })
    })
  }

  /**
   * 保存处理器
   * @param {string} id 处理器ID
   * @param {ProcessorDTO} processor 处理器对象
   * @returns {Promise<string>}
   */
  async setItem (id: string, processor: ProcessorDTO): Promise<string> {
    await this.ensureInitialized()
    if (!id) {
      id = generateId()
    }

    // 加上时间戳
    if (!processor.createdAt) {
      processor.createdAt = new Date().toISOString()
    }

    processor.updatedAt = new Date().toISOString()
    // 转换为数据库记录
    const record = this._processorToRecord(processor)
    record.id = id // 确保ID是指定的ID

    // 构建插入或更新SQL
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const updates = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => record[field])
    const duplicateValues = [...values] // 用于ON CONFLICT时的更新

    return new Promise<string>((resolve, reject) => {
      this.db!.run(
        `INSERT INTO ${this.tableName} (${fields.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
        [...values, ...duplicateValues],
        function (err) {
          if (err) {
            return reject(err)
          }
          resolve(id)
        }
      )
    })
  }

  /**
   * 删除处理器
   * @param {string} key 处理器ID
   * @returns {Promise<void>}
   */
  async removeItem (key: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise<void>((resolve, reject) => {
      this.db!.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [key], (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * 查询所有处理器
   * @returns {Promise<ProcessorDTO[]>}
   */
  async listItems (): Promise<ProcessorDTO[]> {
    await this.ensureInitialized()

    return new Promise<ProcessorDTO[]>((resolve, reject) => {
      this.db!.all(`SELECT * FROM ${this.tableName}`, (err, rows) => {
        if (err) {
          return reject(err)
        }

        const processors = rows.map(row => this._recordToProcessor(row as Record<string, any>)).filter(Boolean) as ProcessorDTO[]
        resolve(processors)
      })
    })
  }

  /**
   * 根据条件筛选处理器
   * @param {Record<string, unknown>} filter 筛选条件
   * @returns {Promise<ProcessorDTO[]>}
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<ProcessorDTO[]> {
    await this.ensureInitialized()

    // 如果没有筛选条件，返回所有
    if (!filter || Object.keys(filter).length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL字段直接过滤
    const directFields = ['id', 'name', 'description', 'type', 'cloudId']
    const sqlFilters: string[] = []
    const sqlParams: any[] = []
    const extraFilters: Record<string, unknown> = {}
    let hasExtraFilters = false

    // 区分数据库字段和额外字段
    for (const key in filter) {
      const value = filter[key]

      // 如果是直接支持的字段，构建SQL条件
      if (directFields.includes(key)) {
        sqlFilters.push(`${key} = ?`)
        sqlParams.push(value)
      } else if (key === 'embedded') {
        // embedded 字段需要特殊处理为 0/1
        sqlFilters.push('embedded = ?')
        sqlParams.push(value ? 1 : 0)
      } else {
        // 其他字段需要在结果中进一步过滤
        extraFilters[key] = value
        hasExtraFilters = true
      }
    }

    // 构建SQL查询
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }

    return new Promise<ProcessorDTO[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err, rows: any[]) => {
        if (err) {
          return reject(err)
        }

        let processors = rows.map(row => this._recordToProcessor(row)).filter(Boolean) as ProcessorDTO[]

        // 如果有需要在内存中过滤的额外字段
        if (hasExtraFilters) {
          processors = processors.filter(processor => {
            for (const key in extraFilters) {
              if ((processor as any)[key] !== extraFilters[key]) {
                return false
              }
            }
            return true
          })
        }

        resolve(processors)
      })
    })
  }

  /**
   * 根据IN条件筛选处理器
   * @param {Array<{ field: string; values: unknown[]; }>} query
   * @returns {Promise<ProcessorDTO[]>}
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[]; }>): Promise<ProcessorDTO[]> {
    await this.ensureInitialized()

    // 如果没有查询条件，返回所有
    if (!query || query.length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL IN子句来优化查询
    const directFields = ['id', 'name', 'description', 'type', 'cloudId']
    const sqlFilters: string[] = []
    const sqlParams: any[] = []
    const extraQueries: Array<{ field: string; values: unknown[]; }> = []

    // 处理每个查询条件
    for (const { field, values } of query) {
      if (values.length === 0) continue

      // 如果是直接支持的字段，使用SQL IN子句
      if (directFields.includes(field)) {
        const placeholders = values.map(() => '?').join(', ')
        sqlFilters.push(`${field} IN (${placeholders})`)
        sqlParams.push(...values)
      } else if (field === 'embedded') {
        // embedded 字段需要特殊处理
        const boolValues = values.map(v => v ? 1 : 0)
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`embedded IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else {
        // 其他字段在内存中过滤
        extraQueries.push({ field, values })
      }
    }

    // 构建SQL查询
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }

    return new Promise<ProcessorDTO[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err, rows: any[]) => {
        if (err) {
          return reject(err)
        }

        let processors = rows.map(row => this._recordToProcessor(row)).filter(Boolean) as ProcessorDTO[]

        // 如果有需要在内存中过滤的条件
        if (extraQueries.length > 0) {
          processors = processors.filter(processor => {
            for (const { field, values } of extraQueries) {
              if (!values.includes((processor as any)[field])) {
                return false
              }
            }
            return true
          })
        }

        resolve(processors)
      })
    })
  }

  /**
   * 清空表中所有数据
   * @returns {Promise<void>}
   */
  async clear (): Promise<void> {
    await this.ensureInitialized()

    return new Promise<void>((resolve, reject) => {
      this.db!.run(`DELETE FROM ${this.tableName}`, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * 关闭数据库连接
   * @returns {Promise<void>}
   */
  async close (): Promise<void> {
    if (!this.db) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      this.db!.close(err => {
        if (err) {
          reject(err)
        } else {
          this.initialized = false
          this.db = null
          resolve()
        }
      })
    })
  }
}