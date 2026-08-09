import { t } from '../i18n'
import { formatStreamLines, formatTableStream } from '../i18n/format'
import { collectDynamicParams } from './dynamicParams'
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

async function streamKey(
  key: string,
  ctxUser: string,
  extra: Record<string, string> = {},
): Promise<string> {
  return formatStreamLines(key, await collectDynamicParams({ user: ctxUser, ...extra }))
}

async function streamTable(
  baseKey: string,
  widths: number[],
  ctxUser: string,
  extra: Record<string, string> = {},
): Promise<string> {
  return formatTableStream(baseKey, widths, await collectDynamicParams({ user: ctxUser, ...extra }))
}

export const systemCommands: Command[] = [
  defineCommand('sysinfo', async (_args, ctx) => {
    await ctx.stream(await streamKey('system.sysinfo.lines', ctx.user))
  }),
  defineCommand('check', async (_args, ctx) => {
    await ctx.stream(await streamKey('system.check.lines', ctx.user))
  }),
  defineCommand('network', async (_args, ctx) => {
    await ctx.stream(await streamKey('system.network.lines', ctx.user))
  }),
  defineCommand('services', async (_args, ctx) => {
    await ctx.stream(await streamTable('system.services', [34, 9, 9, 10, 20], ctx.user))
  }),
  defineCommand('disk', async (_args, ctx) => {
    await ctx.stream(await streamTable('system.disk', [14, 8, 8, 8, 8, 8, 14], ctx.user))
  }),
  defineCommand('security', async (_args, ctx) => {
    await ctx.stream(await streamKey('system.security.lines', ctx.user))
  }),
  defineCommand('trace', async (args, ctx) => {
    const target = args[0] ?? '8.8.8.8'
    await ctx.stream(await streamKey('system.trace.lines', ctx.user, { target }))
  }),
  defineCommand('containment', async (_args, ctx) => {
    await ctx.stream(await streamTable('system.containment', [10, 10, 10, 24], ctx.user))
  }),
  defineCommand('log', async (_args, ctx) => {
    await ctx.stream(await streamKey('system.log.lines', ctx.user))
  }),
  defineCommand('personnel', async (_args, ctx) => {
    await ctx.stream(await streamTable('tools.personnel', [10, 14, 6, 10], ctx.user))
  }),
  defineCommand('power', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.power.lines', ctx.user))
  }),
  defineCommand('climate', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.climate.lines', ctx.user))
  }),
  defineCommand('cameras', async (_args, ctx) => {
    await ctx.stream(await streamTable('tools.cameras', [18, 8, 6, 18], ctx.user))
  }),
  defineCommand('access', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.access.lines', ctx.user))
  }),
  defineCommand('sra', async (_args, ctx) => {
    await ctx.stream(await streamTable('tools.sra', [12, 10, 8, 12], ctx.user))
  }),
  defineCommand('comms', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.comms.lines', ctx.user))
  }),
  defineCommand('vault', async (_args, ctx) => {
    await ctx.stream(await streamTable('tools.vault', [12, 10, 10, 10], ctx.user))
  }),
  defineCommand('sensors', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.sensors.lines', ctx.user))
  }),
  defineCommand('backup', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.backup.lines', ctx.user))
  }),
  defineCommand('ps', async (_args, ctx) => {
    await ctx.stream(await streamTable('tools.ps', [8, 10, 6, 8, 22], ctx.user))
  }),
  defineCommand('memos', async (_args, ctx) => {
    await ctx.stream(await streamKey('tools.memos.lines', ctx.user))
  }),
]
