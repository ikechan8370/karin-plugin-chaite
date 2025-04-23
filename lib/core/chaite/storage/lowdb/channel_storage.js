import { ChaiteStorage, Channel } from 'chaite';
export class LowDBChannelStorage extends ChaiteStorage {
    storage; // 假设 storage 的具体类型未知，使用 any，或者替换为具体的类型
    collection; // 假设 collection 的具体类型未知，使用 any，或者替换为具体的类型
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
        this.collection = this.storage.collection('channel');
    }
    /**
     *
     * @param key 查找的键值
     * @returns Promise<Channel | null> 返回对应的 Channel 或 null
     */
    async getItem(key) {
        const obj = await this.collection.findOne({ id: key });
        if (!obj) {
            return null;
        }
        return new Channel(obj);
    }
    /**
     *
     * @param id Channel 的 ID
     * @param channel Channel 实例
     * @returns Promise<string> 返回 ID
     */
    async setItem(id, channel) {
        if (id && (await this.getItem(id))) {
            await this.collection.updateById(id, channel);
            return id;
        }
        const result = await this.collection.insert(channel);
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
     * @returns Promise<Channel[]> 返回所有 Channel 列表
     */
    async listItems() {
        const list = await this.collection.findAll();
        return list.map((item) => new Channel({}).fromString(JSON.stringify(item)));
    }
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<Channel[]> 返回匹配的 Channel 列表
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
     * @returns Promise<Channel[]> 返回匹配的 Channel 列表
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
