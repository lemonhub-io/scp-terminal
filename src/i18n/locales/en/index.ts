import ui from './ui'
import shell from './shell'
import boot from './boot'
import system from './system'

export default {
  ...ui,
  ...shell,
  ...boot,
  ...system,
} as const
