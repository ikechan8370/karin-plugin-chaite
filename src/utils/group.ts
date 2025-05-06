import { config } from './config'
import { formatTimeToBeiJing } from './common.js'
import { GroupMessage, logger, MessageResponse, createRawMessage } from 'node-karin'

export class GroupContextCollector {
    async collect(e: GroupMessage, groupId: string, start: string, length: number): Promise<Array<MessageResponse>> {
        throw new Error('Method not implemented.')
    }
}

export class KarinGroupContextCollector extends GroupContextCollector {
    /**
     * 获取群组上下文
     * @param {GroupMessage} e
     * @param {string} groupId
     * @param {string} start
     * @param {number} length
     * @returns {Promise<Array<MessageResponse>>}
     */
    async collect(e: GroupMessage, groupId: string, start: string = '', length: number = 20): Promise<Array<MessageResponse>> {
        let latestChats = await e.bot.getHistoryMsg(e.contact, start, 1)
        if (latestChats.length > 0) {
            let latestChat = latestChats[0]
            if (latestChat) {
                let seq = latestChat.messageId
                let chats: MessageResponse[] = []
                while (chats.length < length) {
                    let chatHistory = await e.bot.getHistoryMsg(e.contact, seq, 20)
                    if (!chatHistory || chatHistory.length === 0) {
                        break
                    }
                    chats.push(...chatHistory.reverse())
                    if (seq === chatHistory[chatHistory.length - 1].messageId) {
                        break
                    }
                    seq = chatHistory[chatHistory.length - 1].messageId
                }
                chats = chats.slice(0, length).reverse()
                try {
                    let members = await e.bot.getGroupMemberList(e.groupId)
                    const mm = new Map()
                    for (const member of members) {
                        mm.set(member.userId, member)
                    }
                    for (const chat of chats) {
                        let sender = mm.get(chat.sender.userId)
                        if (sender) {
                            chat.sender = sender
                        }
                    }
                } catch (err) {
                    logger.warn(err)
                }
                // console.log(chats)
                return chats
            }
        }
        // }
        return []
    }
}


/**
 * 获取群组上下文
 */
export async function getGroupHistory(e: GroupMessage, length = 20): Promise<Array<MessageResponse>> {
    return await new KarinGroupContextCollector().collect(e, e.groupId, '0', length)
}

/**
 * 获取构建群聊聊天记录的prompt
 * @param e event
 * @param {number} length 长度
 * @returns {Promise<string>}
 */
export async function getGroupContextPrompt(e: GroupMessage, length: number): Promise<string> {
    const {
        groupContextTemplatePrefix = '',
        groupContextTemplateMessage = '',
        groupContextTemplateSuffix = ''
    } = config().llm
    const chats = await getGroupHistory(e, length)
    const rows = chats
        .filter(chat => chat)
        .map(chat => {
            const rawMessage = createRawMessage(chat.elements)
            const sender = chat.sender || {}
            return groupContextTemplateMessage
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.sender.card}', sender.card || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.sender.nickname}', sender.nick || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.sender.user_id}', sender.userId || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.sender.role}', sender.role || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.sender.title}', sender.title || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.time}', chat.time ? formatTimeToBeiJing(chat.time) : '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.messageId}', chat.messageId || '-')
                // eslint-disable-next-line no-template-curly-in-string
                .replace('${message.raw_message}', rawMessage.raw || '-')
        }).join('\n')
    return [
        groupContextTemplatePrefix
            // eslint-disable-next-line no-template-curly-in-string
            .replace('${group.group_id}', e.groupId || 'unknown')
            // eslint-disable-next-line no-template-curly-in-string
            .replace('${group.name}', e.contact.name || 'unknown'),
        rows,
        groupContextTemplateSuffix
    ].join('\n')
}
