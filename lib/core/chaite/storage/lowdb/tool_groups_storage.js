import { ChaiteStorage, ToolsGroupDTO } from 'chaite';
/**
 * @extends {ChaiteStorage<ToolsGroupDTO>}
 */
export class LowDBToolsGroupDTOsStorage extends ChaiteStorage {
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
        this.collection = this.storage.collection('tool_groups');
    }
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ToolsGroupDTO | null> 返回对应的 ToolsGroupDTO 或 null
     */
    async getItem(key) {
        const obj = await this.collection.findOne({ id: key });
        if (!obj) {
            return null;
        }
        return new ToolsGroupDTO(obj);
    }
    /**
     *
     * @param id ToolsGroupDTO 的 ID
     * @param preset ToolsGroupDTO 实例
     * @returns Promise<string> 返回 ID
     */
    async setItem(id, preset) {
        if (id && (await this.getItem(id))) {
            await this.collection.updateById(id, preset);
            return id;
        }
        const result = await this.collection.insert(preset);
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
     * @returns Promise<ToolsGroupDTO[]> 返回所有 ToolsGroupDTO 列表
     */
    async listItems() {
        const list = await this.collection.findAll();
        return list.map((item) => new ToolsGroupDTO({}).fromString(JSON.stringify(item)));
    }
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
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
     * @returns Promise<ToolsGroupDTO[]> 返回匹配的 ToolsGroupDTO 列表
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
