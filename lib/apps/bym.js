import { hooks, logger } from 'node-karin';
import { config } from '../utils/config.js';
import { Chaite } from 'chaite';
import { intoUserMessage, toYunzai } from '../utils/message.js';
import { getGroupContextPrompt } from '../utils/group.js';
import { formatTimeToBeiJing } from '../utils/common.js';
// 使用 empty 钩子来处理未匹配的命令（伪人模式）
export const bym = hooks.empty(async (e, next) => {
    logger.debug('进入伪人模式 - 使用 empty 钩子');
    if (!Chaite.getInstance()) {
        next(); // 如果 Chaite 实例不存在，继续后续处理
        return;
    }
    const pluginConfig = config();
    if (!pluginConfig.bym.enable) {
        logger.debug('伪人模式未启用, 忽略当前消息');
        next(); // 如果伪人模式未启用，继续后续处理
        return;
    }
    // 概率触发逻辑
    let prob = pluginConfig.bym.probability;
    if (pluginConfig.bym.hit.find((keyword) => e.msg?.includes(keyword))) {
        prob = 1;
    }
    if (Math.random() > prob) {
        next(); // 未触发伪人模式，继续后续处理
        return;
    }
    logger.info('伪人模式触发');
    let recall = false;
    let presetId = pluginConfig.bym.defaultPreset;
    if (pluginConfig.bym.presetMap && pluginConfig.bym.presetMap.length > 0) {
        const option = pluginConfig.bym.presetMap
            .sort((a, b) => b.priority - a.priority)
            .find((item) => item.keywords.find((keyword) => e.msg?.includes(keyword)));
        if (option) {
            presetId = option.presetId;
            recall = !!option.recall;
        }
    }
    // 获取预设
    const presetManager = Chaite.getInstance().getChatPresetManager();
    let preset = await presetManager.getInstance(presetId);
    if (!preset) {
        preset = await presetManager.getInstance(pluginConfig.bym.defaultPreset);
    }
    if (!preset) {
        logger.debug('未找到预设，请检查配置文件');
        next(); // 未找到预设，继续后续处理
        return;
    }
    // 复制预设的发送消息选项
    const sendMessageOption = JSON.parse(JSON.stringify(preset.sendMessageOption));
    if (pluginConfig.bym.presetPrefix) {
        if (!sendMessageOption.systemOverride) {
            sendMessageOption.systemOverride = '';
        }
        sendMessageOption.systemOverride = pluginConfig.bym.presetPrefix + sendMessageOption.systemOverride;
    }
    sendMessageOption.systemOverride = `Current Time: ${formatTimeToBeiJing(new Date().getTime())}\n` + sendMessageOption.systemOverride;
    if (pluginConfig.bym.temperature >= 0) {
        sendMessageOption.temperature = pluginConfig.bym.temperature;
    }
    if (pluginConfig.bym.maxTokens > 0) {
        sendMessageOption.maxToken = pluginConfig.bym.maxTokens;
    }
    // 转换用户消息
    const userMessage = await intoUserMessage(e, {
        handleReplyText: true,
        handleReplyImage: true,
        useRawMessage: true,
        handleAtMsg: true,
        excludeAtBot: false,
        toggleMode: pluginConfig.basic.toggleMode,
        togglePrefix: pluginConfig.basic.togglePrefix
    });
    // 伪人不记录历史
    // sendMessageOption.disableHistoryRead = true;
    // sendMessageOption.disableHistorySave = true;
    sendMessageOption.conversationId = 'bym' + e.user_id + Date.now();
    sendMessageOption.parentMessageId = undefined;
    // 设置多轮调用回调
    sendMessageOption.onMessageWithToolCall = async (content) => {
        const { msgs, forward } = await toYunzai(e, [content]);
        if (msgs.length > 0) {
            await e.reply(msgs);
        }
        for (let forwardElement of forward) {
            await e.reply(forwardElement);
        }
    };
    // 群组上下文处理
    if (pluginConfig.llm.enableGroupContext && e.isGroup) {
        const contextPrompt = await getGroupContextPrompt(e, pluginConfig.llm.groupContextLength);
        sendMessageOption.systemOverride = sendMessageOption.systemOverride
            ? sendMessageOption.systemOverride + '\n' + contextPrompt
            : contextPrompt;
    }
    // 发送消息并获取响应
    const response = await Chaite.getInstance().sendMessage(userMessage, e, Object.assign(sendMessageOption, { chatPreset: preset }));
    // 回复消息
    const { msgs, forward } = await toYunzai(e, response.contents);
    if (msgs.length > 0) {
        for (let msg of msgs) {
            await e.reply(msg, {
                reply: false,
                recallMsg: recall ? 10 : 0
            });
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000)); // 模拟 common.sleep
        }
    }
    if (pluginConfig.bym.sendReasoning) {
        for (let forwardElement of forward) {
            await e.reply(forwardElement, {
                reply: false,
                recallMsg: recall ? 10 : 0
            });
        }
    }
    // 不调用 next()，因为已经处理了消息，不需要后续钩子再处理
    // 如果需要其他钩子继续处理，可以调用 next()
    next();
});
