# SCP Terminal

一个基于 Site-19 主题的浏览器终端模拟器。Vue 3 + xterm.js 构建,以基金会风格的启动流程、暗色终端美学和滚动日志流为核心体验。

**在线体验:** https://scp-terminal-62e.pages.dev/

## 特性

- **开机仪式感** — Power 开机页(Start 按钮)→ 全屏 + 电源音 → systemd 风格开机日志滚动(逐行浮现 + 打字音)→ 登录页
- **终端核心** — xterm.js + Campbell 配色 + Cascadia Code,OPFS 虚拟文件系统(FHS 结构,持久化)
- **40+ 命令** — 文件系统 / 文本工具 / 站点诊断;诊断类以滚动日志流输出,并落盘至 `/var/log/site19/`
- **移动端自定义键盘** — simple-keyboard 驱动,系统键盘完全替换,统一输入体验;极简暗色设计 + SVG 图标 + 按键音
- **音频** — Web Audio 合成(零音频文件):电源音、日志打字音、键盘按键音
- **SCP 叙事轻点缀** — `containment`(隔离区收容状态)、`log`(站点日志,含 redacted 条目)、`security` 中的收容单元/E-11 巡逻

## 技术栈

- **框架:** Vue 3(script setup)+ Vite 8 + TypeScript
- **终端:** @xterm/xterm 6 + @xterm/addon-fit
- **键盘:** simple-keyboard 3
- **存储:** OPFS(浏览器文件系统,用户名存于 `.scp-credentials.json`,无需密码)
- **测试:** Vitest + @vue/test-utils
- **Lint/格式:** oxlint + ESLint + Prettier

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 (http://localhost:5173)
npm run build      # 类型检查 + 生产构建 (dist/)
npm run preview    # 预览构建产物
```

## 验证

```bash
npm run test:unit -- --run   # 单元测试
npm run lint                 # oxlint + eslint
npm run format               # prettier 格式化
```

> 若测试数量异常(与预期不符),先清理 Vite 缓存:`rm -rf node_modules/.vite node_modules/.vite-temp`

## 命令列表

### 基础命令

| 命令 | 功能 |
|---|---|
| `pwd` / `ls` / `cd` / `mkdir` / `touch` / `rm` | 文件系统 |
| `cat` / `echo` / `grep` / `head` / `tail` / `wc` | 文本与过滤(支持管道) |
| `clear` / `history` | 屏幕与历史(持久化 `~/.scp_history`) |
| `help` / `help CMD` | 分组列表与简短手册 |
| `date` / `whoami` / `uname` | 系统基础信息 |
| Tab / Ctrl+R | 路径与命令补全 / 反向历史搜索 |

### 系统诊断命令(滚动日志流)

| 命令 | 功能 |
|---|---|
| `sysinfo` | 系统信息:内核 / CPU / 内存 / 固件 |
| `check` | 全量健康检查 |
| `network` | 网络诊断:接口 / 路由 / 加密隧道 / 延迟 |
| `services` | systemd 服务列表 |
| `disk` | 磁盘挂载表 |
| `security` | 安全扫描:防火墙 / 补丁 / 收容单元 / E-11 |
| `trace <ip>` | 路由追踪(默认 8.8.8.8) |
| `containment` | 隔离区收容状态查询 |
| `log` | 站点日志查看(含 redacted 条目) |
| `personnel` | 当班值勤名册(只读) |
| `power` | 机房配电 / UPS / 发电机 |
| `climate` | 环控 HVAC / 生物隔离 |
| `cameras` | 视频汇聚与摄像头状态 |
| `access` | 门禁与刷卡审计汇总 |
| `sra` | 现实稳定锚(SRA)遥测 |
| `comms` | 站间隧道与无线电 |
| `vault` | 异常物品库登记 |
| `sensors` | 设施传感器总线 |
| `backup` | 备份与快照任务 |
| `ps` | 进程表采样 |
| `memos` | 站点运行通报 |

## 项目结构

```
src/
├── App.vue                 # 视图流程: power → boot → login → terminal
├── audio/sfx.ts            # Web Audio 合成音效
├── auth/credentials.ts     # 用户名档案(OPFS,无密码)
├── boot/bootLog.ts         # 开机日志数据(66 行, systemd 风格)
├── components/
│   ├── PowerScreen.vue     # 开机 Start 按钮 + 全屏
│   ├── BootLog.vue         # 开机日志滚动动画
│   ├── LoginView.vue       # 登录 / 注册
│   ├── TerminalView.vue    # xterm 终端 + 键盘集成
│   └── CustomKeyboard.vue  # 自定义键盘(simple-keyboard)
├── composables/useTouch.ts # 粗指针检测
└── terminal/
    ├── shell.ts            # 命令执行器 + 基础命令
    ├── systemCommands.ts   # 系统诊断命令(日志流)
    └── fs/                 # OPFS 文件系统后端 + FHS 种子
```

## 部署

### Cloudflare Pages(direct upload)

```bash
npm run build
npx wrangler pages deploy dist --project-name scp-terminal
```

### 流程说明

启动流程:Power 开机页 → 点击 START(全屏 + 电源音)→ 开机日志滚动 → 登录页(首次注册/之后登录)→ 终端。触摸设备自动启用自定义键盘,系统键盘被替换。

## 许可

[AGPL-3.0](LICENSE) — Copyright (C) 2026 lemonhub-io
