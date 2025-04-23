/**
 * 生成随机数
 * @param min - 最小值
 * @param max - 最大值
 * @returns
 */
export declare const random: (min: number, max: number) => number;
/**
 * 睡眠函数
 * @param ms - 毫秒
 */
export declare const sleep: (ms: number) => Promise<unknown>;
/**
 * 使用moment返回时间
 * @param format - 格式
 */
export declare const time: (format?: string) => string;
export declare function md5(str: string): string;
export declare function generateId(): string;
export declare const dataDir: string;
/**
 * Converts a timestamp to Beijing time (UTC+8)
 * @param timestamp - Timestamp in milliseconds or seconds
 * @param format - Output format
 * @returns Formatted Beijing time
 */
export declare function formatTimeToBeiJing(timestamp: number | string, format?: string): string;
