import { ChaiteStorage, ToolsGroupDTO } from 'chaite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { generateId } from '../../../../utils/common.js';
/**
 * SQLiteToolsGroupStorage extends ChaiteStorage for ToolsGroupDTO.
 * @extends {ChaiteStorage<ToolsGroupDTO>}
 */
export class SQLiteToolsGroupStorage extends ChaiteStorage {
    dbPath;
    db;
    initialized;
    tableName;
    getName() {
        return 'SQLiteToolsGroupStorage';
    }
    /**
     * Constructor for SQLiteToolsGroupStorage.
     * @param {string} dbPath - Path to the database file.
     */
    constructor(dbPath) {
        super();
        this.dbPath = dbPath;
        this.db = null;
        this.initialized = false;
        this.tableName = 'tools_groups';
    }
    /**
     * Initialize the database connection and table structure.
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized)
            return;
        return new Promise((resolve, reject) => {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err)
                    return reject(err);
                try {
                    // First check if table exists
                    const tableExists = await this.checkTableExists();
                    if (tableExists) {
                        // If table exists, check and migrate old structure if needed
                        await this.migrateTableIfNeeded();
                    }
                    else {
                        // If table does not exist, create a new table
                        await this.createTable();
                    }
                    // Ensure indexes exist
                    await this.ensureIndex();
                    this.initialized = true;
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Check if the table exists.
     * @returns {Promise<boolean>}
     */
    async checkTableExists() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=?', [this.tableName], (err, row) => {
                if (err)
                    return reject(err);
                resolve(!!row);
            });
        });
    }
    /**
     * Create a new table.
     * @returns {Promise<void>}
     */
    async createTable() {
        return new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          toolIds TEXT NOT NULL,
          isDefault INTEGER DEFAULT 0,
          createdAt TEXT,
          updatedAt TEXT
        )`, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    /**
     * Ensure indexes exist.
     * @returns {Promise<void>}
     */
    async ensureIndex() {
        return new Promise((resolve, reject) => {
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_tools_groups_name ON ${this.tableName} (name)`, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    /**
     * Check and migrate table structure if needed.
     * @returns {Promise<void>}
     */
    async migrateTableIfNeeded() {
        // Check table structure
        const columns = await this.getTableColumns();
        // Check for old structure (has 'tools' field instead of 'toolIds')
        const hasOldStructure = columns.includes('tools') && !columns.includes('toolIds');
        const needsDefaultColumn = !columns.includes('isDefault');
        if (hasOldStructure || needsDefaultColumn) {
            console.log(`Detected old table structure, starting migration for ${this.tableName} table...`);
            // Backup all data
            const allData = await this.backupData();
            // Rename old table
            await this.renameTable(`${this.tableName}_old`);
            // Create new table
            await this.createTable();
            await this.ensureIndex();
            // Restore data to new table
            if (allData.length > 0) {
                await this.restoreData(allData, hasOldStructure);
            }
            // Drop old table
            await this.dropTable(`${this.tableName}_old`);
            console.log(`Table ${this.tableName} migration completed, migrated ${allData.length} records`);
        }
    }
    /**
     * Get all column names of the table.
     * @returns {Promise<string[]>}
     */
    async getTableColumns() {
        return new Promise((resolve, reject) => {
            this.db.all(`PRAGMA table_info(${this.tableName})`, (err, rows) => {
                if (err)
                    return reject(err);
                const columns = rows.map((row) => row.name);
                resolve(columns);
            });
        });
    }
    /**
     * Backup table data.
     * @returns {Promise<any[]>}
     */
    async backupData() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM ${this.tableName}`, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }
    /**
     * Rename table.
     * @param {string} newName - New table name.
     * @returns {Promise<void>}
     */
    async renameTable(newName) {
        return new Promise((resolve, reject) => {
            this.db.run(`ALTER TABLE ${this.tableName} RENAME TO ${newName}`, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    /**
     * Drop table.
     * @param {string} tableName - Table name to drop.
     * @returns {Promise<void>}
     */
    async dropTable(tableName) {
        return new Promise((resolve, reject) => {
            this.db.run(`DROP TABLE IF EXISTS ${tableName}`, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    /**
     * Restore data to new table.
     * @param {any[]} data - Data to restore.
     * @param {boolean} hasOldStructure - Whether the data has old structure.
     * @returns {Promise<void>}
     */
    async restoreData(data, hasOldStructure) {
        const promises = data.map((row) => {
            return new Promise((resolve, reject) => {
                // Handle data conversion
                const newRow = { ...row };
                if (hasOldStructure && row.tools) {
                    try {
                        // Extract toolIds from old tools structure
                        const tools = JSON.parse(row.tools);
                        newRow.toolIds = JSON.stringify(tools.map((t) => t.id || t));
                        delete newRow.tools;
                    }
                    catch (e) {
                        console.error(`Error parsing tools group data: ${row.id}`, e);
                        newRow.toolIds = JSON.stringify([]);
                        delete newRow.tools;
                    }
                }
                // Add isDefault field
                if (newRow.isDefault === undefined) {
                    newRow.isDefault = 0;
                }
                // Add timestamps
                if (!newRow.createdAt) {
                    newRow.createdAt = new Date().toISOString();
                }
                if (!newRow.updatedAt) {
                    newRow.updatedAt = new Date().toISOString();
                }
                const fields = Object.keys(newRow);
                const placeholders = fields.map(() => '?').join(',');
                const values = fields.map((field) => newRow[field]);
                this.db.run(`INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${placeholders})`, values, (err) => {
                    if (err)
                        return reject(err);
                    resolve();
                });
            });
        });
        await Promise.all(promises);
    }
    /**
     * Ensure the database is initialized.
     * @returns {Promise<void>}
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    /**
     * Get a tools group.
     * @param {string} key - Tools group ID.
     * @returns {Promise<ToolsGroupDTO | null>}
     */
    async getItem(key) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err, row) => {
                if (err)
                    return reject(err);
                if (!row)
                    return resolve(null);
                try {
                    const toolsGroup = {
                        ...row,
                        toolIds: JSON.parse(row.toolIds),
                        isDefault: Boolean(row.isDefault),
                    };
                    resolve(new ToolsGroupDTO(toolsGroup));
                }
                catch (e) {
                    console.error(`Error parsing tools group data: ${key}`, e);
                    resolve(new ToolsGroupDTO({
                        ...row,
                        toolIds: [],
                        isDefault: Boolean(row.isDefault),
                    }));
                }
            });
        });
    }
    /**
     * Save a tools group.
     * @param {string} id - Tools group ID.
     * @param {ToolsGroupDTO} data - Tools group data.
     * @returns {Promise<string>}
     */
    async setItem(id, data) {
        await this.ensureInitialized();
        if (!id) {
            id = generateId();
        }
        // Add timestamps
        if (!data.createdAt) {
            data.createdAt = new Date().toISOString();
        }
        data.updatedAt = new Date().toISOString();
        // Extract tools group data
        const { name, description, toolIds, isDefault } = data;
        const updatedAt = new Date().toISOString();
        // Serialize tool IDs list to JSON string
        const toolIdsJson = JSON.stringify(toolIds || []);
        const isDefaultValue = isDefault ? 1 : 0;
        return new Promise((resolve, reject) => {
            // Check if tools group already exists
            this.db.get(`SELECT id FROM ${this.tableName} WHERE id = ?`, [id], (err, row) => {
                if (err) {
                    return reject(err);
                }
                if (row) {
                    // Update existing tools group
                    this.db.run(`UPDATE ${this.tableName} SET name = ?, description = ?, toolIds = ?, isDefault = ?, updatedAt = ? WHERE id = ?`, [name, description, toolIdsJson, isDefaultValue, updatedAt, id], (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(id);
                    });
                }
                else {
                    // Insert new tools group
                    this.db.run(`INSERT INTO ${this.tableName} (id, name, description, toolIds, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, name, description, toolIdsJson, isDefaultValue, data.createdAt, updatedAt], (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(id);
                    });
                }
            });
        });
    }
    /**
     * Delete a tools group.
     * @param {string} key - Tools group ID.
     * @returns {Promise<void>}
     */
    async removeItem(key) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [key], function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    /**
     * Get all tools groups.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    async listItems() {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM ${this.tableName}`, (err, rows) => {
                if (err) {
                    return reject(err);
                }
                const toolsGroups = rows.map((row) => {
                    try {
                        return new ToolsGroupDTO({
                            ...row,
                            toolIds: JSON.parse(row.toolIds),
                            isDefault: Boolean(row.isDefault),
                        });
                    }
                    catch (e) {
                        console.error(`Error parsing tools group data: ${row.id}`, e);
                        return new ToolsGroupDTO({
                            ...row,
                            toolIds: [],
                            isDefault: Boolean(row.isDefault),
                        });
                    }
                });
                resolve(toolsGroups);
            });
        });
    }
    /**
     * List tools groups by equality filter.
     * @param {Record<string, unknown>} filter - Filter conditions.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    async listItemsByEqFilter(filter) {
        await this.ensureInitialized();
        if (!filter || Object.keys(filter).length === 0) {
            return this.listItems();
        }
        const directFields = ['id', 'name', 'description'];
        const conditions = [];
        const params = [];
        for (const key in filter) {
            if (directFields.includes(key)) {
                conditions.push(`${key} = ?`);
                params.push(filter[key]);
            }
            else if (key === 'isDefault') {
                conditions.push('isDefault = ?');
                params.push(filter[key] ? 1 : 0);
            }
        }
        const sql = conditions.length > 0
            ? `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`
            : `SELECT * FROM ${this.tableName}`;
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    return reject(err);
                const toolsGroups = rows.map((row) => {
                    try {
                        const group = {
                            ...row,
                            toolIds: JSON.parse(row.toolIds || '[]'),
                            isDefault: Boolean(row.isDefault),
                        };
                        // Filter other fields
                        for (const key in filter) {
                            if (!directFields.includes(key) &&
                                key !== 'isDefault' &&
                                JSON.stringify(group[key]) !== JSON.stringify(filter[key])) {
                                return null;
                            }
                        }
                        return new ToolsGroupDTO(group);
                    }
                    catch (e) {
                        console.error(`Error parsing tools group data: ${row.id}`, e);
                        return null;
                    }
                }).filter(Boolean);
                resolve(toolsGroups);
            });
        });
    }
    /**
     * List tools groups by IN query.
     * @param {Array<{field: string, values: unknown[]}>} query - IN query conditions.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    async listItemsByInQuery(query) {
        await this.ensureInitialized();
        if (!query || query.length === 0) {
            return this.listItems();
        }
        const directFields = ['id', 'name', 'description'];
        const conditions = [];
        const params = [];
        const memoryQueries = [];
        for (const item of query) {
            if (directFields.includes(item.field) && Array.isArray(item.values) && item.values.length > 0) {
                const placeholders = item.values.map(() => '?').join(',');
                conditions.push(`${item.field} IN (${placeholders})`);
                params.push(...item.values);
            }
            else if (item.field === 'isDefault' && Array.isArray(item.values) && item.values.length > 0) {
                const boolValues = item.values.map((v) => (v ? 1 : 0));
                const placeholders = boolValues.map(() => '?').join(',');
                conditions.push(`isDefault IN (${placeholders})`);
                params.push(...boolValues);
            }
            else if (item.values.length > 0) {
                memoryQueries.push(item);
            }
        }
        const sql = conditions.length > 0
            ? `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`
            : `SELECT * FROM ${this.tableName}`;
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    return reject(err);
                let toolsGroups = rows.map((row) => {
                    try {
                        return {
                            ...row,
                            toolIds: JSON.parse(row.toolIds || '[]'),
                            isDefault: Boolean(row.isDefault),
                        };
                    }
                    catch (e) {
                        console.error(`Error parsing tools group data: ${row.id}`, e);
                        return null;
                    }
                }).filter(Boolean);
                // Filter other fields in memory
                if (memoryQueries.length > 0) {
                    toolsGroups = toolsGroups.filter((group) => {
                        for (const { field, values } of memoryQueries) {
                            // Special handling for toolIds field
                            if (field === 'toolIds') {
                                const hasMatch = values.some((toolId) => group.toolIds.includes(toolId));
                                if (!hasMatch)
                                    return false;
                            }
                            else if (!values.includes(group[field])) {
                                return false;
                            }
                        }
                        return true;
                    });
                }
                resolve(toolsGroups.map((group) => new ToolsGroupDTO(group)));
            });
        });
    }
    /**
     * Clear all tools groups.
     * @returns {Promise<void>}
     */
    async clear() {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM ${this.tableName}`, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    /**
     * Close the database connection.
     * @returns {Promise<void>}
     */
    async close() {
        if (!this.db)
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.initialized = false;
                    this.db = null;
                    resolve();
                }
            });
        });
    }
}
