import { GroupMessage, MessageResponse } from 'node-karin';
export declare class GroupContextCollector {
    collect(e: GroupMessage, groupId: string, start: string, length: number): Promise<Array<MessageResponse>>;
}
export declare class KarinGroupContextCollector extends GroupContextCollector {
    /**
     * 获取群组上下文
     * @param {GroupMessage} e
     * @param {string} groupId
     * @param {string} start
     * @param {number} length
     * @returns {Promise<Array<MessageResponse>>}
     */
    collect(e: GroupMessage, groupId: string, start?: string, length?: number): Promise<Array<MessageResponse>>;
}
/**
 * 获取群组上下文
 */
export declare function getGroupHistory(e: GroupMessage, length?: number): Promise<Array<MessageResponse>>;
/**
 * 获取构建群聊聊天记录的prompt
 * @param e event
 * @param {number} length 长度
 * @returns {Promise<string>}
 */
export declare function getGroupContextPrompt(e: GroupMessage, length: number): Promise<string>;
