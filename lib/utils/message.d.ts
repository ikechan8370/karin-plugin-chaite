import { UserMessage, ChatPreset, MessageContent } from 'chaite';
import { Message } from 'node-karin';
/**
 * 将e中的消息转换为chaite的UserMessage
 * @param e 事件对象
 * @param options 配置选项
 * @returns Promise<UserMessage> 返回用户消息对象
 */
export declare function intoUserMessage(e: Message, options?: {
    handleReplyText?: boolean;
    handleReplyImage?: boolean;
    handleReplyFile?: boolean;
    useRawMessage?: boolean;
    handleAtMsg?: boolean;
    excludeAtBot?: boolean;
    toggleMode?: 'at' | 'prefix';
    togglePrefix?: string | null;
}): Promise<UserMessage>;
/**
 * 找到本次对话使用的预设
 * @param e 事件对象
 * @param presetId 预设ID
 * @param toggleMode 触发模式
 * @param togglePrefix 触发前缀
 * @returns Promise<ChatPreset | null> 返回预设对象或 null
 */
export declare function getPreset(e: Message, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
presetId: string, toggleMode: 'at' | 'prefix', togglePrefix: string): Promise<ChatPreset | null>;
/**
 * 检查消息是否符合聊天条件
 * @param e 事件对象
 * @param toggleMode 触发模式
 * @param togglePrefix 触发前缀
 * @returns boolean 是否符合聊天条件
 */
export declare function checkChatMsg(e: any, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
toggleMode: 'at' | 'prefix', togglePrefix: string): boolean;
/**
 * 模型响应转为机器人格式
 * @param e 事件对象
 * @param contents 消息内容数组
 * @returns Promise<{ msgs: Array<TextElem | ImageElem | AtElem | PttElem | string>, forward: any[] }> 返回转换后的消息
 */
export declare function toYunzai(e: any, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
contents: MessageContent[]): Promise<{
    msgs: Array<any>;
    forward: any[];
}>;
