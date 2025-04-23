import { AbstractHistoryManager } from 'chaite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
/**
 * SQLiteHistoryManager extends AbstractHistoryManager for managing chat history.
 */
export class SQLiteHistoryManager extends AbstractHistoryManager {
    dbPath;
    imagesDir;
    db;
    initialized;
    tableName;
    /**
     * Constructor for SQLiteHistoryManager.
     * @param {string} dbPath - Path to the database file.
     * @param {string} imagesDir - Directory for storing images, defaults to 'images' directory at the same level as the database.
     */
    constructor(dbPath, imagesDir) {
        super();
        this.dbPath = dbPath;
        this.imagesDir = imagesDir || path.join(path.dirname(dbPath), 'images');
        this.db = null;
        this.initialized = false;
        this.tableName = 'history';
    }
    /**
     * Initialize the database connection and table structure.
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized)
            return;
        return new Promise((resolve, reject) => {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Ensure images directory exists
            if (!fs.existsSync(this.imagesDir)) {
                fs.mkdirSync(this.imagesDir, { recursive: true });
            }
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err) {
                    return reject(err);
                }
                // Create history table
                this.db.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            parentId TEXT,
            conversationId TEXT,
            role TEXT,
            messageData TEXT,
            createdAt TEXT
          )`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    // Create indexes to speed up queries
                    this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_conversation ON ${this.tableName} (conversationId)`, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_parent ON ${this.tableName} (parentId)`, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            this.initialized = true;
                            resolve();
                        });
                    });
                });
            });
        });
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
     * Calculate MD5 hash of text.
     * @param {string} text - Text to hash.
     * @returns {string} MD5 hash.
     */
    _getMd5(text) {
        return crypto.createHash('md5').update(text).digest('hex');
    }
    /**
     * Check if a string is a base64 encoded image.
     * @param {string} str - String to check.
     * @returns {boolean} Whether the string is a base64 encoded image.
     */
    _isBase64Image(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }
        // Handle base64 format with prefix
        if (str.startsWith('data:image/')) {
            return true;
        }
        // Handle pure base64 string
        // Base64 encoding only contains letters, numbers, +, /, and may end with = or == for padding
        return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
    }
    /**
     * Extract MIME type from base64 string or use a default type.
     * @param {string} base64 - Base64 string.
     * @param {string} defaultMimeType - Default MIME type.
     * @returns {string} MIME type.
     */
    _getMimeTypeFromBase64(base64, defaultMimeType = 'image/jpeg') {
        if (base64 && base64.startsWith('data:image/')) {
            const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            if (match) {
                return match[1];
            }
        }
        return defaultMimeType; // For pure base64 strings, use default type
    }
    /**
     * Get file extension from MIME type.
     * @param {string} mimeType - MIME type.
     * @returns {string} File extension.
     */
    _getExtensionFromMimeType(mimeType) {
        const map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
        };
        return map[mimeType] || '.png';
    }
    /**
     * Process images in message content, saving base64 images to local files.
     * @param {HistoryMessage} message - Message object.
     * @returns {HistoryMessage} Processed message object.
     */
    _processMessageImages(message) {
        if (!message.content || !Array.isArray(message.content)) {
            return message;
        }
        // Deep copy to avoid modifying the original object
        const processedMessage = JSON.parse(JSON.stringify(message));
        processedMessage.content = processedMessage.content.map((item) => {
            if (item.type === 'image' && item.image) {
                // Check if it's base64 image data
                if (this._isBase64Image(item.image)) {
                    let base64Data = item.image;
                    let mimeType = item.mimeType || 'image/jpeg'; // Use specified MIME type or default
                    // If it's data:image format, extract pure base64 part
                    if (base64Data.startsWith('data:')) {
                        const parts = base64Data.split(',');
                        if (parts.length > 1) {
                            base64Data = parts[1];
                            // Update MIME type
                            mimeType = this._getMimeTypeFromBase64(item.image, mimeType);
                        }
                    }
                    try {
                        // Calculate MD5
                        const md5 = this._getMd5(base64Data);
                        const ext = this._getExtensionFromMimeType(mimeType);
                        const filePath = path.join(this.imagesDir, `${md5}${ext}`);
                        // Save if file does not exist
                        if (!fs.existsSync(filePath)) {
                            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                        }
                        // Replace with reference format: $image:md5:ext
                        item.image = `$image:${md5}:${ext}`;
                        item._type = mimeType; // Save original type
                    }
                    catch (error) {
                        console.error('Failed to save image:', error);
                    }
                }
            }
            return item;
        });
        return processedMessage;
    }
    /**
     * Restore image references in message content, converting back to base64.
     * @param {HistoryMessage} message - Message object.
     * @returns {HistoryMessage} Processed message object.
     */
    _restoreMessageImages(message) {
        if (!message || !message.content || !Array.isArray(message.content)) {
            return message;
        }
        // Deep copy to avoid modifying the original object
        const restoredMessage = JSON.parse(JSON.stringify(message));
        // Flag to check if we need to add "[图片]" text
        let needImageText = true;
        let hasRemovedImage = false;
        restoredMessage.content = restoredMessage.content.filter((item, index) => {
            if (item.type === 'image' && item.image && typeof item.image === 'string') {
                // Check if it's an image reference format
                const match = item.image.match(/^\$image:([a-f0-9]+):(\.[a-z]+)$/);
                if (match) {
                    const [_, md5, ext] = match;
                    const filePath = path.join(this.imagesDir, `${md5}${ext}`);
                    // Check if file exists
                    if (fs.existsSync(filePath)) {
                        try {
                            // Read file and convert to base64
                            const imageBuffer = fs.readFileSync(filePath);
                            item.image = imageBuffer.toString('base64');
                            return true;
                        }
                        catch (error) {
                            console.error('Failed to read image file:', filePath, error);
                            hasRemovedImage = true;
                            return false;
                        }
                    }
                    else {
                        // File does not exist, remove this image element
                        hasRemovedImage = true;
                        return false;
                    }
                }
            }
            if (item.type === 'text') {
                needImageText = false;
            }
            return true;
        });
        // If images were removed and there is no text content, add "[图片]" hint
        if (hasRemovedImage) {
            if (restoredMessage.content.length === 0) {
                restoredMessage.content.push({
                    type: 'text',
                    text: '[图片]',
                });
            }
            else if (needImageText) {
                // Find the first text element
                const textIndex = restoredMessage.content.findIndex((item) => item.type === 'text');
                if (textIndex !== -1) {
                    restoredMessage.content[textIndex].text = `[图片] ${restoredMessage.content[textIndex].text}`;
                }
                else {
                    // If no text element, add one
                    restoredMessage.content.unshift({
                        type: 'text',
                        text: '[图片]',
                    });
                }
            }
        }
        return restoredMessage;
    }
    /**
     * Convert message object to database record.
     * @param {HistoryMessage} message - Message object.
     * @param {string} conversationId - Conversation ID.
     * @returns {Record<string, any>} Database record.
     */
    _messageToRecord(message, conversationId) {
        // Process images, saving base64 images to local files
        const processedMessage = this._processMessageImages(message);
        // Convert content and toolCalls to JSON
        const { id, parentId, role } = processedMessage;
        const messageData = JSON.stringify(processedMessage);
        return {
            id: id || '',
            parentId: parentId || null,
            conversationId: conversationId || '',
            role: role || '',
            messageData,
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Convert database record to message object.
     * @param {Record<string, any> | undefined} record - Database record.
     * @returns {HistoryMessage | undefined} Message object.
     */
    _recordToMessage(record) {
        if (!record)
            return undefined;
        try {
            // Parse stored message data
            const message = JSON.parse(record.messageData);
            // Restore image references to base64
            return this._restoreMessageImages(message);
        }
        catch (e) {
            // Parsing failed, attempt to construct minimal structure
            return {
                id: record.id,
                parentId: record.parentId,
                role: record.role,
                content: [],
            };
        }
    }
    /**
     * Save history message.
     * @param {HistoryMessage} message - Message object.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<void>}
     */
    async saveHistory(message, conversationId) {
        await this.ensureInitialized();
        const record = this._messageToRecord(message, conversationId);
        return new Promise((resolve, reject) => {
            // Check if message already exists
            if (message.id) {
                this.db.get(`SELECT id FROM ${this.tableName} WHERE id = ?`, [message.id], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (row) {
                        // Message exists, update
                        const fields = Object.keys(record);
                        const updates = fields.map((field) => `${field} = ?`).join(', ');
                        const values = fields.map((field) => record[field]);
                        this.db.run(`UPDATE ${this.tableName} SET ${updates} WHERE id = ?`, [...values, message.id], (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }
                    else {
                        // Message does not exist, insert
                        this._insertMessage(record, resolve, reject);
                    }
                });
            }
            else {
                // No ID, insert directly
                this._insertMessage(record, resolve, reject);
            }
        });
    }
    /**
     * Internal method: Insert message record.
     * @private
     * @param {Record<string, any>} record - Database record.
     * @param {Function} resolve - Resolve function for Promise.
     * @param {Function} reject - Reject function for Promise.
     */
    _insertMessage(record, resolve, reject) {
        const fields = Object.keys(record);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map((field) => record[field]);
        this.db.run(`INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`, values, function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    }
    /**
     * Get history messages.
     * @param {string} messageId - Message ID.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    async getHistory(messageId, conversationId) {
        await this.ensureInitialized();
        if (messageId) {
            return this._getMessageChain(messageId);
        }
        else if (conversationId) {
            return this._getConversationMessages(conversationId);
        }
        return [];
    }
    /**
     * Get message chain (from specified message back to root message).
     * @private
     * @param {string} messageId - Message ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    async _getMessageChain(messageId) {
        return new Promise((resolve, reject) => {
            const messages = [];
            const getMessageById = (id) => {
                if (!id) {
                    resolve(messages);
                    return;
                }
                this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        resolve(messages);
                        return;
                    }
                    const message = this._recordToMessage(row);
                    if (message) {
                        messages.unshift(message); // Add message to the beginning of array
                    }
                    getMessageById(row.parentId); // Recursively get parent message
                });
            };
            getMessageById(messageId);
        });
    }
    /**
     * Get all messages in a conversation.
     * @private
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage[]>}
     */
    async _getConversationMessages(conversationId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM ${this.tableName} WHERE conversationId = ? ORDER BY createdAt`, [conversationId], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                const messages = rows.map((row) => this._recordToMessage(row)).filter(Boolean);
                resolve(messages);
            });
        });
    }
    /**
     * Delete a conversation.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<void>}
     */
    async deleteConversation(conversationId) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM ${this.tableName} WHERE conversationId = ?`, [conversationId], (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    /**
     * Get a single history message.
     * @param {string} messageId - Message ID.
     * @param {string} conversationId - Conversation ID.
     * @returns {Promise<HistoryMessage | null>}
     */
    async getOneHistory(messageId, conversationId) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            const conditions = [];
            const params = [];
            if (messageId) {
                conditions.push('id = ?');
                params.push(messageId);
            }
            if (conversationId) {
                conditions.push('conversationId = ?');
                params.push(conversationId);
            }
            if (conditions.length === 0) {
                return resolve(undefined);
            }
            const whereClause = conditions.join(' AND ');
            this.db.get(`SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`, params, (err, row) => {
                if (err) {
                    return reject(err);
                }
                resolve(this._recordToMessage(row));
            });
        });
    }
    /**
     * Clean up unused image files.
     * @returns {Promise<{ deleted: number; total: number }>}
     */
    async cleanupUnusedImages() {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            // Get all message data
            this.db.all(`SELECT messageData FROM ${this.tableName}`, async (err, rows) => {
                if (err) {
                    return reject(err);
                }
                try {
                    // Extract all image references from database
                    const usedImageRefs = new Set();
                    rows.forEach((row) => {
                        try {
                            const message = JSON.parse(row.messageData);
                            if (message.content && Array.isArray(message.content)) {
                                message.content.forEach((item) => {
                                    if (item.type === 'image' && typeof item.image === 'string') {
                                        const match = item.image.match(/^\$image:([a-f0-9]+):(\.[a-z]+)$/);
                                        if (match) {
                                            usedImageRefs.add(`${match[1]}${match[2]}`);
                                        }
                                    }
                                });
                            }
                        }
                        catch (e) {
                            // Ignore parsing errors
                        }
                    });
                    // Get all files in images directory
                    const files = fs.readdirSync(this.imagesDir);
                    // Delete unreferenced images
                    let deletedCount = 0;
                    for (const file of files) {
                        if (!usedImageRefs.has(file)) {
                            fs.unlinkSync(path.join(this.imagesDir, file));
                            deletedCount++;
                        }
                    }
                    resolve({
                        deleted: deletedCount,
                        total: files.length,
                    });
                }
                catch (error) {
                    reject(error);
                }
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
