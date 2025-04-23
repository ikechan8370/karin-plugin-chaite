import { AbstractHistoryManager, HistoryMessage } from 'chaite';
/**
 * SQLiteHistoryManager extends AbstractHistoryManager for managing chat history.
 */
export declare class SQLiteHistoryManager extends AbstractHistoryManager {
    private dbPath;
    private imagesDir;
    private db;
    private initialized;
    private tableName;
    /**
     * Constructor for SQLiteHistoryManager.
     * @param {string} dbPath - Path to the database file.
     * @param {string} imagesDir - Directory for storing images, defaults to 'images' directory at the same level as the database.
     */
    constructor(dbPath: string, imagesDir?: string);
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
     * Calculate MD5 hash of text.
     * @param {string} text - Text to hash.
     * @returns {string} MD5 hash.
     */
    private _getMd5;
    /**
     * Check if a string is a base64 encoded image.
     * @param {string} str - String to check.
     * @returns {boolean} Whether the string is a base64 encoded image.
     */
    private _isBase64Image;
    /**
     * Extract MIME type from base64 string or use a default type.
     * @param {string} base64 - Base64 string.
     * @param {string} defaultMimeType - Default MIME type.
     * @returns {string} MIME type.
     */
    private _getMimeTypeFromBase64;
    /**
     * Get file extension from MIME type.
     * @param {string} mimeType - MIME type.
     * @returns {string} File extension.
     */
    private _getExtensionFromMimeType;
    /**
     * Process images in message content, saving base64 images to local files.
     * @param {HistoryMessage} message - Message object.
     * @returns {HistoryMessage} Processed message object.
     */
    private _processMessageImages;
    /**
     * Restore image references in message content, converting back to base64.
     * @param {HistoryMessage} message - Message object.
     * @returns {HistoryMessage} Processed message object.
     */
    private _restoreMessageImages;
    /**
     * Convert message object to database record.
     * @param {HistoryMessage} message - Message object.
     * @param {string} conversationId - Conversation ID.
     * @returns {Record<string, any>} Database record.
     */
    private _messageToRecord;
    /**
     * Convert database record to message object.
     * @param {Record<string, any> | undefined} record - Database record.
     * @returns {HistoryMessage | undefined} Message object.
     */
    private _recordToMessage;
    /**
     * Save history message.
     * @param {HistoryMessage} message - Message object.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<void>}
     */
    saveHistory(message: HistoryMessage, conversationId: string): Promise<void>;
    /**
     * Internal method: Insert message record.
     * @private
     * @param {Record<string, any>} record - Database record.
     * @param {Function} resolve - Resolve function for Promise.
     * @param {Function} reject - Reject function for Promise.
     */
    private _insertMessage;
    /**
     * Get history messages.
     * @param {string} messageId - Message ID.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    getHistory(messageId?: string, conversationId?: string): Promise<HistoryMessage[]>;
    /**
     * Get message chain (from specified message back to root message).
     * @private
     * @param {string} messageId - Message ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    private _getMessageChain;
    /**
     * Get all messages in a conversation.
     * @private
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    private _getConversationMessages;
    /**
     * Delete a conversation.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<void>}
     */
    deleteConversation(conversationId: string): Promise<void>;
    /**
     * Get a single history message.
     * @param {string} messageId - Message ID.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage | null>}
     */
    getOneHistory(messageId: string, conversationId: string): Promise<HistoryMessage | undefined>;
    /**
     * Clean up unused image files.
     * @returns {Promise<{ deleted: number; total: number }>}
     */
    cleanupUnusedImages(): Promise<{
        deleted: number;
        total: number;
    }>;
    /**
     * Close the database connection.
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
}
