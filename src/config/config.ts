import fs, { StatWatcher } from 'fs'
import path from 'path'
import yaml from 'js-yaml'

interface BasicConfig {
  toggleMode: 'at' | 'prefix'
  togglePrefix: string
  debug: boolean
  commandPrefix: string
}

interface BymConfig {
  enable: boolean
  hit: string[]
  probability: number
  defaultPreset: string
  presetPrefix?: string
  presetMap: Array<{
    keywords: string[]
    presetId: string
    priority: number
    recall?: boolean
  }>
  maxTokens: number
  temperature: number
  sendReasoning: boolean
}

interface LLMConfig {
  defaultModel: string
  embeddingModel: string
  dimensions: number
  defaultChatPresetId: string
  enableCustomPreset: boolean
  customPresetUserWhiteList: string[]
  customPresetUserBlackList: string[]
  promptBlockWords: string[]
  responseBlockWords: string[]
  blockStrategy: 'full' | 'mask'
  blockWordMask: string
  enableGroupContext: boolean
  groupContextLength: number
  groupContextTemplatePrefix: string
  groupContextTemplateMessage: string
  groupContextTemplateSuffix: string
}

interface ManagementConfig {
  blackGroups: number[]
  whiteGroups: number[]
  blackUsers: string[]
  whiteUsers: string[]
  defaultRateLimit: number
}

interface ChaiteConfig {
  dataDir: string
  processorsDirPath: string
  toolsDirPath: string
  cloudBaseUrl: string
  cloudApiKey: string
  authKey: string
  host: string
  port: number
  storage: 'sqlite' | 'lowdb'
}

class ChatGPTConfig {
  basic: BasicConfig = {
    toggleMode: 'at',
    togglePrefix: '#chat',
    debug: false,
    commandPrefix: '#chatgpt'
  }

  bym: BymConfig = {
    enable: false,
    hit: ['bym'],
    probability: 0.02,
    defaultPreset: '',
    presetPrefix: '',
    presetMap: [],
    maxTokens: 0,
    temperature: -1,
    sendReasoning: false
  }

  llm: LLMConfig = {
    defaultModel: '',
    embeddingModel: 'gemini-embedding-exp-03-07',
    dimensions: 0,
    defaultChatPresetId: '',
    enableCustomPreset: false,
    customPresetUserWhiteList: [],
    customPresetUserBlackList: [],
    promptBlockWords: [],
    responseBlockWords: [],
    blockStrategy: 'full',
    blockWordMask: '***',
    enableGroupContext: false,
    groupContextLength: 20,
    groupContextTemplatePrefix: '<settings>\n' +
    // eslint-disable-next-line no-template-curly-in-string
            'You are a member of a chat group, whose name is ${group.name}, and the group id is ${group.id}.\n' +
            '</settings>Latest several messages in the group chat:\n' +
            '｜ 群名片 | 昵称 | qq号 | 群角色 | 群头衔 | 时间 | messageId | 消息内容 |\n' +
            '|---|---|---|---|---|---|---|---|',
    // eslint-disable-next-line no-template-curly-in-string
    groupContextTemplateMessage: '| ${message.sender.card} | ${message.sender.nickname} | ${message.sender.user_id} | ${message.sender.role} | ${message.sender.title} | ${message.time} | ${message.messageId} | ${message.raw_message} |',
    groupContextTemplateSuffix: '\n'
  }

  management: ManagementConfig = {
    blackGroups: [],
    whiteGroups: [],
    blackUsers: [],
    whiteUsers: [],
    defaultRateLimit: 0
  }

  chaite: ChaiteConfig = {
    dataDir: 'data',
    processorsDirPath: 'utils/processors',
    toolsDirPath: 'utils/tools',
    cloudBaseUrl: 'https://api.chaite.cloud',
    cloudApiKey: '',
    authKey: '',
    host: '0.0.0.0',
    port: 48370,
    storage: 'sqlite'
  }

  configPath: string = ''
  watcher: StatWatcher | null = null
  _saveOrigin: string | null = null
  _saveTimer: NodeJS.Timeout | null = null

  /**
     * Start config file sync
     * call once!
     * @param {string} configDir Directory containing config files
     */
  startSync (configDir: string): ChatGPTConfig {
    // 配置路径设置
    const jsonPath = path.join(configDir, 'config.json')
    const yamlPath = path.join(configDir, 'config.yaml')

    if (fs.existsSync(jsonPath)) {
      this.configPath = jsonPath
    } else if (fs.existsSync(yamlPath)) {
      this.configPath = yamlPath
    } else {
      this.configPath = jsonPath
      this.saveToFile()
    }

    // 加载初始配置
    this.loadFromFile()

    // 文件变更标志和保存定时器
    this._saveOrigin = null
    this._saveTimer = null

    // 监听文件变化
    this.watcher = fs.watchFile(this.configPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime && this._saveOrigin !== 'code') {
        this.loadFromFile()
      }
    })

    // 处理所有嵌套对象
    return this._createProxyRecursively(this)
  }

  // 递归创建代理
  _createProxyRecursively<T>(obj: T, path: (string | number)[] = []): T {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj
    }

    // 处理数组和对象
    if (Array.isArray(obj)) {
      // 创建一个新数组，递归地处理每个元素
      const proxiedArray = [...obj].map((item, index) =>
        this._createProxyRecursively(item, [...path, index])
      )

      // 代理数组，捕获数组方法调用
      return new Proxy(proxiedArray, {
        set: (target, prop, value) => {
          // 处理数字属性（数组索引）和数组长度
          if (typeof prop !== 'symbol' &&
                        ((!isNaN(Number(prop)) && prop !== 'length') ||
                            prop === 'length')) {
            // 直接设置值
            target[prop as any] = value

            // 触发保存
            this._triggerSave('array')
          } else {
            target[prop as any] = value
          }
          return true
        },

        // 拦截数组方法调用
        get: (target, prop) => {
          const val = target[prop as any]

          // 处理数组修改方法
          if (typeof val === 'function' &&
                        ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(prop as string)) {
            return function (...args: any[]) {
              const result = Array.prototype[prop as any].apply(target, args)

              // 方法调用后触发保存
              // @ts-ignore
              this._triggerSave('array-method')
              return result
            }.bind(this)
          }

          return val
        }
      }) as T
    } else {
      // 对普通对象的处理
      const proxiedObj: any = {}

      // 处理所有属性
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // 跳过内部属性
          if (key === 'watcher' || key === 'configPath' ||
                        key.startsWith('_save') || key === '_isSaving') {
            proxiedObj[key] = (obj as any)[key]
          } else {
            // 递归处理嵌套对象
            proxiedObj[key] = this._createProxyRecursively(
              (obj as any)[key], [...path, key]
            )
          }
        }
      }

      // 创建对象的代理
      return new Proxy(proxiedObj, {
        set: (target, prop, value) => {
          // 跳过内部属性的处理
          if (typeof prop === 'string' &&
                        (prop === 'watcher' || prop === 'configPath' ||
                            prop.startsWith('_save') || prop === '_isSaving')) {
            target[prop] = value
            return true
          }

          // 设置新值，如果是对象则递归创建代理
          if (value !== null && typeof value === 'object') {
            target[prop as string] = this._createProxyRecursively(
              value, [...path, prop as string]
            )
          } else {
            target[prop as string] = value
          }

          // 触发保存
          this._triggerSave('object')
          return true
        }
      }) as T
    }
  }

  loadFromFile (): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        // 如果文件不存在，直接返回
        return
      }

      const content = fs.readFileSync(this.configPath, 'utf8')
      const loadedConfig: Partial<ChatGPTConfig> = this.configPath.endsWith('.json')
        ? JSON.parse(content)
        : yaml.load(content) as Partial<ChatGPTConfig>

      // 只更新存在的配置项
      if (loadedConfig) {
        Object.keys(loadedConfig).forEach(key => {
          if (key === 'version' || key === 'basic' || key === 'bym' || key === 'llm' ||
                        key === 'management' || key === 'chaite') {
            const typedKey = key as keyof ChatGPTConfig
            if (typeof loadedConfig[typedKey] === 'object' && loadedConfig[typedKey] !== null) {
              // 对象的合并
              if (!this[typedKey]) this[typedKey] = {} as any
              // @ts-ignore
              Object.assign(this[typedKey], loadedConfig[typedKey])
            } else {
              // 基本类型直接赋值
              this[typedKey] = loadedConfig[typedKey] as any
            }
          }
        })
      }

      console.log('Config loaded successfully')
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  // 合并触发保存，防抖处理
  _triggerSave (origin?: string): void {
    // 清除之前的定时器
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
    }

    // 记录保存来源
    this._saveOrigin = origin || 'code'

    // 设置定时器延迟保存
    this._saveTimer = setTimeout(() => {
      this.saveToFile()
      // 保存完成后延迟一下再清除来源标记
      setTimeout(() => {
        this._saveOrigin = null
      }, 100)
    }, 200)
  }

  saveToFile (): void {
    console.log('Saving config to file...')
    try {
      const config = {
        basic: this.basic,
        bym: this.bym,
        llm: this.llm,
        management: this.management,
        chaite: this.chaite
      }

      const content = this.configPath.endsWith('.json')
        ? JSON.stringify(config, null, 2)
        : yaml.dump(config)

      fs.writeFileSync(this.configPath, content, 'utf8')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  toJSON () {
    return {
      basic: this.basic,
      bym: this.bym,
      llm: this.llm,
      management: this.management,
      chaite: this.chaite
    }
  }
}

// Create and export a singleton instance
export default new ChatGPTConfig()
