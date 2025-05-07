import { ChaiteStorage, ToolDTO } from 'chaite'
import sqlite3 from 'sqlite3'
import { Database } from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { generateId } from '../../../../utils/common.js'

/**
 * SQLiteToolsStorage extends ChaiteStorage for ToolDTO.
 * @extends {ChaiteStorage<ToolDTO>}
 */
export class SQLiteToolsStorage extends ChaiteStorage<ToolDTO> {
  private dbPath: string
  private db: Database | null
  private initialized: boolean
  private tableName: string

  getName (): string {
    return 'SQLiteToolsStorage'
  }

  /**
   * Constructor for SQLiteToolsStorage.
   * @param {string} dbPath - Path to the database file.
   */
  constructor (dbPath: string) {
    super()
    this.dbPath = dbPath
    this.db = null
    this.initialized = false
    this.tableName = 'tools'
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
        // Create tools table with main attributes as columns
        this.db!.run(
          `CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            modelType TEXT,
            code TEXT,
            cloudId INTEGER,
            embedded INTEGER,
            uploader TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            md5 TEXT,
            status TEXT,
            permission TEXT,
            extraData TEXT  -- Store other extra data as JSON
          )`,
          (err: Error | null) => {
            if (err) {
              reject(err)
            } else {
              // Create indexes to improve query performance
              this.db!.run(
                `CREATE INDEX IF NOT EXISTS idx_tools_name ON ${this.tableName} (name)`,
                (err: Error | null) => {
                  if (err) {
                    reject(err)
                  } else {
                    this.db!.run(
                      `CREATE INDEX IF NOT EXISTS idx_tools_status ON ${this.tableName} (status)`,
                      (err: Error | null) => {
                        if (err) {
                          reject(err)
                        } else {
                          this.db!.run(
                            `CREATE INDEX IF NOT EXISTS idx_tools_permission ON ${this.tableName} (permission)`,
                            (err: Error | null) => {
                              if (err) {
                                reject(err)
                              } else {
                                this.initialized = true
                                resolve()
                              }
                            }
                          )
                        }
                      }
                    )
                  }
                }
              )
            }
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
   * Convert ToolDTO object to database record.
   * @param {ToolDTO} tool - The tool DTO.
   * @returns {Object} Database record.
   */
  private _toolToRecord (tool: ToolDTO): Record<string, any> {
    // Extract main fields, put the rest into extraData
    const {
      id,
      name,
      description,
      modelType,
      code,
      cloudId,
      embedded,
      uploader,
      createdAt,
      updatedAt,
      md5,
      status,
      permission,
      ...rest
    } = tool
    // Serialize uploader object
    const uploaderStr = uploader ? JSON.stringify(uploader) : null
    return {
      id: id || '',
      name: name || '',
      description: description || '',
      modelType: modelType || '',
      code: code || null,
      cloudId: cloudId || null,
      embedded: embedded ? 1 : 0,
      uploader: uploaderStr,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      status: status || 'enabled',
      permission: permission || 'public',
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
    }
  }

  /**
   * Convert database record to ToolDTO object.
   * @param {Object} record - Database record.
   * @returns {ToolDTO | null} ToolDTO object.
   */
  private _recordToTool (record: Record<string, any> | undefined): ToolDTO | null {
    // Return null if record does not exist
    if (!record) return null
    // Parse uploader
    let uploader: any = null
    try {
      if (record.uploader) {
        uploader = JSON.parse(record.uploader)
      }
    } catch (e) {
      // Parsing error, use null
    }
    // Parse extra data
    let extraData: Record<string, any> = {}
    try {
      if (record.extraData) {
        extraData = JSON.parse(record.extraData)
      }
    } catch (e) {
      // Parsing error, use empty object
    }
    // Construct basic object
    const toolData = {
      id: record.id,
      name: record.name,
      description: record.description,
      modelType: record.modelType,
      code: record.code,
      cloudId: record.cloudId,
      embedded: Boolean(record.embedded),
      uploader,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      status: record.status,
      permission: record.permission,
      ...extraData,
    }
    return new ToolDTO(toolData)
  }

  /**
   * Get a single tool.
   * @param {string} key - Tool ID.
   * @returns {Promise<ToolDTO | null>}
   */
  async getItem (key: string): Promise<ToolDTO | null> {
    await this.ensureInitialized()
    return new Promise<ToolDTO | null>((resolve, reject) => {
      this.db!.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err: Error | null, row: any) => {
        if (err) {
          return reject(err)
        }
        const tool = this._recordToTool(row)
        resolve(tool)
      })
    })
  }

  /**
   * Save a tool.
   * @param {string} id - Tool ID.
   * @param {ToolDTO} tool - Tool object.
   * @returns {Promise<string>}
   */
  async setItem (id: string, tool: ToolDTO): Promise<string> {
    await this.ensureInitialized()
    if (!id) {
      id = generateId()
    }
    // Add timestamps
    if (!tool.createdAt) {
      tool.createdAt = new Date().toISOString()
    }
    tool.updatedAt = new Date().toISOString()
    // Convert to database record
    const record = this._toolToRecord(tool)
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
   * Delete a tool.
   * @param {string} key - Tool ID.
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
   * List all tools.
   * @returns {Promise<ToolDTO[]>}
   */
  async listItems (): Promise<ToolDTO[]> {
    await this.ensureInitialized()
    return new Promise<ToolDTO[]>((resolve, reject) => {
      this.db!.all(`SELECT * FROM ${this.tableName}`, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        const tools = rows.map((row) => this._recordToTool(row)).filter(Boolean) as ToolDTO[]
        resolve(tools)
      })
    })
  }

  /**
   * List tools by equality filter (using SQL queries to avoid full table scans).
   * @param {Record<string, unknown>} filter - Filter conditions.
   * @returns {Promise<ToolDTO[]>}
   */
  async listItemsByEqFilter (filter: Record<string, unknown>): Promise<ToolDTO[]> {
    await this.ensureInitialized()
    // Return all if no filter
    if (!filter || Object.keys(filter).length === 0) {
      return this.listItems()
    }
    // Use SQL fields for direct filtering
    const directFields = ['id', 'name', 'description', 'modelType', 'cloudId', 'status', 'permission']
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
      } else if (key === 'embedded') {
        sqlFilters.push('embedded = ?')
        sqlParams.push(value ? 1 : 0)
      } else {
        extraFilters[key] = value
        hasExtraFilters = true
      }
    }
    // Build SQL query
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }
    return new Promise<ToolDTO[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        let tools = rows.map((row) => this._recordToTool(row)).filter(Boolean) as ToolDTO[]
        // If there are extra fields to filter in memory
        if (hasExtraFilters) {
          tools = tools.filter((tool) => {
            for (const key in extraFilters) {
              if (tool[key as keyof ToolDTO] !== extraFilters[key]) {
                return false
              }
            }
            return true
          })
        }
        resolve(tools)
      })
    })
  }

  /**
   * List tools by IN query.
   * @param {Array<{ field: string; values: unknown[] }>} query - Query conditions.
   * @returns {Promise<ToolDTO[]>}
   */
  async listItemsByInQuery (query: Array<{ field: string; values: unknown[] }>): Promise<ToolDTO[]> {
    await this.ensureInitialized()
    // Return all if no query
    if (!query || query.length === 0) {
      return this.listItems()
    }
    // Use SQL IN clause for optimization
    const directFields = ['id', 'name', 'description', 'modelType', 'cloudId', 'status', 'permission']
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
      } else if (field === 'embedded') {
        const boolValues = values.map((v) => (v ? 1 : 0))
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`embedded IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else {
        extraQueries.push({ field, values })
      }
    }
    // Build SQL query
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }
    return new Promise<ToolDTO[]>((resolve, reject) => {
      this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject(err)
        }
        let tools = rows.map((row) => this._recordToTool(row)).filter(Boolean) as ToolDTO[]
        // If there are conditions to filter in memory
        if (extraQueries.length > 0) {
          tools = tools.filter((tool) => {
            for (const { field, values } of extraQueries) {
              if (!values.includes(tool[field as keyof ToolDTO])) {
                return false
              }
            }
            return true
          })
        }
        resolve(tools)
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
