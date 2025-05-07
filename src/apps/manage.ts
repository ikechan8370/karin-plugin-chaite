import { common, karin } from 'node-karin'
import { config } from '@/utils/config'
import { Chaite, VERSION } from 'chaite'
import * as crypto from 'node:crypto'

// Utility function to get Chaite instance (or wait until it's available)
const getChaiteInstance = async (): Promise<Chaite> => {
  if (!Chaite.getInstance()) {
    while (!Chaite.getInstance()) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return Chaite.getInstance()
}

// Utility function to get the appropriate manager
const getManagerByName = (name: string) => {
  const chaite = Chaite.getInstance()
  switch (name.toLowerCase()) {
    case 'channels':
      return chaite.getChannelsManager()
    case 'presets':
      return chaite.getChatPresetManager()
    case 'processors':
      return chaite.getProcessorsManager()
    case 'tools':
      return chaite.getToolsManager()
    default:
      return null
  }
}

// Management panel command
export const panel = karin.command(new RegExp(`^${config().basic.commandPrefix}管理面板$`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const chaite = await getChaiteInstance()
  const token = chaite.getFrontendAuthHandler().generateToken(300)
  await e.reply(`token: ${token}, 有效期300秒`, { reply: true })
})

// Destroy conversation command
export const endConv = karin.command(new RegExp(`^(${config().basic.commandPrefix})?#?结束(全部)?对话$`), async (e) => {
  const chaite = await getChaiteInstance()

  if (e.msg.includes('全部')) {
    if (!e.isMaster) {
      await e.reply('仅限主人使用')
      return
    }

    const userStates = await chaite.getUserStateStorage().listItems()
    for (const userState of userStates) {
      if (userState.current.conversationId && userState.current.messageId) {
        userState.current.conversationId = crypto.randomUUID()
        userState.current.messageId = crypto.randomUUID()
        await chaite.getUserStateStorage().setItem(userState.userId + '', userState)
      }
    }
    await e.reply('已结束全部对话')
  } else {
    const state = await chaite.getUserStateStorage().getItem(e.sender.userId + '')
    if (!state || !state.current.conversationId || !state.current.messageId) {
      await e.reply('当前未开启对话')
      return
    }

    state.current.conversationId = crypto.randomUUID()
    state.current.messageId = crypto.randomUUID()
    await chaite.getUserStateStorage().setItem(e.sender.userId + '', state)
    await e.reply('已结束当前对话')
  }
})

// Set default BYM preset command
export const bym = karin.command(new RegExp(`^${config().basic.commandPrefix}(bym|伪人)设置默认预设`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const currentConfig = config()
  const chaite = await getChaiteInstance()
  const presetId = e.msg.replace(`${currentConfig.basic.commandPrefix}伪人设置默认预设`, '')
    .replace(`${currentConfig.basic.commandPrefix}bym设置默认预设`, '')
  const preset = await chaite.getChatPresetManager().getInstance(presetId)

  if (preset) {
    currentConfig.bym.defaultPreset = presetId
    await e.reply(`伪人模式默认预设已切换为${presetId}(${preset.name})`)
  } else {
    await e.reply(`未找到预设${presetId}`)
  }
})

// Current status command
export const status = karin.command(new RegExp(`^${config().basic.commandPrefix}(查看)?(当前)?(配置|信息|统计信息|状态)$`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const currentConfig = config()
  const chaite = await getChaiteInstance()
  const msgs: string[] = []

  // Basic info
  let basic = `Chaite版本：${VERSION}\n`
  const user = chaite.getToolsManager().cloudService?.getUser()
  if (user) {
    basic += `Chaite Cloud：已认证 @${user.username}`
  } else if (currentConfig.chaite.cloudBaseUrl) {
    basic += 'Chaite Cloud: 未认证'
  } else {
    basic += 'Chaite Cloud: 未接入'
  }
  msgs.push(basic)

  // Channels info
  const allChannels = await chaite.getChannelsManager().getAllChannels()
  let channelMsg = `渠道总数：${allChannels.length}\n`
  channelMsg += `请使用 ${currentConfig.basic.commandPrefix}渠道列表 查看全部渠道\n\n`

  allChannels.map(c => c.models).reduce((acc: string[], cur) => {
    acc.push(...cur)
    return acc
  }, []).forEach(m => {
    channelMsg += `${m}：${allChannels.filter(c => c.models.includes(m)).length}个\n`
  })
  msgs.push(channelMsg)

  // Presets info
  const allPresets = await chaite.getChatPresetManager().getAllPresets()
  let presetMsg = `预设总数：${allPresets.length}\n`
  presetMsg += `请使用 ${currentConfig.basic.commandPrefix}预设列表 查看全部预设`
  msgs.push(presetMsg)

  // Current preset info
  const defaultChatPresetId = currentConfig.llm.defaultChatPresetId
  const currentPreset = await chaite.getChatPresetManager().getInstance(defaultChatPresetId)
  msgs.push(`当前预设：${currentPreset?.name || '未设置'}${currentPreset ? ('\n\n' + currentPreset.toFormatedString(false)) : ''}`)

  // Tools info
  const allTools = await chaite.getToolsManager().listInstances()
  let toolsMsg = `工具总数：${allTools.length}\n`
  toolsMsg += `请使用 ${currentConfig.basic.commandPrefix}工具列表 查看全部工具`
  msgs.push(toolsMsg)

  // Processors info
  const allProcessors = await chaite.getProcessorsManager().listInstances()
  let processorsMsg = `处理器总数：${allProcessors.length}\n`
  processorsMsg += `请使用 ${currentConfig.basic.commandPrefix}处理器列表 查看全部处理器`
  msgs.push(processorsMsg)

  // User stats info
  const userStatesManager = chaite.getUserStateStorage()
  const allUsers = await userStatesManager.listItems()
  const currentUserNums = allUsers.filter(u => u.current.conversationId && u.current.messageId).length
  const historyUserNums = allUsers.length
  msgs.push(`用户总数：${historyUserNums}\n当前对话用户数：${currentUserNums}`)

  const m = common.makeForward(msgs)
  await e.bot.sendForwardMsg(e.contact, m)
})

// CRUD Commands - Using a single function for each CRUD operation category

// List command - unified for all manager types
export const listCmd = karin.command(new RegExp(`^${config().basic.commandPrefix}(渠道|预设|工具|处理器|预设切换黑名单|预设切换白名单|输入屏蔽词|输出屏蔽词|黑名单群|白名单群|黑名单用户|白名单用户)列表$`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}(.+)列表$`))
  if (!nameMatch) return

  const name = nameMatch[1]

  // Handle list arrays in config
  if (['预设切换黑名单', '预设切换白名单', '输入屏蔽词', '输出屏蔽词', '黑名单群', '白名单群', '黑名单用户', '白名单用户'].includes(name)) {
    const currentConfig = config()
    let list: any[] = []

    switch (name) {
      case '预设切换黑名单':
        list = currentConfig.llm.customPresetUserBlackList
        break
      case '预设切换白名单':
        list = currentConfig.llm.customPresetUserWhiteList
        break
      case '输入屏蔽词':
        list = currentConfig.llm.promptBlockWords
        break
      case '输出屏蔽词':
        list = currentConfig.llm.responseBlockWords
        break
      case '黑名单群':
        list = currentConfig.management.blackGroups
        break
      case '白名单群':
        list = currentConfig.management.whiteGroups
        break
      case '黑名单用户':
        list = currentConfig.management.blackUsers
        break
      case '白名单用户':
        list = currentConfig.management.whiteUsers
        break
    }

    if (list.length === 0) {
      await e.reply(`${name}为空`)
      return
    }

    await e.reply(`${name}：\n${list.join('\n')}`)
    return
  }

  // Handle manager instances
  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  const managerName = managerMap[name]
  if (!managerName) return

  const manager = getManagerByName(managerName)
  const verbose = !e.isGroup

  if (manager) {
    const instances = await manager.listInstances()
    if (instances.length === 0) {
      await e.reply(`暂无${name}`)
      return
    }
    const msgs = instances.map(i => i.toFormatedString(verbose))
    const m = common.makeForward(msgs)
    await e.bot.sendForwardMsg(e.contact, m)
  }
})

// Edit command - unified for all types
export const editCmd = karin.command(new RegExp(`^${config().basic.commandPrefix}(编辑|修改)(渠道|预设|工具|处理器|预设切换黑名单|预设切换白名单|输入屏蔽词|输出屏蔽词|黑名单群|白名单群|黑名单用户|白名单用户)`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}(编辑|修改)(.+)`))
  if (!nameMatch) return

  const name = nameMatch[2]
  await e.reply(`暂不支持编辑${name}，请使用后台管理面板编辑或使用添加和删除功能`)
})

// Add command - unified for all types
export const all = karin.command(new RegExp(`^${config().basic.commandPrefix}(添加|新增)(渠道|预设|工具|处理器|预设切换黑名单|预设切换白名单|输入屏蔽词|输出屏蔽词|黑名单群|白名单群|黑名单用户|白名单用户)`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}(添加|新增)(.+)$`))
  if (!nameMatch) return

  const name = nameMatch[2]
  const id = e.msg.replace(new RegExp(`^${cmdPrefix}(添加|新增)${name}`), '')

  // Handle manager instances
  if (['渠道', '预设', '工具', '处理器'].includes(name)) {
    await e.reply(`暂不支持添加${name}，请使用后台管理面板添加`)
    return
  }

  // Handle config arrays
  const currentConfig = config()

  switch (name) {
    case '预设切换黑名单':
      if (currentConfig.llm.customPresetUserBlackList.includes(id)) {
        await e.reply('该用户已在预设切换黑名单中')
      } else {
        currentConfig.llm.customPresetUserBlackList.push(id)
        await e.reply('已添加至预设切换黑名单')
      }
      break

    case '预设切换白名单':
      if (currentConfig.llm.customPresetUserWhiteList.includes(id)) {
        await e.reply('该用户已在预设切换白名单中')
      } else {
        currentConfig.llm.customPresetUserWhiteList.push(id)
        await e.reply('已添加至预设切换白名单')
      }
      break

    case '输入屏蔽词':
      if (currentConfig.llm.promptBlockWords.includes(id)) {
        await e.reply('该词已在输入屏蔽词中')
      } else {
        currentConfig.llm.promptBlockWords.push(id)
        await e.reply('已添加至输入屏蔽词')
      }
      break

    case '输出屏蔽词':
      if (currentConfig.llm.responseBlockWords.includes(id)) {
        await e.reply('该词已在输出屏蔽词中')
      } else {
        currentConfig.llm.responseBlockWords.push(id)
        await e.reply('已添加至输出屏蔽词')
      }
      break

    case '黑名单群': {
      const blackGroupId = parseInt(id)
      if (isNaN(blackGroupId)) {
        await e.reply('请输入有效的群号')
        return
      }
      if (currentConfig.management.blackGroups.includes(blackGroupId)) {
        await e.reply('该群已在黑名单中')
      } else {
        currentConfig.management.blackGroups.push(blackGroupId)
        await e.reply('已添加至黑名单群')
      }
      break
    }

    case '白名单群': {
      const whiteGroupId = parseInt(id)
      if (isNaN(whiteGroupId)) {
        await e.reply('请输入有效的群号')
        return
      }
      if (currentConfig.management.whiteGroups.includes(whiteGroupId)) {
        await e.reply('该群已在白名单中')
      } else {
        currentConfig.management.whiteGroups.push(whiteGroupId)
        await e.reply('已添加至白名单群')
      }
      break
    }

    case '黑名单用户':
      if (currentConfig.management.blackUsers.includes(id)) {
        await e.reply('该用户已在黑名单中')
      } else {
        currentConfig.management.blackUsers.push(id)
        await e.reply('已添加至黑名单用户')
      }
      break

    case '白名单用户':
      if (currentConfig.management.whiteUsers.includes(id)) {
        await e.reply('该用户已在白名单中')
      } else {
        currentConfig.management.whiteUsers.push(id)
        await e.reply('已添加至白名单用户')
      }
      break
  }
})

// Delete command - unified for all types
export const deleteCmd = karin.command(new RegExp(`^${config().basic.commandPrefix}删除(渠道|预设|工具|处理器|预设切换黑名单|预设切换白名单|输入屏蔽词|输出屏蔽词|黑名单群|白名单群|黑名单用户|白名单用户)`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}删除(.+)`))
  if (!nameMatch) return

  const name = nameMatch[1]
  const id = e.msg.replace(new RegExp(`^${cmdPrefix}删除${name}`), '')

  // Handle manager instances
  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  if (name in managerMap) {
    const manager = getManagerByName(managerMap[name])
    if (manager) {
      const instance = await manager.getInstance(id)
      if (instance) {
        await manager.deleteInstance(id)
        await e.reply(`已删除${name}`)
      } else {
        await e.reply(`${name}不存在`)
      }
    }
    return
  }

  // Handle config arrays
  const currentConfig = config()

  switch (name) {
    case '预设切换黑名单':
    { const blackListIndex = currentConfig.llm.customPresetUserBlackList.indexOf(id)
      if (blackListIndex > -1) {
        currentConfig.llm.customPresetUserBlackList.splice(blackListIndex, 1)
        await e.reply('已从预设切换黑名单中移除')
      } else {
        await e.reply('该用户不在预设切换黑名单中')
      }
      break }

    case '预设切换白名单':
    { const whiteListIndex = currentConfig.llm.customPresetUserWhiteList.indexOf(id)
      if (whiteListIndex > -1) {
        currentConfig.llm.customPresetUserWhiteList.splice(whiteListIndex, 1)
        await e.reply('已从预设切换白名单中移除')
      } else {
        await e.reply('该用户不在预设切换白名单中')
      }
      break }

    case '输入屏蔽词':
    { const promptBlockIndex = currentConfig.llm.promptBlockWords.indexOf(id)
      if (promptBlockIndex > -1) {
        currentConfig.llm.promptBlockWords.splice(promptBlockIndex, 1)
        await e.reply('已从输入屏蔽词中移除')
      } else {
        await e.reply('该词不在输入屏蔽词中')
      }
      break }

    case '输出屏蔽词':
    { const responseBlockIndex = currentConfig.llm.responseBlockWords.indexOf(id)
      if (responseBlockIndex > -1) {
        currentConfig.llm.responseBlockWords.splice(responseBlockIndex, 1)
        await e.reply('已从输出屏蔽词中移除')
      } else {
        await e.reply('该词不在输出屏蔽词中')
      }
      break }

    case '黑名单群':
    { const blackGroupId = parseInt(id)
      if (isNaN(blackGroupId)) {
        await e.reply('请输入有效的群号')
        return
      }
      const blackGroupIndex = currentConfig.management.blackGroups.indexOf(blackGroupId)
      if (blackGroupIndex > -1) {
        currentConfig.management.blackGroups.splice(blackGroupIndex, 1)
        await e.reply('已从黑名单群中移除')
      } else {
        await e.reply('该群不在黑名单中')
      }
      break }

    case '白名单群':
    { const whiteGroupId = parseInt(id)
      if (isNaN(whiteGroupId)) {
        await e.reply('请输入有效的群号')
        return
      }
      const whiteGroupIndex = currentConfig.management.whiteGroups.indexOf(whiteGroupId)
      if (whiteGroupIndex > -1) {
        currentConfig.management.whiteGroups.splice(whiteGroupIndex, 1)
        await e.reply('已从白名单群中移除')
      } else {
        await e.reply('该群不在白名单中')
      }
      break }

    case '黑名单用户':
    { const blackUserIndex = currentConfig.management.blackUsers.indexOf(id)
      if (blackUserIndex > -1) {
        currentConfig.management.blackUsers.splice(blackUserIndex, 1)
        await e.reply('已从黑名单用户中移除')
      } else {
        await e.reply('该用户不在黑名单中')
      }
      break }

    case '白名单用户':
    { const whiteUserIndex = currentConfig.management.whiteUsers.indexOf(id)
      if (whiteUserIndex > -1) {
        currentConfig.management.whiteUsers.splice(whiteUserIndex, 1)
        await e.reply('已从白名单用户中移除')
      } else {
        await e.reply('该用户不在白名单中')
      }
      break }
  }
})

// Detail command - for channels, presets, tools, processors
export const detail = karin.command(new RegExp(`^${config().basic.commandPrefix}(渠道|预设|工具|处理器)详情`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}(.+)详情`))
  if (!nameMatch) return

  const name = nameMatch[1]
  const id = e.msg.replace(new RegExp(`^${cmdPrefix}${name}详情`), '')

  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  const managerName = managerMap[name]
  if (!managerName) return

  const manager = getManagerByName(managerName)
  const verbose = !e.isGroup

  if (manager) {
    const instance = await manager.getInstance(id)
    if (instance) {
      // 由于不同类型的实例可能有不同的格式化方法，需要分别处理
      if ('toFormatedString' in instance) {
        await e.reply(instance.toFormatedString(verbose))
      } else {
        // 如果没有toFormatedString方法，则使用JSON.stringify作为备选
        await e.reply(JSON.stringify(instance, null, 2))
      }
    } else {
      await e.reply(`${name}不存在`)
    }
  }
})

// Upload command - for channels, presets, tools, processors
karin.command(new RegExp(`^${config().basic.commandPrefix}上传(渠道|预设|工具|处理器)`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}上传(.+)`))
  if (!nameMatch) return

  const name = nameMatch[1]
  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  // Extract the real name (in case it has an ID after it)
  let realName = name
  for (const key of Object.keys(managerMap)) {
    if (name.startsWith(key)) {
      realName = key
      break
    }
  }

  const id = e.msg.replace(new RegExp(`^${cmdPrefix}上传${realName}`), '')

  const managerName = managerMap[realName]
  if (!managerName) return

  const manager = getManagerByName(managerName)

  if (manager) {
    const instance = 'getInstanceT' in manager ? await manager.getInstanceT(id) : await manager.getInstance(id)
    if (instance) {
      const result = await manager.shareToCloud(id)
      if (result) {
        await e.reply(`上传成功，云端${realName}ID为：${result}`)
      } else {
        await e.reply('上传失败')
      }
    } else {
      await e.reply(`${realName}不存在`)
    }
  }
})

// List cloud command - for channels, presets, tools, processors
export const listCloud = karin.command(new RegExp(`^${config().basic.commandPrefix}浏览云端(渠道|预设|工具|处理器)`), async (e) => {
  const cmdPrefix = config().basic.commandPrefix
  const match = e.msg.match(new RegExp(`^${cmdPrefix}浏览云端(渠道|预设|工具|处理器)(.*?)(页码(\\d+))?$`))
  if (!match) return

  const name = match[1]
  const query = match[2].trim()
  const page = match[4] ? parseInt(match[4]) : 1

  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  const managerName = managerMap[name]
  if (!managerName) return

  const manager = getManagerByName(managerName)

  if (manager) {
    const result = await manager.listFromCloud({}, query, {
      page,
      pageSize: 10,
      searchFields: ['name', 'description']
    })

    if (result?.items && result.items.length > 0) {
      const msgs = result.items.map(i => i.toFormatedString(!e.isGroup))
      const { currentPage, totalPages, totalItems, pageSize } = result.pagination
      const pageInfo = `云端${name}查询结果 - 第${currentPage}/${totalPages}页，共${totalItems}条，每页${pageSize}条`

      let pageHint = ''
      if (result.pagination.hasNextPage) {
        pageHint += `\n发送 ${cmdPrefix}浏览云端${name}${query || ''}页码${currentPage + 1} 查看下一页`
      }
      if (result.pagination.hasPreviousPage) {
        pageHint += `\n发送 ${cmdPrefix}浏览云端${name}${query || ''}页码${currentPage - 1} 查看上一页`
      }

      // Add pageInfo and pageHint to the messages
      msgs.push(pageInfo + pageHint)

      const m = common.makeForward(msgs)
      await e.bot.sendForwardMsg(e.contact, m)
    } else {
      await e.reply('未找到相关的云端内容或页码超出范围')
    }
  }
})

// Import cloud command - for channels, presets, tools, processors
export const importCloud = karin.command(new RegExp(`^${config().basic.commandPrefix}导入(渠道|预设|工具|处理器)`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const cmdPrefix = config().basic.commandPrefix
  const nameMatch = e.msg.match(new RegExp(`^${cmdPrefix}导入(.+)`))
  if (!nameMatch) return

  const name = nameMatch[1]

  const managerMap: Record<string, string> = {
    渠道: 'Channels',
    预设: 'Presets',
    工具: 'Tools',
    处理器: 'Processors'
  }

  // Extract the real name (in case it has an ID after it)
  let realName = name
  for (const key of Object.keys(managerMap)) {
    if (name.startsWith(key)) {
      realName = key
      break
    }
  }

  const id = e.msg.replace(new RegExp(`^${cmdPrefix}导入${realName}`), '')

  if (!id) {
    await e.reply(`格式错误，正确格式：${cmdPrefix}导入${realName}[id]`)
    return
  }

  const managerName = managerMap[realName]
  if (!managerName) return

  const manager = getManagerByName(managerName)

  if (manager) {
    // 检查manager是否有getInstanceByCloudId或getInstanceTByCloudId方法
    const instance = 'getInstanceByCloudId' in manager
      ? (await manager.getInstanceByCloudId(id))
      : (await manager?.getInstanceTByCloudId?.(id))

    if (instance) {
      await e.reply(`${realName}已存在，尝试导入最新版本`, { reply: true })
    }

    const result = await manager.getFromCloud(id)
    if (result) {
      result.cloudId = result.id
      // @ts-ignore
      delete result.id
      const newId = await manager.addInstance(result as any)
      await e.reply(`导入成功，${realName}ID为：${newId}`, { reply: true })
    } else {
      await e.reply(`获取${realName}失败，请检查id是否正确`, { reply: true })
    }
  }
})

// Switch commands
const switchCommandRegExps = [
  // [regExp, configPath, enableWord, disableWord, featureName]
  [new RegExp(`^${config().basic.commandPrefix}(允许|禁止)(预设切换|其他人切换预设)$`), 'llm.enableCustomPreset', '允许', '禁止', '预设切换'],
  [new RegExp(`^${config().basic.commandPrefix}(开启|关闭)(调试|debug)(模式)?$`), 'basic.debug', '开启', '关闭', '调试模式'],
  [new RegExp(`^${config().basic.commandPrefix}(开启|关闭)(伪人|bym)$`), 'bym.enable', '开启', '关闭', '伪人模式']
]

// Register all switch commands
export const managementPanel = karin.command(new RegExp(`^${config().basic.commandPrefix}管理面板$`), async (e) => {
  if (!e.isMaster) {
    await e.reply('仅限主人使用')
    return
  }

  const chaite = await getChaiteInstance()
  const token = chaite.getFrontendAuthHandler().generateToken(300)
  await e.reply(`token: ${token}, 有效期300秒`, { reply: true })
})

// 对于switch命令，需要单独为每个命令创建导出:
export const switchPresetCustomization = karin.command(
  new RegExp(`^${config().basic.commandPrefix}(允许|禁止)(预设切换|其他人切换预设)$`),
  async (e) => {
    if (!e.isMaster) {
      await e.reply('仅限主人使用')
      return
    }

    const isEnable = e.msg.includes('允许')
    const currentConfig = config()
    currentConfig.llm.enableCustomPreset = isEnable
    await e.reply(`已${isEnable ? '允许' : '禁止'}预设切换`)
  }
)

// Switch command for debug mode
export const switchDebugMode = karin.command(
  new RegExp(`^${config().basic.commandPrefix}(开启|关闭)(调试|debug)(模式)?$`),
  async (e) => {
    if (!e.isMaster) {
      await e.reply('仅限主人使用')
      return
    }

    const isEnable = e.msg.includes('开启')
    const currentConfig = config()
    currentConfig.basic.debug = isEnable
    await e.reply(`已${isEnable ? '开启' : '关闭'}调试模式`)
  }
)

// Switch command for bym mode
export const switchBymMode = karin.command(
  new RegExp(`^${config().basic.commandPrefix}(开启|关闭)(伪人|bym)$`),
  async (e) => {
    if (!e.isMaster) {
      await e.reply('仅限主人使用')
      return
    }

    const isEnable = e.msg.includes('开启')
    const currentConfig = config()
    currentConfig.bym.enable = isEnable
    await e.reply(`已${isEnable ? '开启' : '关闭'}伪人模式`)
  }
)

// Export plugin metadata
export const pluginName = 'ChatGPT-Plugin管理'
export const pluginDesc = 'ChatGPT-Plugin管理功能'
