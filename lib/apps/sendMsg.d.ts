/**
 * 发送主动消息插件demo
 * 触发指令: #测试主动消息
 */
export declare const sendMsg: import("node-karin").Command<keyof import("node-karin").MessageEventMap>;
/**
 * 转发插件demo
 * 触发指令: #测试转发
 */
export declare const forwardMessage: import("node-karin").Command<keyof import("node-karin").MessageEventMap>;
