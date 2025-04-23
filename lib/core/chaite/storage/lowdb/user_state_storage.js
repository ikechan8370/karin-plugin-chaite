import { ChaiteStorage } from 'chaite';
import * as crypto from 'node:crypto';
/**
 * 继承UserState
 */
export class YunzaiUserState {
    userId;
    nickname;
    card;
    conversations; // 如果有具体类型，可以替换 any
    settings;
    current;
    id; // 可选字段，符合存储逻辑
    constructor(userId, nickname, card, conversationId = crypto.randomUUID()) {
        this.userId = userId;
        this.nickname = nickname;
        this.card = card;
        this.conversations = [];
        this.settings = {};
        this.current = {
            conversationId,
            messageId: crypto.randomUUID()
        };
    }
}
/**
 * @extends {ChaiteStorage<UserState>}
 */
export class LowDBUserStateStorage extends ChaiteStorage {
    storage;
    collection;
    /**
     *
     * @param storage LowDBStorage 实例
     */
    constructor(storage) {
        super();
        this.storage = storage;
        /**
         * 集合
         */
        this.collection = this.storage.collection('user_states');
    }
    /**
     *
     * @param key 查找的键值
     * @returns Promise<UserState | null> 返回对应的 UserState 或 null
     */
    async getItem(key) {
        return this.collection.findOne({ id: key });
    }
    /**
     *
     * @param id UserState 的 ID
     * @param state UserState 实例
     * @returns Promise<string> 返回 ID
     */
    async setItem(id, state) {
        if (id && (await this.getItem(id))) {
            await this.collection.updateById(id, state);
            return id;
        }
        // 设置 id 字段
        state.id = id;
        const result = await this.collection.insert(state);
        return result.id;
    }
    /**
     *
     * @param key 删除的键值
     * @returns Promise<void>
     */
    async removeItem(key) {
        await this.collection.deleteById(key);
    }
    /**
     *
     * @returns Promise<UserState[]> 返回所有 UserState 列表
     */
    async listItems() {
        return await this.collection.findAll();
    }
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<UserState[]> 返回匹配的 UserState 列表
     */
    async listItemsByEqFilter(filter) {
        const allList = await this.listItems();
        return allList.filter((item) => {
            for (const key in filter) {
                if (item[key] !== filter[key]) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     *
     * @param query 查询条件数组
     * @returns Promise<UserState[]> 返回匹配的 UserState 列表
     */
    async listItemsByInQuery(query) {
        const allList = await this.listItems();
        return allList.filter((item) => {
            for (const { field, values } of query) {
                if (!values.includes(item[field])) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * 清空所有数据
     * @returns Promise<void>
     */
    async clear() {
        await this.collection.deleteAll();
    }
}
