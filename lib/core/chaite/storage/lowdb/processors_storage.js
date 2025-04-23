import { ChaiteStorage, ProcessorDTO } from 'chaite';
export class LowDBProcessorsStorage extends ChaiteStorage {
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
        this.collection = this.storage.collection('processors');
    }
    /**
     *
     * @param key 查找的键值
     * @returns Promise<ProcessorDTO | null> 返回对应的 Processor 或 null
     */
    async getItem(key) {
        const obj = await this.collection.findOne({ id: key });
        if (!obj) {
            return null;
        }
        return new ProcessorDTO(obj);
    }
    /**
     *
     * @param id Processor 的 ID
     * @param processor Processor 实例
     * @returns Promise<string> 返回 ID
     */
    async setItem(id, processor) {
        if (id && (await this.getItem(id))) {
            await this.collection.updateById(id, processor);
            return id;
        }
        const result = await this.collection.insert(processor);
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
     * @returns Promise<ProcessorDTO[]> 返回所有 Processor 列表
     */
    async listItems() {
        const list = await this.collection.findAll();
        return list.map((item) => new ProcessorDTO({}).fromString(JSON.stringify(item)));
    }
    /**
     *
     * @param filter 过滤条件对象
     * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
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
     * @returns Promise<ProcessorDTO[]> 返回匹配的 Processor 列表
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
