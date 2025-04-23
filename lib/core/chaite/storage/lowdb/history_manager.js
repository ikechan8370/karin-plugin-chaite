import { AbstractHistoryManager } from 'chaite';
export class LowDBHistoryManager extends AbstractHistoryManager {
    storage;
    collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage) {
        super();
        this.storage = storage;
        /**
         * 集合
         */
        this.collection = this.storage.collection('history');
    }
    /**
     * 保存历史消息
     * @param message 历史消息对象
     * @param conversationId 会话ID
     * @returns Promise<void>
     */
    async saveHistory(message, conversationId) {
        const historyObj = { ...message, conversationId };
        if (message.id) {
            await this.collection.updateById(message.id, historyObj);
        }
        else {
            await this.collection.insert(historyObj);
        }
    }
    /**
     * 获取历史消息
     * @param messageId 消息ID
     * @param conversationId 会话ID
     * @returns Promise<HistoryMessage[]> 返回历史消息列表
     */
    async getHistory(messageId, conversationId) {
        if (messageId) {
            const messages = [];
            let currentId = messageId;
            while (currentId) {
                const message = await this.collection.findOne({ id: currentId });
                if (!message)
                    break;
                messages.unshift(message);
                currentId = message.parentId; // 使用类型断言，因为 parentId 可能不在 HistoryMessage 中
            }
            return messages;
        }
        else if (conversationId) {
            return await this.collection.find({ conversationId });
        }
        return [];
    }
    /**
     * 删除会话历史
     * @param conversationId 会话ID
     * @returns Promise<void>
     */
    async deleteConversation(conversationId) {
        await this.collection.delete({ conversationId });
    }
    /**
     * 获取单个历史消息
     * @param messageId 消息ID
     * @param conversationId 会话ID
     * @returns Promise<HistoryMessage | undefined> 返回单个历史消息或 null
     */
    async getOneHistory(messageId, conversationId) {
        return await this.collection.findOne({ id: messageId, conversationId }) || undefined;
    }
}
