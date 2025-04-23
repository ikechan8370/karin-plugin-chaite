import { AbstractHistoryManager, HistoryMessage } from 'chaite';
import { LowDBStorage } from './storage.js';
export declare class LowDBHistoryManager extends AbstractHistoryManager {
    private storage;
    private collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage: LowDBStorage<Record<string, any>>);
    /**
     * 保存历史消息
     * @param message 历史消息对象
     * @param conversationId 会话ID
     * @returns Promise<void>
     */
    saveHistory(message: HistoryMessage, conversationId: string): Promise<void>;
    /**
     * 获取历史消息
     * @param messageId 消息ID
     * @param conversationId 会话ID
     * @returns Promise<HistoryMessage[]> 返回历史消息列表
     */
    getHistory(messageId?: string, conversationId?: string): Promise<HistoryMessage[]>;
    /**
     * 删除会话历史
     * @param conversationId 会话ID
     * @returns Promise<void>
     */
    deleteConversation(conversationId: string): Promise<void>;
    /**
     * 获取单个历史消息
     * @param messageId 消息ID
     * @param conversationId 会话ID
     * @returns Promise<HistoryMessage | undefined> 返回单个历史消息或 null
     */
    getOneHistory(messageId: string, conversationId: string): Promise<HistoryMessage | undefined>;
}
