import lodash from 'node-karin/lodash'
import moment from 'node-karin/moment'
import crypto from 'crypto'

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

export function generateId (): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
}

/**
 * Converts a timestamp to Beijing time (UTC+8)
 * @param timestamp - Timestamp in milliseconds or seconds
 * @param format - Output format
 * @returns Formatted Beijing time
 */
export function formatTimeToBeiJing (timestamp: number | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  // Handle string timestamp
  if (typeof timestamp === 'string') {
    timestamp = parseInt(timestamp, 10)
  }
  // Automatically determine if timestamp is in seconds or milliseconds
  // If timestamp represents a date before 2000, assume it's in milliseconds
  if (timestamp.toString().length <= 10) {
    // Convert seconds to milliseconds
    timestamp = timestamp * 1000
  }
  // Create date object with the timestamp
  const date = new Date(timestamp)
  // Calculate Beijing time (UTC+8)
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  // Format the date according to the specified format
  return formatDate(beijingTime, format)
}

/**
 * Formats a Date object according to the specified format
 * @param date - Date object to format
 * @param format - Format string (YYYY-MM-DD HH:mm:ss)
 * @returns Formatted date string
 */
function formatDate (date: Date, format: string): string {
  const year = date.getUTCFullYear().toString()
  const month = padZero(date.getUTCMonth() + 1)
  const day = padZero(date.getUTCDate())
  const hours = padZero(date.getUTCHours())
  const minutes = padZero(date.getUTCMinutes())
  const seconds = padZero(date.getUTCSeconds())
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * Pads a number with leading zero if it's less than 10
 * @param num - Number to pad
 * @returns Padded number as string
 */
function padZero (num: number): string {
  return num < 10 ? `0${num}` : num.toString()
}
