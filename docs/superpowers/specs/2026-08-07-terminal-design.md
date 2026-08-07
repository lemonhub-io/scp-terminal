# SCP Terminal — 终端界面设计

日期:2026-08-07
状态:已确认(用户于对话中直接批准)

## 目标

利用 xterm.js 在浏览器中渲染一个模拟终端界面:黑底白字、带提示符、支持基础 Unix 命令工具集和虚拟文件系统。

## 范围

- xterm.js(@xterm/xterm 6.x)+ @xterm/addon-fit 自适应尺寸
- 提示符 `user@scp:{cwd}$ `,cwd 显示为 `~` 当处于 home 时
- 命令集:pwd ls cd cat echo mkdir touch rm clear help date whoami uname
- 虚拟文件系统:内存目录树,支持绝对/相对路径,`.`/`..`
- 交互:行编辑(退格)、Ctrl+C 取消、↑/↓ 命令历史
- 主题:背景 `#000000`,前景 `#ffffff`,错误红色

## 架构

- `src/terminal/FileSystem.ts` — 纯 TS 内存文件系统(无 DOM 依赖,可单测)
- `src/terminal/shell.ts` — 命令注册表 + 参数解析 + 执行器(纯 TS,可单测)
- `src/components/TerminalView.vue` — xterm.js 承载组件,负责渲染、行缓冲、历史、主题
- 页面路由:Home → TerminalView,移除脚手架演示组件(HelloWorld/TheWelcome/About)

## 数据结构

- FS 节点:`{ name, type: 'dir' | 'file', content, children: Map|null, parent }`
- 初始树:`/home/user/`(含 welcome.txt、notes.txt)、`/tmp/`
- 命令签名:`run(args: string[], ctx: CommandContext)`,ctx 提供 stdout/stderr/fs/cwd/clear

## 测试

vitest 覆盖:路径解析、ls/cd/cat/mkdir/touch/rm 及错误分支(ENOENT/EEXIST)、shell 执行与未知命令。
