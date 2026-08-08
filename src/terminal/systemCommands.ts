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

  // Extended Site-19 operations toolkit (realistic logs, light SCP redaction)
  defineCommand('personnel', async (_args, ctx) => {
    await ctx.stream(
      formatTableStream('tools.personnel', [10, 14, 6, 10], {
        user: ctx.user,
      }),
    )
  }),
  defineCommand('power', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.power.lines'))
  }),
  defineCommand('climate', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.climate.lines'))
  }),
  defineCommand('cameras', async (_args, ctx) => {
    await ctx.stream(formatTableStream('tools.cameras', [18, 8, 6, 18]))
  }),
  defineCommand('access', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.access.lines'))
  }),
  defineCommand('sra', async (_args, ctx) => {
    await ctx.stream(formatTableStream('tools.sra', [12, 10, 8, 12]))
  }),
  defineCommand('comms', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.comms.lines'))
  }),
  defineCommand('vault', async (_args, ctx) => {
    await ctx.stream(formatTableStream('tools.vault', [12, 10, 10, 10]))
  }),
  defineCommand('sensors', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.sensors.lines'))
  }),
  defineCommand('backup', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.backup.lines'))
  }),
  defineCommand('ps', async (_args, ctx) => {
    await ctx.stream(formatTableStream('tools.ps', [8, 10, 6, 8, 22]))
  }),
  defineCommand('memos', async (_args, ctx) => {
    await ctx.stream(formatStreamLines('tools.memos.lines'))
  }),
]
