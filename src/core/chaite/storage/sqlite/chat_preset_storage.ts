import { ChaiteStorage, ChatPreset, SendMessageOption } from 'chaite'
import sqlite3 from 'sqlite3'
import { Database } from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { generateId } from '../../../../utils/common.js'

/**
 * SQLiteChatPresetStorage extends ChaiteStorage for ChatPreset.
 * @extends {ChaiteStorage<ChatPreset>}
 */
export class SQLiteChatPresetStorage extends ChaiteStorage<ChatPreset> {
  private dbPath: string
  private db: Database | null
  private initialized: boolean
  private tableName: string

  getName (): string {
    return 'SQLiteChatPresetStorage'
  }

  /**
   * Constructor for SQLiteChatPresetStorage.
   * @param {string} dbPath - Path to the database file.
   */
  constructor (dbPath: string) {
    super()
    this.dbPath = dbPath
    this.db = null
    this.initialized = false
    this.tableName = 'chat_presets'
  }

  /**
   * Initialize the database connection and table structure.
   * @returns {Promise<void>}
   */
  async initialize (): Promise<void> {
    if (this.initialized) return
    return new Promise<void>((resolve, reject) => {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      this.db = new sqlite3.Database(this.dbPath, async (err: Error | null) => {
        if (err) {
          return reject(err)
        }
        // Create ChatPreset table with main attributes as columns
        this.db!.run(
          `CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            prefix TEXT NOT NULL,
            local INTEGER DEFAULT 1,
            namespace TEXT,
            sendMessageOption TEXT NOT NULL,
            cloudId INTEGER,
            createdAt TEXT,
            updatedAt TEXT,
            md5 TEXT,
            embedded INTEGER DEFAULT 0,
            uploader TEXT,
            extraData TEXT
          )`,
          (err: Error | null) => {
            if (err) {
              return reject(err)
            }
            // Create indexes to improve query performance
            const promises = [
              new Promise<void>((resolve, reject) => {
                this.db!.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_prefix ON ${this.tableName} (prefix)`, (err: Error | null) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve()
                  }
                })
              }),
              new Promise<void>((resolve, reject) => {
                this.db!.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON ${this.tableName} (name)`, (err: Error | null) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve()
                  }
                })
              }),
            ]
            Promise.all(promises)
              .then(() => {
                this.initialized = true
                resolve()
              })
              .catch(reject)
          }
        )
      })
    })
  }

  /**
   * Ensure the database is initialized.
   * @returns {Promise<void>}
   */
  async ensureInitialized (): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * Convert ChatPreset object to database record.
   * @param {ChatPreset} preset - The chat preset object.
   * @returns {Record<string, any>} Database record.
   */
  private _presetToRecord (preset: ChatPreset): Record<string, any> {
    // Extract main fields
    const {
      id,
      name,
      description,
      prefix,
      local,
      namespace,
      sendMessageOption,
      cloudId,
      createdAt,
      updatedAt,
      md5,
      embedded,
      uploader,
      ...rest
    } = preset
    return {
      id: id || '',
      name: name || '',
      description: description || '',
      prefix: prefix || '',
      local: local === false ? 0 : 1,
      namespace: namespace || null,
      sendMessageOption: JSON.stringify(sendMessageOption || {}),
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      uploader: uploader ? JSON.stringify(uploader) : null,
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
    }
  }

  /**
   * Convert database record to ChatPreset object.
   * @param {Record<string, any> | undefined} record - Database record.
   * @returns {ChatPreset | null} ChatPreset object.
   */
  private _recordToPreset (record: Record<string, any> | undefined): ChatPreset | null {
    if (!record) return null
    // Parse JSON fields
    let sendMessageOption: Record<string, any> = {}
    try {
      if (record.sendMessageOption) {
        sendMessageOption = JSON.parse(record.sendMessageOption)
      }
    } catch (e) {
      // Parsing error, use empty object
    }
    let uploader: any = null
    try {
      if (record.uploader) {
        uploader = JSON.parse(record.uploader)
      }
    } catch (e) {
      // Parsing error, use null
    }
    let extraData: Record<string, any> = {}
    try {
      if (record.extraData) {
        extraData = JSON.parse(record.extraData)
      }
    } catch (e) {
      // Parsing error, use empty object
    }
    // Construct ChatPreset object
    const presetData = {
      id: record.id,
      name: record.name,
      description: record.description,
      prefix: record.prefix,
      local: Boolean(record.local),
      namespace: record.namespace,
      sendMessageOption: SendMessageOption.create(sendMessageOption),
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      uploader,
      ...extraData,
    }
    return new ChatPreset(presetData)
  }

  /**
   * Get a single chat preset.
   * @param {string} key - Preset ID.
   * @returns {Promise<ChatPreset | null>}
   */
  async getItem (key: string): Promise<ChatPreset | null> {
    await this.ensureInitialized()
    return new Promise<ChatPreset | null>((resolve, reject) => {
      this.db!.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err: Error | null, row: any) => {
        if (err) {
          return reject(err)
        }
        const preset = this._recordToPreset(row)
        resolve(preset)
      })
    })
  }

  /**
   * Save a chat preset.
   * @param {string} id - Preset ID.
   * @param {ChatPreset} preset - Preset object.
   * @returns {Promise<string>}
   */
  async setItem (id: string, preset: ChatPreset): Promise<string> {
    await this.ensureInitialized()
    if (!id) {
      id = generateId()
    }
    // Add timestamps
    if (!preset.createdAt) {
      preset.createdAt = new Date().toISOString()
    }
    preset.updatedAt = new Date().toISOString()
    // Convert to database record
    const record = this._presetToRecord(preset)
    record.id = id // Ensure ID is the specified ID
    // Build insert or update SQL
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const updates = fields.map((field) => `${field} = ?`).join(', ')
    const values = fields.map((field) => record[field])
    const duplicateValues = [...values] // Used for ON CONFLICT update
    return new Promise<string>((resolve, reject) => {
      this.db!.run(
        `INSERT INTO ${this.tableName} (${fields.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
        [...values, ...duplicateValues],
        function (err: Error | null) {
          if (err) {
            return reject(err)
          }
          resolve(id)
        }
      )
    })
  }

  /**
   * Delete a chat preset.
   * @param {string} key - Preset ID.
   * @returns {Promise<void>}
   */
  async removeItem (key: string): Promise<void> {
    await this.ensureInitialized()
    return new Promise<void>((resolve, reject) => {
      this.db!.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [key], (err: Error | null) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * List all chat presets.
   * @returns {Promise<ChatPreset[]>}
   */
  async listItems (): Promise<ChatPreset[]> {
    await this.ensureInitialized()
    return new Promise<ChatPreset[]>((resolve, reject) => {
      this.db!.all(`SELECT * FROM ${this.tableName}`, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        const presets = rows.map((row) => this._recordToPreset(row)).filter(Boolean) as ChatPreset[]
        resolve(presets)
      })
    })
  }

  /**
   * List chat presets by equality filter.
   * @param {Record<string, unknown>} filter - Filter conditions.
   * @returns {Promise<ChatPreset[]>}
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<ChatPreset[]> {
    await this.ensureInitialized()
    // Return all if no filter
    if (!filter || Object.keys(filter).length === 0) {
      return this.listItems()
    }
    // Use SQL fields for direct filtering
    const directFields = ['id', 'name', 'description', 'prefix', 'namespace', 'cloudId']
    const sqlFilters: string[] = []
    const sqlParams: unknown[] = []
    const extraFilters: Record<string, unknown> = {}
    let hasExtraFilters = false
    // Differentiate between database fields and extra fields
    for (const key in filter) {
      const value = filter[key]
      if (directFields.includes(key)) {
        sqlFilters.push(`${key} = ?`)
        sqlParams.push(value)
      } else if (key === 'local') {
        // local field needs special handling for 0/1
        sqlFilters.push('local = ?')
        sqlParams.push(value ? 1 : 0)
      } else if (key === 'embedded') {
        // embedded field needs special handling for 0/1
        sqlFilters.push('embedded = ?')
        sqlParams.push(value ? 1 : 0)
      } else {
        // Other fields need to be filtered in memory
        extraFilters[key] = value
        hasExtraFilters = true
      }
    }
    // Build SQL query
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }
    return new Promise<ChatPreset[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        let presets = rows.map((row) => this._recordToPreset(row)).filter(Boolean) as ChatPreset[]
        // If there are extra fields to filter in memory
        if (hasExtraFilters) {
          presets = presets.filter((preset) => {
            for (const key in extraFilters) {
              const filterValue = extraFilters[key]
              // Handle deep filtering for sendMessageOption field
              if (key.startsWith('sendMessageOption.')) {
                const optionKey = key.split('.')[1]
                if (preset.sendMessageOption && (preset.sendMessageOption as unknown as Record<string, unknown>)[optionKey] !== filterValue) {
                  return false
                }
              } else if (preset[key as keyof ChatPreset] !== filterValue) {
                // Direct comparison for other fields
                return false
              }
            }
            return true
          })
        }
        resolve(presets)
      })
    })
  }

  /**
   * List chat presets by IN query.
   * @param {Array<{ field: string; values: unknown[] }>} query - Query conditions.
   * @returns {Promise<ChatPreset[]>}
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[] }>): Promise<ChatPreset[]> {
    await this.ensureInitialized()
    // Return all if no query
    if (!query || query.length === 0) {
      return this.listItems()
    }
    // Use SQL IN clause for optimization
    const directFields = ['id', 'name', 'description', 'prefix', 'namespace', 'cloudId']
    const sqlFilters: string[] = []
    const sqlParams: unknown[] = []
    const extraQueries: Array<{ field: string; values: unknown[] }> = []
    // Process each query condition
    for (const { field, values } of query) {
      if (values.length === 0) continue
      if (directFields.includes(field)) {
        const placeholders = values.map(() => '?').join(', ')
        sqlFilters.push(`${field} IN (${placeholders})`)
        sqlParams.push(...values)
      } else if (field === 'local') {
        // local field needs special handling
        const boolValues = values.map((v) => (v ? 1 : 0))
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`local IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else if (field === 'embedded') {
        // embedded field needs special handling
        const boolValues = values.map((v) => (v ? 1 : 0))
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`embedded IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else {
        // Other fields are filtered in memory
        extraQueries.push({ field, values })
      }
    }
    // Build SQL query
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }
    return new Promise<ChatPreset[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        let presets = rows.map((row) => this._recordToPreset(row)).filter(Boolean) as ChatPreset[]
        // If there are conditions to filter in memory
        if (extraQueries.length > 0) {
          presets = presets.filter((preset) => {
            for (const { field, values } of extraQueries) {
              // Handle deep filtering for sendMessageOption field
              if (field.startsWith('sendMessageOption.')) {
                const optionKey = field.split('.')[1]
                const presetValue = (preset.sendMessageOption as unknown as Record<string, unknown>)?.[optionKey]
                if (!values.includes(presetValue)) {
                  return false
                }
              } else if (!values.includes(preset[field as keyof ChatPreset])) {
                // Direct comparison for other fields
                return false
              }
            }
            return true
          })
        }
        resolve(presets)
      })
    })
  }

  /**
   * Get a chat preset by prefix.
   * @param {string} prefix - Prefix to search for.
   * @returns {Promise<ChatPreset | null>}
   */
  async getPresetByPrefix (prefix: string): Promise<ChatPreset | null> {
    await this.ensureInitialized()
    return new Promise<ChatPreset | null>((resolve, reject) => {
      this.db!.get(`SELECT * FROM ${this.tableName} WHERE prefix = ?`, [prefix], (err: Error | null, row: any) => {
        if (err) {
          return reject(err)
        }
        const preset = this._recordToPreset(row)
        resolve(preset)
      })
    })
  }

  /**
   * Clear all data in the table.
   * @returns {Promise<void>}
   */
  async clear (): Promise<void> {
    await this.ensureInitialized()
    return new Promise<void>((resolve, reject) => {
      this.db!.run(`DELETE FROM ${this.tableName}`, (err: Error | null) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * Close the database connection.
   * @returns {Promise<void>}
   */
  async close (): Promise<void> {
    if (!this.db) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      this.db!.close((err: Error | null) => {
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
