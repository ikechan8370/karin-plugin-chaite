import { ChaiteStorage, ToolDTO } from 'chaite';
/**
 * @extends {ChaiteStorage<ToolDTO>}
 */
export class LowDBToolsStorage extends ChaiteStorage {
    storage;
    collection;
    getName() {
        return 'LowDBToolsStorage';
    }
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
        this.collection = this.storage.collection('tools');
    }
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ToolDTO | null> 返回对应的 ToolDTO 或 null
     */
    async getItem(key) {
        const obj = await this.collection.findOne({ id: key });
        if (!obj) {
            return null;
        }
        return new ToolDTO(obj);
    }
    /**
     *
     * @param id ToolDTO 的 ID
     * @param tools ToolDTO 实例
     * @returns Promise<string> 返回 ID
     */
    async setItem(id, tools) {
        if (id && (await this.getItem(id))) {
            await this.collection.updateById(id, tools);
            return id;
        }
        const result = await this.collection.insert(tools);
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
     * @returns Promise<ToolDTO[]> 返回所有 ToolDTO 列表
     */
    async listItems() {
        const list = await this.collection.findAll();
        return list.map((item) => new ToolDTO({}).fromString(JSON.stringify(item)));
    }
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
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
     * @returns Promise<ToolDTO[]> 返回匹配的 ToolDTO 列表
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
