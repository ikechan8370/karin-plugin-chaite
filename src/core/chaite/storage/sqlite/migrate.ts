import path from 'path'
import { dataDir } from '../../../../utils/common'
import { SQLiteChannelStorage } from './channel_storage'
import { LowDBChannelStorage } from '../lowdb/channel_storage'
import { SQLiteChatPresetStorage } from './chat_preset_storage'
import { LowDBChatPresetsStorage } from '../lowdb/chat_preset_storage'
import { SQLiteToolsStorage } from './tools_storage'
import { LowDBToolsStorage } from '../lowdb/tools_storage'
import { SQLiteProcessorsStorage } from './processors_storage'
import { LowDBProcessorsStorage } from '../lowdb/processors_storage'
import { SQLiteUserStateStorage } from './user_state_storage'
import { LowDBUserStateStorage } from '../lowdb/user_state_storage'
import fs from 'fs'
import { logger } from 'node-karin'
import { ChaiteStorage, UserState } from 'chaite'
import { LowDBCollection } from '../lowdb/storage.js'

export async function checkMigrate () {
  logger.debug('检查是否需要从 LowDB 迁移数据到 SQLite...')

  try {
    // 导入所需的模块
    const { default: ChatGPTStorage } = await import('../lowdb/storage.js')
    await ChatGPTStorage.init()
    const { ChatGPTHistoryStorage } = await import('../lowdb/storage.js')
    await ChatGPTHistoryStorage.init()

    const dbPath = path.join(dataDir, 'data.db')

    // 删除所有id为空的行
    logger.debug('开始修复id为空的数据行...')
    const collectionsToClean = ['channel', 'chat_presets', 'tools', 'processors']
    for (const collectionName of collectionsToClean) {
      try {
        const collection = ChatGPTStorage.collection(collectionName)
        const allItems = await collection.findAll()
        const invalidItems = allItems.filter(item => !item.id)

        if (invalidItems.length > 0) {
          logger.info(`在${collectionName}中发现${invalidItems.length}条id为空的数据，正在修复...`)

          for (const item of invalidItems) {
            // 生成一个新的唯一ID
            const newId = `generated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            // 更新时间戳
            const now = new Date().toISOString()

            // 更新项目
            item.id = newId
            item.createdAt = now
            item.updatedAt = now

            // 保存更新后的项目
            await collection.set(newId, item)

            // 移除旧的无ID项
            await collection.remove(item.id)
          }

          logger.info(`已成功修复${collectionName}中的${invalidItems.length}条无效数据`)
        } else {
          logger.debug(`${collectionName}中没有发现id为空的数据`)
        }
      } catch (err) {
        logger.error(`修复${collectionName}中id为空的数据时出错:`, err)
      }
    }

    // 定义要检查的存储对
    const storagePairs = [
      {
        name: '渠道',
        lowdbStorageClass: LowDBChannelStorage,
        sqliteStorageClass: SQLiteChannelStorage,
        collection: 'channel'
      },
      {
        name: '预设',
        lowdbStorageClass: LowDBChatPresetsStorage,
        sqliteStorageClass: SQLiteChatPresetStorage,
        collection: 'chat_presets'
      },
      {
        name: '工具',
        lowdbStorageClass: LowDBToolsStorage,
        sqliteStorageClass: SQLiteToolsStorage,
        collection: 'tools'
      },
      {
        name: '处理器',
        lowdbStorageClass: LowDBProcessorsStorage,
        sqliteStorageClass: SQLiteProcessorsStorage,
        collection: 'processors'
      },
      {
        name: '用户状态',
        lowdbStorageClass: LowDBUserStateStorage,
        sqliteStorageClass: SQLiteUserStateStorage,
        collection: 'userState',
        isSpecial: true
      }
    ]

    // 检查是否有任何数据需要迁移
    const needMigrate = await Promise.all(storagePairs.map(async pair => {
      if (pair.isSpecial) {
        // 用户状态特殊处理
        const collection = ChatGPTStorage.collection(pair.collection)
        const items = await collection.findAll()
        return items.length > 0
      } else {
        // 标准集合处理
        const collection = ChatGPTStorage.collection(pair.collection)
        const items = await collection.findAll()
        return items.length > 0
      }
    })).then(results => results.some(result => result))

    if (!needMigrate) {
      logger.debug('LowDB 存储为空，无需迁移')
      return
    }

    // 检查 SQLite 中是否已有数据
    const testStorage = new SQLiteChannelStorage(dbPath)
    await testStorage.initialize()
    const channels = await testStorage.listItems()

    if (channels.length > 0) {
      logger.debug('SQLite 存储已有数据，跳过迁移')
      await testStorage.close()
      return
    }
    await testStorage.close()

    logger.info('开始从 LowDB 迁移数据到 SQLite...')

    // 迁移每种数据
    for (const pair of storagePairs) {
      const collection = ChatGPTStorage.collection(pair.collection)
      const items = await collection.findAll()

      if (items.length > 0) {
        logger.info(`迁移${pair.name}数据...`)
        // eslint-disable-next-line new-cap
        const sqliteStorage = new pair.sqliteStorageClass(dbPath)
        await sqliteStorage.initialize()

        for (const item of items) {
          if (pair.name === '用户状态') {
            await (sqliteStorage as SQLiteUserStateStorage).setItem(item.userId + '', item as UserState)
          } else {
            // 对于其他类型，根据实际情况使用相应的类型断言
            await (sqliteStorage as ChaiteStorage<unknown>).setItem(item.id, item)
          }
        }

        logger.info(`迁移了 ${items.length} 个${pair.name}`)
        await sqliteStorage.close()
      }
    }

    // 迁移完成后，备份并清空 LowDB 数据
    const backupDir = path.join(dataDir, 'backup')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    // 备份并清空��数据
    if (fs.existsSync(ChatGPTStorage.filePath)) {
      fs.copyFileSync(
        ChatGPTStorage.filePath,
        path.join(backupDir, `storage-backup-${timestamp}.json`)
      )
      // 清空数据但保留文件结构
      for (const pair of storagePairs) {
        if (!pair.collection) continue
        await ChatGPTStorage.collection(pair.collection).deleteAll()
      }
    }

    // 备份并清空历史数据
    if (fs.existsSync(ChatGPTHistoryStorage.filePath)) {
      fs.copyFileSync(
        ChatGPTHistoryStorage.filePath,
        path.join(backupDir, `history-backup-${timestamp}.json`)
      )
      // 清空历史数据
      for (const collectionName of ChatGPTHistoryStorage.listCollections()) {
        await ChatGPTHistoryStorage.collection(collectionName).deleteAll()
      }
    }

    logger.debug(`迁移完成，原数据已备份至 ${backupDir} 目录`)
  } catch (error) {
    logger.error('数据迁移过程中发生错误:', error)
  }
}
