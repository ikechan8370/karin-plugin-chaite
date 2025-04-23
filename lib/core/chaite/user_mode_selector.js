import { AbstractUserModeSelector, ChatPreset } from 'chaite';
export class ChatGPTUserModeSelector extends AbstractUserModeSelector {
    /**
     * 根据e判断当前要使用的预设，非常灵活。
     * @param e
     * @returns {Promise<import('chaite').ChatPreset>}
     */
    async getChatPreset(e) {
        // todo
        return new ChatPreset();
    }
}
