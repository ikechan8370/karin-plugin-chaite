import { karin } from 'node-karin';
import { config } from '../utils/config.js';
import { Chaite, SendMessageOption } from 'chaite';
import { getPreset, intoUserMessage, toYunzai } from '../utils/message.js';
import { YunzaiUserState } from '../core/chaite/storage/lowdb/user_state_storage.js';
import { getGroupContextPrompt } from '../utils/group.js';
import crypto from 'node:crypto';
// 注册聊天命令
export const chat = karin.command(/^[^#][sS]_/, async (e, next) => {
    if (!Chaite.getInstance()) {
        return false;
    }
    // 获取用户状态
    let state = await Chaite.getInstance().getUserStateStorage().getItem(e.sender.uin + '');
    if (!state) {
        state = new YunzaiUserState(e.sender.uin + '', e.sender.name, e.sender.card || '');
    }
    // 初始化会话 ID 和消息 ID
    if (!state.current.conversationId) {
        state.current.conversationId = crypto.randomUUID();
    }
    if (!state.current.messageId) {
        state.current.messageId = crypto.randomUUID();
    }
    // 获取预设
    const preset = await getPreset(e, state?.settings.preset || config().llm.defaultChatPresetId, config().basic.toggleMode, config().basic.togglePrefix);
    if (!preset) {
        console.debug('不满足对话触发条件或未找到预设，不进入对话');
        return false;
    }
    else {
        console.info('进入对话, prompt: ' + e.msg);
    }
    // 设置发送消息选项
    const sendMessageOptions = SendMessageOption.create(state?.settings);
    sendMessageOptions.onMessageWithToolCall = async (content) => {
        const { msgs, forward } = await toYunzai(e, [content]);
        if (msgs.length > 0) {
            await e.reply(msgs);
        }
        for (let forwardElement of forward) {
            await e.reply(forwardElement);
        }
    };
    // 转换用户消息
    const userMessage = await intoUserMessage(e, {
        handleReplyText: false,
        handleReplyImage: true,
        useRawMessage: false,
        handleAtMsg: true,
        excludeAtBot: false,
        toggleMode: config().basic.toggleMode,
        togglePrefix: config().basic.togglePrefix
    });
    // 设置会话信息
    sendMessageOptions.conversationId = state?.current?.conversationId;
    sendMessageOptions.parentMessageId = state?.current?.messageId || state?.conversations.find(c => c.id === sendMessageOptions.conversationId)?.lastMessageId;
    // 群组上下文处理
    if (config().llm.enableGroupContext && e.isGroup) {
        const contextPrompt = await getGroupContextPrompt(e, config().llm.groupContextLength);
        sendMessageOptions.systemOverride = sendMessageOptions.systemOverride
            ? sendMessageOptions.systemOverride + '\n' + contextPrompt
            : (preset.sendMessageOption.systemOverride + contextPrompt);
    }
    // 发送消息并获取响应
    const response = await Chaite.getInstance().sendMessage(userMessage, e, Object.assign(sendMessageOptions, {
        chatPreset: preset
    }));
    // 更新当前聊天进度
    state.current.messageId = response.id;
    const conversations = state.conversations;
    const existingConversation = conversations.find(c => c.id === sendMessageOptions.conversationId);
    if (existingConversation) {
        existingConversation.lastMessageId = response.id;
    }
    else {
        conversations.push({
            id: sendMessageOptions.conversationId,
            lastMessageId: response.id,
            name: 'New Conversation'
        });
    }
    // 保存用户状态
    await Chaite.getInstance().getUserStateStorage().setItem(e.sender.uin + '', state);
    // 回复消息
    const { msgs, forward } = await toYunzai(e, response.contents);
    if (msgs.length > 0) {
        await e.reply(msgs);
    }
    for (let forwardElement of forward) {
        await e.reply(forwardElement);
    }
    next(); // 继续匹配其他插件
});
