import { ChaiteStorage, ChatPreset } from 'chaite';
/**
 * SQLiteChatPresetStorage extends ChaiteStorage for ChatPreset.
 * @extends {ChaiteStorage<ChatPreset>}
 */
export declare class SQLiteChatPresetStorage extends ChaiteStorage<ChatPreset> {
    private dbPath;
    private db;
    private initialized;
    private tableName;
    getName(): string;
    /**
     * Constructor for SQLiteChatPresetStorage.
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
     * Convert ChatPreset object to database record.
     * @param {ChatPreset} preset - The chat preset object.
     * @returns {Record<string, any>} Database record.
     */
    private _presetToRecord;
    /**
     * Convert database record to ChatPreset object.
     * @param {Record<string, any> | undefined} record - Database record.
     * @returns {ChatPreset | null} ChatPreset object.
     */
    private _recordToPreset;
    /**
     * Get a single chat preset.
     * @param {string} key - Preset ID.
     * @returns {Promise<ChatPreset | null>}
     */
    getItem(key: string): Promise<ChatPreset | null>;
    /**
     * Save a chat preset.
     * @param {string} id - Preset ID.
     * @param {ChatPreset} preset - Preset object.
     * @returns {Promise<string>}
     */
    setItem(id: string, preset: ChatPreset): Promise<string>;
    /**
     * Delete a chat preset.
     * @param {string} key - Preset ID.
     * @returns {Promise<void>}
     */
    removeItem(key: string): Promise<void>;
    /**
     * List all chat presets.
     * @returns {Promise<ChatPreset[]>}
     */
    listItems(): Promise<ChatPreset[]>;
    /**
     * List chat presets by equality filter.
     * @param {Record<string, unknown>} filter - Filter conditions.
     * @returns {Promise<ChatPreset[]>}
     */
    listItemsByEqFilter(filter: Record<string, unknown>): Promise<ChatPreset[]>;
    /**
     * List chat presets by IN query.
     * @param {Array<{ field: string; values: unknown[] }>} query - Query conditions.
     * @returns {Promise<ChatPreset[]>}
     */
    listItemsByInQuery(query: Array<{
        field: string;
        values: unknown[];
    }>): Promise<ChatPreset[]>;
    /**
     * Get a chat preset by prefix.
     * @param {string} prefix - Prefix to search for.
     * @returns {Promise<ChatPreset | null>}
     */
    getPresetByPrefix(prefix: string): Promise<ChatPreset | null>;
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
