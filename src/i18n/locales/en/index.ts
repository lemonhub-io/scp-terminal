import ui from './ui'
import shell from './shell'
import boot from './boot'
import system from './system'
import tools from './tools'

export default {
  ...ui,
  ...shell,
  ...boot,
  ...system,
  ...tools,
} as const
