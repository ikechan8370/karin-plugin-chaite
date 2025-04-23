import { ChaiteStorage, ToolsGroupDTO } from 'chaite';
/**
 * SQLiteToolsGroupStorage extends ChaiteStorage for ToolsGroupDTO.
 * @extends {ChaiteStorage<ToolsGroupDTO>}
 */
export declare class SQLiteToolsGroupStorage extends ChaiteStorage<ToolsGroupDTO> {
    private dbPath;
    private db;
    private initialized;
    private tableName;
    getName(): string;
    /**
     * Constructor for SQLiteToolsGroupStorage.
     * @param {string} dbPath - Path to the database file.
     */
    constructor(dbPath: string);
    /**
     * Initialize the database connection and table structure.
     * @returns {Promise<void>}
     */
    initialize(): Promise<void>;
    /**
     * Check if the table exists.
     * @returns {Promise<boolean>}
     */
    checkTableExists(): Promise<boolean>;
    /**
     * Create a new table.
     * @returns {Promise<void>}
     */
    createTable(): Promise<void>;
    /**
     * Ensure indexes exist.
     * @returns {Promise<void>}
     */
    ensureIndex(): Promise<void>;
    /**
     * Check and migrate table structure if needed.
     * @returns {Promise<void>}
     */
    migrateTableIfNeeded(): Promise<void>;
    /**
     * Get all column names of the table.
     * @returns {Promise<string[]>}
     */
    getTableColumns(): Promise<string[]>;
    /**
     * Backup table data.
     * @returns {Promise<any[]>}
     */
    backupData(): Promise<any[]>;
    /**
     * Rename table.
     * @param {string} newName - New table name.
     * @returns {Promise<void>}
     */
    renameTable(newName: string): Promise<void>;
    /**
     * Drop table.
     * @param {string} tableName - Table name to drop.
     * @returns {Promise<void>}
     */
    dropTable(tableName: string): Promise<void>;
    /**
     * Restore data to new table.
     * @param {any[]} data - Data to restore.
     * @param {boolean} hasOldStructure - Whether the data has old structure.
     * @returns {Promise<void>}
     */
    restoreData(data: any[], hasOldStructure: boolean): Promise<void>;
    /**
     * Ensure the database is initialized.
     * @returns {Promise<void>}
     */
    ensureInitialized(): Promise<void>;
    /**
     * Get a tools group.
     * @param {string} key - Tools group ID.
     * @returns {Promise<ToolsGroupDTO | null>}
     */
    getItem(key: string): Promise<ToolsGroupDTO | null>;
    /**
     * Save a tools group.
     * @param {string} id - Tools group ID.
     * @param {ToolsGroupDTO} data - Tools group data.
     * @returns {Promise<string>}
     */
    setItem(id: string, data: ToolsGroupDTO): Promise<string>;
    /**
     * Delete a tools group.
     * @param {string} key - Tools group ID.
     * @returns {Promise<void>}
     */
    removeItem(key: string): Promise<void>;
    /**
     * Get all tools groups.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    listItems(): Promise<ToolsGroupDTO[]>;
    /**
     * List tools groups by equality filter.
     * @param {Record<string, unknown>} filter - Filter conditions.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ToolsGroupDTO[]>;
    /**
     * List tools groups by IN query.
     * @param {Array<{field: string, values: unknown[]}>} query - IN query conditions.
     * @returns {Promise<ToolsGroupDTO[]>}
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ToolsGroupDTO[]>;
    /**
     * Clear all tools groups.
     * @returns {Promise<void>}
     */
    clear(): Promise<void>;
    /**
     * Close the database connection.
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
}
