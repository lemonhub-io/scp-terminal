import { t } from '../i18n'
import { formatStreamLines, formatTableStream, formatUptime } from '../i18n/format'
import type { Command } from './shell'

function defineCommand(name: string, run: Command['run']): Command {
  return {
    name,
    get usage() {
      return t(`shell.cmd.${name}.usage`)
    },
    get description() {
      return t(`shell.cmd.${name}.description`)
    },
    run,
  }
}

export const systemCommands: Command[] = [
  defineCommand('sysinfo', async (_args, ctx) => {
    await ctx.stream(
      formatStreamLines('system.sysinfo.lines', {
        uptime: formatUptime(),
      }),
    )
  }),
  defineCommand('check', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('system.check.lines'))
  }),
  defineCommand('network', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('system.network.lines'))
  }),
  defineCommand('services', async (_args, ctx) => {
    await ctx.stream(formatTableStream('system.services', [34, 9, 9, 10, 20]))
  }),
  defineCommand('disk', async (_args, ctx) => {
    await ctx.stream(formatTableStream('system.disk', [14, 8, 8, 8, 8, 8, 14]))
  }),
  defineCommand('security', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('system.security.lines'))
  }),
  defineCommand('trace', async (args, ctx) => {
    const target = args[0] ?? '8.8.8.8'
    await ctx.stream(formatStreamLines('system.trace.lines', { target }))
  }),
  defineCommand('containment', async (_args, ctx) => {
    await ctx.stream(
      formatTableStream('system.containment', [10, 10, 10, 24], {
        user: ctx.user,
      }),
    )
  }),
  defineCommand('log', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('system.log.lines'))
  }),
]
