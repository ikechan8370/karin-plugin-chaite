import {
  Chaite, ChaiteStorage, Channel,
  ChannelsManager,
  ChatPresetManager,
  DefaultChannelLoadBalancer,
  GeminiClient, IClient,
  OpenAIClient,
  ProcessorsManager,
  RAGManager,
  ToolManager,
  ToolsGroupManager,
  User,
  ChatPreset,
  ToolDTO,
  UserState,
  ToolsGroupDTO,
  HistoryManager,
  TriggerDTO,
  ProcessorDTO,
  TriggerManager} from 'chaite';
import { karinPathBase, karinPathData, logger } from 'node-karin';
import { config } from '../../utils/config';
import { LowDBChannelStorage } from './storage/lowdb/channel_storage';
import { LowDBChatPresetsStorage } from './storage/lowdb/chat_preset_storage';
import { LowDBToolsStorage } from './storage/lowdb/tools_storage';
import { LowDBProcessorsStorage } from './storage/lowdb/processors_storage';
import { ChatGPTUserModeSelector } from './user_mode_selector';
import { LowDBUserStateStorage } from './storage/lowdb/user_state_storage';
import { LowDBHistoryManager } from './storage/lowdb/history_manager';
import { VectraVectorDatabase } from './vector_database';
import path from 'path';
import fs from 'fs';
import { migrateDatabase } from '@/utils/initDB';
import { SQLiteChannelStorage } from './storage/sqlite/channel_storage';
import { dataDir } from '@/utils/config';
import { SQLiteChatPresetStorage } from './storage/sqlite/chat_preset_storage';
import { SQLiteToolsStorage } from './storage/sqlite/tools_storage';
import { SQLiteProcessorsStorage } from './storage/sqlite/processors_storage';
import { SQLiteUserStateStorage } from './storage/sqlite/user_state_storage';
import { SQLiteToolsGroupStorage } from './storage/sqlite/tool_groups_storage';
import { checkMigrate } from './storage/sqlite/migrate';
import { SQLiteHistoryManager } from './storage/sqlite/history_manager';
import { ChatGPTConfig } from '@/types/config';
import { basename, dirPath } from '@/utils/dir';
import { SQLiteTriggerStorage } from './storage/sqlite/trigger_storage';
import LowDBTriggerStorage from './storage/lowdb/trigger_storage';

/**
 * 认证，以便共享上传
 * @param apiKey API 密钥
 * @returns Promise<User | null> 返回用户对象或 null
 */
export async function authCloud(apiKey: string = config().chaite.cloudApiKey): Promise<User | null> {
  try {
    await Chaite.getInstance().auth(apiKey);
    return Chaite.getInstance().getToolsManager().cloudService?.getUser() || null;
  } catch (err) {
    logger.error(err);
    return null;
  }
}

/**
 * 根据通道获取客户端
 * @param channel 通道对象
 * @returns Promise<IClient> 返回客户端实例
 */
async function getIClientByChannel(channel: Channel): Promise<IClient> {
  await channel.ready();
  switch (channel.adapterType) {
    case 'openai': {
      return new OpenAIClient(channel.options);
    }
    case 'gemini': {
      return new GeminiClient(channel.options);
    }
    case 'claude': {
      throw new Error('claude doesn\'t support embedding');
    }
    default: {
      throw new Error(`Unsupported adapter type: ${channel.adapterType}`);
    }
  }
}

/**
 * 初始化 RAG 管理器
 * @param model 模型名称
 * @param dimensions 向量维度
 * @returns Promise<void>
 */
export async function initRagManager(model: string, dimensions: number): Promise<void> {
  const vectorizer = new class {
    async textToVector(text: string): Promise<number[]> {
      const channels = await Chaite.getInstance().getChannelsManager().getChannelByModel(model);
      if (channels.length === 0) {
        throw new Error('No channel found for model: ' + model);
      }
      const channel = channels[0];
      const client = await getIClientByChannel(channel);
      const result = await client.getEmbedding(text, {
        model,
        dimensions
      });
      return result.embeddings[0];
    }

    /**
     * 批量将文本转换为向量
     * @param texts 文本数组
     * @returns Promise<Array<number>[]> 返回向量数组
     */
    async batchTextToVector(texts: string[]): Promise<Array<number>[]> {
      const availableChannels = (await Chaite.getInstance().getChannelsManager().getAllChannels()).filter(c => c.models.includes(model));
      if (availableChannels.length === 0) {
        throw new Error('No channel found for model: ' + model);
      }
      const channels = await Chaite.getInstance().getChannelsManager().getChannelsByModel(model, texts.length);
      const clients: IClient[] = await Promise.all(channels.map(({ channel }) => getIClientByChannel(channel)));
      const results: Array<number>[] = [];
      let startIndex = 0;
      for (let i = 0; i < channels.length; i++) {
        const { quantity } = channels[i];
        const textsSlice = texts.slice(startIndex, startIndex + quantity);
        const embeddings = await clients[i].getEmbedding(textsSlice, {
          model,
          dimensions
        });
        results.push(...embeddings.embeddings);
        startIndex += quantity;
      }
      return results;
    }
  }();

  const vectorDBPath = path.resolve(karinPathData, config().chaite.dataDir, 'vector_index');
  if (!fs.existsSync(vectorDBPath)) {
    fs.mkdirSync(vectorDBPath, { recursive: true });
  }
  const vectorDB = new VectraVectorDatabase(vectorDBPath);
  await vectorDB.init();
  const ragManager = new RAGManager(vectorDB, vectorizer);
  return Chaite.getInstance().setRAGManager(ragManager);
}

/**
 * 初始化 Chaite
 * @returns Promise<void>
 */
export async function initChaite(): Promise<void> {
  const storage = config().chaite.storage;
  let channelsStorage: ChaiteStorage<Channel>;
  let chatPresetsStorage: ChaiteStorage<ChatPreset>;
  let toolsStorage: ChaiteStorage<ToolDTO>;
  let processorsStorage: ChaiteStorage<ProcessorDTO>;
  let userStateStorage: ChaiteStorage<UserState>;
  let historyStorage: HistoryManager;
  let toolsGroupStorage: ChaiteStorage<ToolsGroupDTO>;
  let triggerStorage: ChaiteStorage<TriggerDTO>;
  const dir = `${karinPathBase}/${basename}`
  switch (storage) {
    case 'sqlite': {
      const dbPath = path.join(dirPath, 'data.db');
      channelsStorage = new SQLiteChannelStorage(dbPath);
      await (channelsStorage as SQLiteChannelStorage).initialize();
      chatPresetsStorage = new SQLiteChatPresetStorage(dbPath);
      await (chatPresetsStorage as SQLiteChatPresetStorage).initialize();
      toolsStorage = new SQLiteToolsStorage(dbPath);
      await (toolsStorage as SQLiteToolsStorage).initialize();
      processorsStorage = new SQLiteProcessorsStorage(dbPath);
      await (processorsStorage as SQLiteProcessorsStorage).initialize();
      userStateStorage = new SQLiteUserStateStorage(dbPath);
      await (userStateStorage as SQLiteUserStateStorage).initialize();
      toolsGroupStorage = new SQLiteToolsGroupStorage(dbPath);
      await (toolsGroupStorage as SQLiteToolsGroupStorage).initialize();
      triggerStorage = new SQLiteTriggerStorage(dbPath);
      await (triggerStorage as SQLiteTriggerStorage).initialize();
      historyStorage = new SQLiteHistoryManager(dbPath, path.join(dataDir, 'images'));
      await checkMigrate();
      break;
    }
    case 'lowdb': {
      const ChatGPTStorage = (await import('./storage/lowdb/storage')).default;
      await ChatGPTStorage.init();
      channelsStorage = new LowDBChannelStorage(ChatGPTStorage);
      chatPresetsStorage = new LowDBChatPresetsStorage(ChatGPTStorage);
      toolsStorage = new LowDBToolsStorage(ChatGPTStorage);
      processorsStorage = new LowDBProcessorsStorage(ChatGPTStorage);
      userStateStorage = new LowDBUserStateStorage(ChatGPTStorage);
      triggerStorage = new LowDBTriggerStorage(ChatGPTStorage);
      const ChatGPTHistoryStorage = (await import('./storage/lowdb/storage')).ChatGPTHistoryStorage;
      await ChatGPTHistoryStorage.init();
      historyStorage = new LowDBHistoryManager(ChatGPTHistoryStorage);
      toolsGroupStorage = new SQLiteToolsGroupStorage(''); // 临时占位，LowDB 实现未提供
      break;
    }
    default: {
      throw new Error(`Unsupported storage type: ${storage}`);
    }
  }

  const channelsManager = await ChannelsManager.init(channelsStorage, new DefaultChannelLoadBalancer());
  const toolsDir = path.resolve(dir, 'src', config().chaite.toolsDirPath);
  if (!fs.existsSync(toolsDir)) {
    fs.mkdirSync(toolsDir, { recursive: true });
  }
  const toolsManager = await ToolManager.init(toolsDir, toolsStorage);
  const processorsDir = path.resolve(dir, 'src', config().chaite.processorsDirPath);
  if (!fs.existsSync(processorsDir)) {
    fs.mkdirSync(processorsDir, { recursive: true });
  }
  const processorsManager = await ProcessorsManager.init(processorsDir, processorsStorage);
  const chatPresetManager = await ChatPresetManager.init(chatPresetsStorage);
  const toolsGroupManager = await ToolsGroupManager.init(toolsGroupStorage);
  const triggersDir = path.resolve(dir, 'src', config().chaite.toolsDirPath);
  if (!fs.existsSync(triggersDir)) {
    fs.mkdirSync(triggersDir, { recursive: true });
  }
  const triggerManager = new TriggerManager(triggersDir, triggerStorage);
  await triggerManager.initialize()
  const userModeSelector = new ChatGPTUserModeSelector();
  const chaite = Chaite.init(
    channelsManager,
    toolsManager,
    processorsManager,
    chatPresetManager,
    toolsGroupManager,
    triggerManager,
    userModeSelector,
    userStateStorage,
    historyStorage,
    logger
  );
  logger.info('Chaite 初始化完成');
  chaite.setCloudService(config().chaite.cloudBaseUrl);
  logger.info('Chaite.Cloud 初始化完成');
  await migrateDatabase();
  if (config().chaite.cloudApiKey) {
    const user = await authCloud(config().chaite.cloudApiKey);
    if (user) {
      logger.info(`Chaite.Cloud 认证成功, 当前用户${user.username || user.email} (${user.user_id})`);
    } else {
      logger.warn('Chaite.Cloud 认证失败');
    }
  }
  await initRagManager(config().llm.embeddingModel, config().llm.dimensions);
  let currentConfig = config();
  if (!currentConfig.chaite.authKey) {
    currentConfig.chaite.authKey = Chaite.getInstance().getFrontendAuthHandler().generateToken(0, true);
  }
  chaite.getGlobalConfig()?.setAuthKey(currentConfig.chaite.authKey);
  currentConfig.save();
  // 监听Chaite配置变化，同步需要同步的配置
  chaite.on('config-change', obj => {
    const { key, newVal, oldVal } = obj;
    if (key === 'authKey') {
      let cfg = config()
      cfg.chaite.authKey = newVal;
      cfg.save();
    }
    logger.debug(`Chaite config changed: ${key} from ${oldVal} to ${newVal}`);
  });
  // 监听通过chaite对插件配置修改
  chaite.setUpdateConfigCallback(async customConfig => {
    logger.debug('chatgpt-plugin config updated');
    let cfg = config()
    Object.keys(customConfig).forEach(key => {
      if (typeof customConfig[key as keyof typeof customConfig] === 'object' && customConfig[key] !== null && (cfg as any)[key]) {
        deepMerge(cfg[key as keyof ChatGPTConfig] as Record<string, any>, customConfig[key] as Record<string, any>);
      } else {
        (cfg as any)[key] = customConfig[key];
      }
    });
    // 回传部分需要同步的配置
    chaite.getGlobalConfig()?.setDebug(cfg.basic.debug);
    chaite.getGlobalConfig()?.setAuthKey(cfg.chaite.authKey);
    cfg.save();
    return customConfig;
  });
  // 授予Chaite获取插件配置的能力以便通过api放出
  chaite.setGetConfig(async () => {
    return config();
  });
  chaite.getGlobalConfig()?.setHost(config().chaite.host);
  chaite.getGlobalConfig()?.setPort(config().chaite.port);
  chaite.getGlobalConfig()?.setDebug(config().basic.debug);
  logger.info('Chaite.RAGManager 初始化完成');
  chaite.runApiServer();
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param source 源对象
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): void {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && target[key]) {
        // 如果是对象且目标属性存在，递归合并
        deepMerge(target[key], source[key]);
      } else {
        // 否则直接赋值
        target[key] = source[key];
      }
    }
  }
}