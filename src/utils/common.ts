import lodash from 'node-karin/lodash'
import moment from 'node-karin/moment'
import crypto from 'crypto'
import path from 'path'
import ChatGPTConfig from '../config/config'
/**
 * 生成随机数
 * @param min - 最小值
 * @param max - 最大值
 * @returns
 */
export const random = (min: number, max: number) => lodash.random(min, max)

/**
 * 睡眠函数
 * @param ms - 毫秒
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 使用moment返回时间
 * @param format - 格式
 */
export const time = (format = 'YYYY-MM-DD HH:mm:ss') => moment().format(format)

export function md5 (str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

export const dataDir = path.resolve('./@karinjs/data/karin-plugin-chaite', ChatGPTConfig.chaite.dataDir)
