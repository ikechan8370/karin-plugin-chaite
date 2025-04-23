import { dirPath, basename } from '../utils/index.js';
import { watch, logger, karinPathBase, filesByExt, copyConfigSync, requireFileSync, yaml, } from 'node-karin';
const dir = `${karinPathBase}/${basename}`;
const dirConfig = `${dir}/config`;
const defDir = `${dirPath}/config`;
const defConfig = `${defDir}/config`;
/**
 * @description 初始化配置文件
 */
copyConfigSync(defConfig, dirConfig, ['.yaml']);
/**
 * @description 配置文件
 */
export const config = () => {
    const cfg = requireFileSync(`${dirConfig}/config.yaml`);
    const def = requireFileSync(`${defConfig}/config.yaml`);
    const data = { ...def, ...cfg };
    return Object.assign({}, data, {
        save: () => {
            yaml.save(`${dirConfig}/config.yaml`, data);
        }
    });
};
/**
 * @description package.json
 */
export const pkg = () => requireFileSync(`${dirPath}/package.json`);
/**
 * @description 监听配置文件
 */
setTimeout(() => {
    const list = filesByExt(dirConfig, '.yaml', 'abs');
    list.forEach(file => watch(file, (old, now) => {
        logger.info('旧数据:', old);
        logger.info('新数据:', now);
    }));
}, 2000);
