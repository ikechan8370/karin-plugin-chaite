import { karin, logger, hooks } from 'node-karin'
import { config } from '../utils/config'
import { Chaite, SendMessageOption, EventMessage } from 'chaite'
import { getPreset, intoUserMessage, toYunzai } from '../utils/message'
import { YunzaiUserState } from '../core/chaite/storage/lowdb/user_state_storage'
import { getGroupContextPrompt } from '../utils/group'
import crypto from 'node:crypto'

// 使用 empty 钩子来处理未匹配的命令
export const chat = hooks.empty(async (e, next) => {
  logger.info('进入聊天模式 - 使用 empty 钩子');
  if (!Chaite.getInstance()) {
    next(); // 如果 Chaite 实例不存在，继续后续处理
    return;
  }

  // 获取用户状态
  let state = await Chaite.getInstance().getUserStateStorage().getItem(e.sender.uin + '');
  if (!state) {
    state = new YunzaiUserState(e.sender.uin + '', e.sender.name, (e.sender as any).card || '');
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
    logger.debug('不满足对话触发条件或未找到预设，不进入对话');
    next(); // 不满足条件，继续后续处理
    return;
  } else {
    logger.info('进入对话, prompt: ' + e.msg);
  }

  // 设置发送消息选项
  const sendMessageOptions = SendMessageOption.create(state?.settings);
  sendMessageOptions.onMessageWithToolCall = async (content: any) => {
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
  const response = await Chaite.getInstance().sendMessage(userMessage, e as unknown as EventMessage, Object.assign(sendMessageOptions, {
    chatPreset: preset
  }));

  // 更新当前聊天进度
  state.current.messageId = response.id;
  const conversations = state.conversations;
  const existingConversation = conversations.find(c => c.id === sendMessageOptions.conversationId);
  if (existingConversation) {
    existingConversation.lastMessageId = response.id as string;
  } else {
    conversations.push({
      id: sendMessageOptions.conversationId,
      lastMessageId: response.id as string,
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

  // 不调用 next()，因为已经处理了消息，不需要后续钩子再处理
  // 如果需要其他钩子继续处理，可以调用 next()
  next();
});