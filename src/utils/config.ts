import { ChatGPTConfig } from '@/types/config'
import { dirPath, basename } from '@/utils'
import {
  watch,
  logger,
  karinPathBase,
  filesByExt,
  copyConfigSync,
  requireFileSync,
  yaml,
  fs,
  karinPathData, clearRequireFile,
} from 'node-karin'
import path from 'path'

const dir = `${karinPathBase}/${basename}`
const dirConfig = `${dir}/config`

const defDir = `${dirPath}/config`
const defConfig = `${defDir}/config`

if (!fs.existsSync(dirConfig)) {
  fs.mkdirSync(dirConfig)
}

/**
 * @description 初始化配置文件
 */
copyConfigSync(defConfig, dirConfig, ['.yaml'])

function mergeConfig (def: ChatGPTConfig, cfg: ChatGPTConfig): ChatGPTConfig {
  return {
    basic: { ...def.basic, ...cfg.basic },
    bym: { ...def.bym, ...cfg.bym },
    llm: { ...def.llm, ...cfg.llm },
    management: { ...def.management, ...cfg.management },
    chaite: { ...def.chaite, ...cfg.chaite },
  }
}

/**
 * @description 配置文件
 */
export const config = () => {
  const cfg = requireFileSync(`${dirConfig}/config.yaml`)
  const def = requireFileSync(`${defConfig}/config.yaml`)
  const data = mergeConfig(def as ChatGPTConfig, cfg as ChatGPTConfig)
  return Object.assign({}, data, {
    save: () => {
      yaml.save(`${dirConfig}/config.yaml`, data)
      clearRequireFile(`${dirConfig}/config.yaml`)
    }
  }) as ChatGPTConfig & {
    save: () => void
  }
}

/**
 * @description package.json
 */
export const pkg = () => requireFileSync(`${dirPath}/package.json`)

// /**
//  * @description 监听配置文件
//  */
// setTimeout(() => {
//   const list = filesByExt(dirConfig, '.yaml', 'abs')
//   list.forEach(file => watch(file, (old, now) => {
//     logger.info('旧数据:', old)
//     logger.info('新数据:', now)
//   }))
// }, 2000)

export const dataDir = path.resolve(karinPathData, config().chaite.dataDir)
