import { AbstractHistoryManager, HistoryMessage } from 'chaite'
import { LowDBStorage, LowDBCollection } from './storage' // 假设这是你之前定义的存储类文件路径

export class LowDBHistoryManager extends AbstractHistoryManager {
  private storage: LowDBStorage<Record<string, any>>
  private collection: LowDBCollection<Record<string, any>>

  /**
   *
   * @param storage LowDBStorage 实例
   */
  constructor (storage: LowDBStorage<Record<string, any>>) {
    super()
    this.storage = storage
    /**
     * 集合
     */
    this.collection = this.storage.collection('history')
  }

  /**
   * 保存历史消息
   * @param message 历史消息对象
   * @param conversationId 会话ID
   * @returns Promise<void>
   */
  async saveHistory (message: HistoryMessage, conversationId: string): Promise<void> {
    const historyObj = { ...message, conversationId }
    if (message.id) {
      await this.collection.updateById(message.id, historyObj)
    } else {
      await this.collection.insert(historyObj)
    }
  }

  /**
   * 获取历史消息
   * @param messageId 消息ID
   * @param conversationId 会话ID
   * @returns Promise<HistoryMessage[]> 返回历史消息列表
   */
  async getHistory (messageId?: string, conversationId?: string): Promise<HistoryMessage[]> {
    if (messageId) {
      const messages: HistoryMessage[] = []
      let currentId = messageId
      while (currentId) {
        const message = await this.collection.findOne({ id: currentId })
        if (!message) break
        messages.unshift(message as HistoryMessage)
        currentId = (message as any).parentId // 使用类型断言，因为 parentId 可能不在 HistoryMessage 中
      }
      return messages
    } else if (conversationId) {
      return await this.collection.find({ conversationId }) as HistoryMessage[]
    }
    return []
  }

  /**
   * 删除会话历史
   * @param conversationId 会话ID
   * @returns Promise<void>
   */
  async deleteConversation (conversationId: string): Promise<void> {
    await this.collection.delete({ conversationId })
  }

  /**
   * 获取单个历史消息
   * @param messageId 消息ID
   * @param conversationId 会话ID
   * @returns Promise<HistoryMessage | undefined> 返回单个历史消息或 null
   */
  async getOneHistory (messageId: string, conversationId: string): Promise<HistoryMessage | undefined> {
    return await this.collection.findOne({ id: messageId, conversationId }) as HistoryMessage || undefined
  }
}
