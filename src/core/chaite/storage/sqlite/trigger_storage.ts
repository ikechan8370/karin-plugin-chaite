import { ChaiteStorage, TriggerDTO } from 'chaite';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { generateId } from '../../../../utils/common.js';

/**
 * SQLiteTriggerStorage extends ChaiteStorage for TriggerDTO.
 * @extends {ChaiteStorage<TriggerDTO>}
 */
export class SQLiteTriggerStorage extends ChaiteStorage<TriggerDTO> {
    private dbPath: string;
    private db: Database | null;
    private initialized: boolean;
    private tableName: string;

    getName(): string {
        return 'SQLiteTriggerStorage';
    }

    /**
     * Constructor for SQLiteTriggerStorage.
     * @param {string} dbPath - 数据库文件路径.
     */
    constructor(dbPath: string) {
        super();
        this.dbPath = dbPath;
        this.db = null;
        this.initialized = false;
        this.tableName = 'triggers';
    }

    /**
     * 初始化数据库连接和表结构.
     * @returns {Promise<void>}
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        return new Promise<void>((resolve, reject) => {
            // 确保目录存在
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, async (err: Error | null) => {
                if (err) {
                    return reject(err);
                }

                // 创建触发器表，将主要属性分列存储
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
            isOneTime INTEGER,
            extraData TEXT  -- 存储其他额外数据的JSON
          )`,
                    (err: Error | null) => {
                        if (err) {
                            reject(err);
                        } else {
                            // 创建索引以提高查询性能
                            this.db!.run(
                                `CREATE INDEX IF NOT EXISTS idx_triggers_name ON ${this.tableName} (name)`,
                                (err: Error | null) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        this.db!.run(
                                            `CREATE INDEX IF NOT EXISTS idx_triggers_status ON ${this.tableName} (status)`,
                                            (err: Error | null) => {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    this.initialized = true;
                                                    resolve();
                                                }
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    }
                );
            });
        });
    }

    /**
     * 确保数据库已初始化.
     * @returns {Promise<void>}
     */
    async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * 将 TriggerDTO 对象转换为数据库记录.
     * @param {TriggerDTO} trigger - 触发器DTO.
     * @returns {Record<string, any>} 数据库记录.
     */
    private _triggerToRecord(trigger: TriggerDTO): Record<string, any> {
        // 提取主要字段，剩余的放入extraData
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
            isOneTime,
            ...rest
        } = trigger;

        // 序列化上传者对象
        const uploaderStr = uploader ? JSON.stringify(uploader) : null;

        return {
            id: id || '',
            name: name || '',
            description: description || '',
            modelType: modelType || 'executable',
            code: code || null,
            cloudId: cloudId || null,
            embedded: embedded ? 1 : 0,
            uploader: uploaderStr,
            createdAt: createdAt || '',
            updatedAt: updatedAt || '',
            md5: md5 || '',
            status: status || 'enabled',
            isOneTime: isOneTime ? 1 : 0,
            extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
        };
    }

    /**
     * 将数据库记录转换为 TriggerDTO 对象.
     * @param {Record<string, any> | undefined} record - 数据库记录.
     * @returns {TriggerDTO | null} TriggerDTO对象.
     */
    private _recordToTrigger(record: Record<string, any> | undefined): TriggerDTO | null {
        // 若记录不存在则返回null
        if (!record) return null;

        // 解析上传者
        let uploader: any = null;
        try {
            if (record.uploader) {
                uploader = JSON.parse(record.uploader);
            }
        } catch (e) {
            // 解析错误，使用null
        }

        // 解析额外数据
        let extraData: Record<string, any> = {};
        try {
            if (record.extraData) {
                extraData = JSON.parse(record.extraData);
            }
        } catch (e) {
            // 解析错误，使用空对象
        }

        // 构造基本对象
        const triggerData = {
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
            isOneTime: Boolean(record.isOneTime),
            ...extraData,
        };

        return new TriggerDTO(triggerData);
    }

    /**
     * 获取单个触发器.
     * @param {string} key - 触发器ID.
     * @returns {Promise<TriggerDTO | null>}
     */
    async getItem(key: string): Promise<TriggerDTO | null> {
        await this.ensureInitialized();

        return new Promise<TriggerDTO | null>((resolve, reject) => {
            this.db!.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err: Error | null, row: any) => {
                if (err) {
                    return reject(err);
                }

                const trigger = this._recordToTrigger(row);
                resolve(trigger);
            });
        });
    }

    /**
     * 保存触发器.
     * @param {string} id - 触发器ID.
     * @param {TriggerDTO} trigger - 触发器对象.
     * @returns {Promise<string>}
     */
    async setItem(id: string, trigger: TriggerDTO): Promise<string> {
        await this.ensureInitialized();

        if (!id) {
            id = generateId();
        }

        // 加上时间戳
        if (!trigger.createdAt) {
            trigger.createdAt = new Date().toISOString();
        }

        trigger.updatedAt = new Date().toISOString();

        // 转换为数据库记录
        const record = this._triggerToRecord(trigger);
        record.id = id; // 确保ID是指定的ID

        // 构建插入或更新SQL
        const fields = Object.keys(record);
        const placeholders = fields.map(() => '?').join(', ');
        const updates = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((field) => record[field]);
        const duplicateValues = [...values]; // 用于ON CONFLICT时的更新

        return new Promise<string>((resolve, reject) => {
            this.db!.run(
                `INSERT INTO ${this.tableName} (${fields.join(', ')}) 
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
                [...values, ...duplicateValues],
                function (err: Error | null) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(id);
                }
            );
        });
    }

    /**
     * 删除触发器.
     * @param {string} key - 触发器ID.
     * @returns {Promise<void>}
     */
    async removeItem(key: string): Promise<void> {
        await this.ensureInitialized();

        return new Promise<void>((resolve, reject) => {
            this.db!.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [key], (err: Error | null) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * 获取所有触发器.
     * @returns {Promise<TriggerDTO[]>}
     */
    async listItems(): Promise<TriggerDTO[]> {
        await this.ensureInitialized();

        return new Promise<TriggerDTO[]>((resolve, reject) => {
            this.db!.all(`SELECT * FROM ${this.tableName}`, (err: Error | null, rows: any[]) => {
                if (err) {
                    return reject(err);
                }
                const triggers = rows.map((row) => this._recordToTrigger(row)).filter(Boolean) as TriggerDTO[];
                resolve(triggers);
            });
        });
    }

    /**
     * 根据相等条件筛选触发器（使用SQL查询以避免全表扫描）.
     * @param {Record<string, unknown>} filter - 过滤条件.
     * @returns {Promise<TriggerDTO[]>}
     */
    async listItemsByEqFilter(filter: Record<string, unknown>): Promise<TriggerDTO[]> {
        await this.ensureInitialized();

        // 如果没有过滤条件，返回所有项
        if (!filter || Object.keys(filter).length === 0) {
            return this.listItems();
        }

        // 使用SQL字段直接过滤
        const directFields = ['id', 'name', 'description', 'modelType', 'cloudId', 'status', 'permission'];
        const sqlFilters: string[] = [];
        const sqlParams: unknown[] = [];
        const extraFilters: Record<string, unknown> = {};
        let hasExtraFilters = false;

        // 区分数据库字段和额外字段
        for (const key in filter) {
            const value = filter[key];
            if (directFields.includes(key)) {
                sqlFilters.push(`${key} = ?`);
                sqlParams.push(value);
            } else if (key === 'embedded') {
                sqlFilters.push('embedded = ?');
                sqlParams.push(value ? 1 : 0);
            } else if (key === 'isOneTime') {
                sqlFilters.push('isOneTime = ?');
                sqlParams.push(value ? 1 : 0);
            } else {
                extraFilters[key] = value;
                hasExtraFilters = true;
            }
        }

        // 构建SQL查询
        let sql = `SELECT * FROM ${this.tableName}`;
        if (sqlFilters.length > 0) {
            sql += ` WHERE ${sqlFilters.join(' AND ')}`;
        }

        return new Promise<TriggerDTO[]>((resolve, reject) => {
            this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
                if (err) {
                    return reject(err);
                }

                let triggers = rows.map((row) => this._recordToTrigger(row)).filter(Boolean) as TriggerDTO[];

                // 如果有额外字段需要在内存中过滤
                if (hasExtraFilters) {
                    triggers = triggers.filter((trigger) => {
                        for (const key in extraFilters) {
                            if (trigger[key as keyof TriggerDTO] !== extraFilters[key]) {
                                return false;
                            }
                        }
                        return true;
                    });
                }

                resolve(triggers);
            });
        });
    }

    /**
     * 根据IN条件查询触发器.
     * @param {Array<{ field: string; values: unknown[] }>} query - 查询条件.
     * @returns {Promise<TriggerDTO[]>}
     */
    async listItemsByInQuery(query: Array<{ field: string; values: unknown[] }>): Promise<TriggerDTO[]> {
        await this.ensureInitialized();

        // 如果没有查询条件，返回所有项
        if (!query || query.length === 0) {
            return this.listItems();
        }

        // 使用SQL IN子句进行优化
        const directFields = ['id', 'name', 'description', 'modelType', 'cloudId', 'status', 'permission'];
        const sqlFilters: string[] = [];
        const sqlParams: unknown[] = [];
        const extraQueries: Array<{ field: string; values: unknown[] }> = [];

        // 处理每个查询条件
        for (const { field, values } of query) {
            if (values.length === 0) continue;

            if (directFields.includes(field)) {
                const placeholders = values.map(() => '?').join(', ');
                sqlFilters.push(`${field} IN (${placeholders})`);
                sqlParams.push(...values);
            } else if (field === 'embedded') {
                const boolValues = values.map((v) => (v ? 1 : 0));
                const placeholders = boolValues.map(() => '?').join(', ');
                sqlFilters.push(`embedded IN (${placeholders})`);
                sqlParams.push(...boolValues);
            } else if (field === 'isOneTime') {
                const boolValues = values.map((v) => (v ? 1 : 0));
                const placeholders = boolValues.map(() => '?').join(', ');
                sqlFilters.push(`isOneTime IN (${placeholders})`);
                sqlParams.push(...boolValues);
            } else {
                extraQueries.push({ field, values });
            }
        }

        // 构建SQL查询
        let sql = `SELECT * FROM ${this.tableName}`;
        if (sqlFilters.length > 0) {
            // ... existing code ...
            sql += ` WHERE ${sqlFilters.join(' AND ')}`;
        }

        return new Promise<TriggerDTO[]>((resolve, reject) => {
            this.db!.all(sql, sqlParams, (err: Error | null, rows: any[]) => {
                if (err) {
                    return reject(err);
                }

                let triggers = rows.map((row) => this._recordToTrigger(row)).filter(Boolean) as TriggerDTO[];

                // 如果有额外字段需要在内存中过滤
                if (extraQueries.length > 0) {
                    triggers = triggers.filter((trigger) => {
                        for (const { field, values } of extraQueries) {
                            const value = trigger[field as keyof TriggerDTO];
                            if (!values.includes(value)) {
                                return false;
                            }
                        }
                        return true;
                    });
                }

                resolve(triggers);
            });
        });
    }

    /**
     * 清空所有触发器.
     * @returns {Promise<void>}
     */
    async clear(): Promise<void> {
        await this.ensureInitialized();

        return new Promise<void>((resolve, reject) => {
            this.db!.run(`DELETE FROM ${this.tableName}`, (err: Error | null) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

export default SQLiteTriggerStorage;