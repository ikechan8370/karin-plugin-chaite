import { AbstractUserModeSelector, ChatPreset, EventMessage } from 'chaite';
export declare class ChatGPTUserModeSelector extends AbstractUserModeSelector {
    /**
     * 根据e判断当前要使用的预设，非常灵活。
     * @param e
     * @returns {Promise<import('chaite').ChatPreset>}
     */
    getChatPreset(e: EventMessage): Promise<ChatPreset>;
}
