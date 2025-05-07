/* eslint-disable @stylistic/semi */
import { Chaite, UserMessage, ChatPreset, MessageContent, TextContent, ImageContent, AudioContent, ReasoningContent } from 'chaite';
import { logger, segment, Message, Elements } from 'node-karin';
import axios from 'node-karin/axios';

/**
 * 将e中的消息转换为chaite的UserMessage
 * @param e 事件对象
 * @param options 配置选项
 * @returns Promise<UserMessage> 返回用户消息对象
 */
export async function intoUserMessage (
  e: Message,
  options: {
    handleReplyText?: boolean;
    handleReplyImage?: boolean;
    handleReplyFile?: boolean;
    useRawMessage?: boolean;
    handleAtMsg?: boolean;
    excludeAtBot?: boolean;
    toggleMode?: 'at' | 'prefix';
    togglePrefix?: string | null;
  } = {}
): Promise<UserMessage> {
  const {
    handleReplyText = false,
    handleReplyImage = true,
    handleReplyFile = true,
    useRawMessage = false,
    handleAtMsg = true,
    excludeAtBot = false,
    toggleMode = 'at',
    togglePrefix = null
  } = options;

  const contents: Array<MessageContent> = [];
  let text = '';

  if ((e.replyId) && (handleReplyImage || handleReplyText || handleReplyFile)) {
    const reply = await e.bot.getMsg(e.contact, e.replyId)
    if (reply) {
      for (const val of reply.elements) {
        if (val.type === 'image' && handleReplyImage) {
          const res = await axios.get(val.file, { responseType: 'arraybuffer' });
          if (res.status === 200) {
            const mimeType = res.headers['content-type'] || 'image/jpeg';
            contents.push({
              type: 'image',
              image: Buffer.from(res.data).toString('base64'),
              mimeType
            } as ImageContent);
          } else {
            logger.warn(`fetch image ${val.file} failed: ${res.status}`);
          }
        } else if (val.type === 'text' && handleReplyText) {
          text = `本条消息对以下消息进行了引用回复：${val.text}\n\n本条消息内容：\n`;
        } else if (val.type === 'file' && handleReplyFile) {
          let fileUrl = '获取失败';
          fileUrl = val.file
          text = `本条消息对一个文件进行了引用回复：该文件的下载地址为${fileUrl}\n\n本条消息内容：\n`;
        }
      }
    }
  }

  if (useRawMessage) {
    text += e.rawMessage || '';
  } else {
    for (const val of e.elements || []) {
      switch (val.type) {
        case 'at': {
          if (handleAtMsg) {
            const { targetId, name: atCard } = val;
            if ((toggleMode === 'at' || excludeAtBot) && e.atBot) {
              break;
            }
            text += ` @${atCard || targetId} `;
          }
          break;
        }
        case 'text': {
          text += val.text || '';
          break;
        }
        default:
          break;
      }
    }
  }

  for (const element of e.elements?.filter((element: Elements) => element.type === 'image') || []) {
    const res = await axios.get(element.file, { responseType: 'arraybuffer' });
    if (res.status === 200) {
      const mimeType = res.headers['content-type'] || 'image/jpeg';
      contents.push({
        type: 'image',
        image: Buffer.from(res.data).toString('base64'),
        mimeType
      } as ImageContent);
    } else {
      logger.warn(`fetch image ${element.file} failed: ${res.status}`);
    }
  }

  if (toggleMode === 'prefix' && togglePrefix) {
    const regex = new RegExp(`^#?(图片)?${togglePrefix}[^gpt]`);
    text = text.replace(regex, '');
  }

  if (text) {
    contents.push({
      type: 'text',
      text
    } as TextContent);
  }

  return {
    role: 'user',
    content: contents as UserMessage['content']
  };
}

/**
 * 找到本次对话使用的预设
 * @param e 事件对象
 * @param presetId 预设ID
 * @param toggleMode 触发模式
 * @param togglePrefix 触发前缀
 * @returns Promise<ChatPreset | null> 返回预设对象或 null
 */
export async function getPreset (
  e: Message, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
  presetId: string,
  toggleMode: 'at' | 'prefix',
  togglePrefix: string
): Promise<ChatPreset | null> {
  const isValidChat = checkChatMsg(e, toggleMode, togglePrefix);
  const manager = Chaite.getInstance().getChatPresetManager();
  const presets = await manager.getAllPresets();
  const prefixHitPresets = presets.filter(p => e.msg?.startsWith(p.prefix));

  if (!isValidChat && prefixHitPresets.length === 0) {
    return null;
  }

  let preset: ChatPreset | null = null;
  // 如果不是at且不满足通用前缀，查看是否满足其他预设
  if (!isValidChat) {
    // 找到其中prefix最长的
    if (prefixHitPresets.length > 1) {
      preset = prefixHitPresets.sort((a, b) => b.prefix.length - a.prefix.length)[0];
    } else {
      preset = prefixHitPresets[0];
    }
  } else {
    // 命中at或通用前缀，直接走用户默认预设
    preset = await manager.getInstance(presetId);
  }
  // 如果没找到再查一次
  if (!preset) {
    preset = await manager.getInstance(presetId);
  }
  return preset;
}

/**
 * 检查消息是否符合聊天条件
 * @param e 事件对象
 * @param toggleMode 触发模式
 * @param togglePrefix 触发前缀
 * @returns boolean 是否符合聊天条件
 */
export function checkChatMsg (
  e: any, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
  toggleMode: 'at' | 'prefix',
  togglePrefix: string
): boolean {
  if (toggleMode === 'at' && (e.atBot || e.isPrivate)) {
    return true;
  }
  const prefixReg = new RegExp(`^#?(图片)?${togglePrefix}[^gpt][sS]*`);
  if (toggleMode === 'prefix' && e.msg?.startsWith(prefixReg)) {
    return true;
  }
  return false;
}

/**
 * 模型响应转为机器人格式
 * @param e 事件对象
 * @param contents 消息内容数组
 * @returns Promise<{ msgs: Array<TextElem | ImageElem | AtElem | PttElem | string>, forward: any[] }> 返回转换后的消息
 */
export async function toYunzai (
  e: any, // 假设 e 的类型未知，可以根据实际情况替换为具体类型
  contents: MessageContent[]
): Promise<{ msgs: Array<any>; forward: any[] }> {
  // 假设 icqq 的类型，如果有具体类型定义，请替换
  const msgs: Array<any> = [];
  const forward: any[] = [];

  for (const content of contents) {
    switch (content.type) {
      case 'text': {
        msgs.push((content as TextContent).text?.trim() || '');
        break;
      }
      case 'image': {
        msgs.push(segment.image((content as ImageContent).image));
        break;
      }
      case 'audio': {
        msgs.push(segment.record((content as AudioContent).data));
        break;
      }
      case 'reasoning': {
        const reasoning = await (common as any).makeForwardMsg(e, [(content as ReasoningContent).text], '思考过程');
        forward.push(reasoning);
        break;
      }
      default: {
        logger.warn(`不支持的类型 ${content.type}`);
      }
    }
  }
  return {
    msgs: msgs.filter(i => !!i),
    forward
  };
}

// 假设 common 是一个全局对象，用于创建转发消息
declare const common: {
  makeForwardMsg: (e: any, messages: string[], title: string) => Promise<any>;
};

// 假设 icqq 的类型，如果有具体类型定义，请替换
interface TextElem {
  type: 'text';
  text: string;
}

interface ImageElem {
  type: 'image';
  file: string | Buffer;
}

interface AtElem {
  type: 'at';
  qq: number | string;
}

interface PttElem {
  type: 'ptt';
  file: string | Buffer;
}