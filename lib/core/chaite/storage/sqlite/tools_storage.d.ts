import { ChaiteStorage, ToolDTO } from 'chaite';
/**
 * SQLiteToolsStorage extends ChaiteStorage for ToolDTO.
 * @extends {ChaiteStorage<ToolDTO>}
 */
export declare class SQLiteToolsStorage extends ChaiteStorage<ToolDTO> {
    private dbPath;
    private db;
    private initialized;
    private tableName;
    getName(): string;
    /**
     * Constructor for SQLiteToolsStorage.
     * @param {string} dbPath - Path to the database file.
     */
    constructor(dbPath: string);
    /**
     * Initialize the database connection and table structure.
     * @returns {Promise<void>}
     */
    initialize(): Promise<void>;
    /**
     * Ensure the database is initialized.
     * @returns {Promise<void>}
     */
    ensureInitialized(): Promise<void>;
    /**
     * Convert ToolDTO object to database record.
     * @param {ToolDTO} tool - The tool DTO.
     * @returns {Object} Database record.
     */
    private _toolToRecord;
    /**
     * Convert database record to ToolDTO object.
     * @param {Object} record - Database record.
     * @returns {ToolDTO | null} ToolDTO object.
     */
    private _recordToTool;
    /**
     * Get a single tool.
     * @param {string} key - Tool ID.
     * @returns {Promise<ToolDTO | null>}
     */
    getItem(key: string): Promise<ToolDTO | null>;
    /**
     * Save a tool.
     * @param {string} id - Tool ID.
     * @param {ToolDTO} tool - Tool object.
     * @returns {Promise<string>}
     */
    setItem(id: string, tool: ToolDTO): Promise<string>;
    /**
     * Delete a tool.
     * @param {string} key - Tool ID.
     * @returns {Promise<void>}
     */
    removeItem(key: string): Promise<void>;
    /**
     * List all tools.
     * @returns {Promise<ToolDTO[]>}
     */
    listItems(): Promise<ToolDTO[]>;
    /**
     * List tools by equality filter (using SQL queries to avoid full table scans).
     * @param {Record<string, unknown>} filter - Filter conditions.
     * @returns {Promise<ToolDTO[]>}
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ToolDTO[]>;
    /**
     * List tools by IN query.
     * @param {Array<{ field: string; values: unknown[] }>} query - Query conditions.
     * @returns {Promise<ToolDTO[]>}
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ToolDTO[]>;
    /**
     * Clear all data in the table.
     * @returns {Promise<void>}
     */
    clear(): Promise<void>;
    /**
     * Close the database connection.
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
}
