# AGENTS.md

## 验证命令(每次改动后必须运行)

```bash
npm run test:unit -- --run   # 单元测试
npm run build                # 类型检查 + 构建
npm run lint                 # oxlint + eslint(--fix)
```

> 注意:测试数量异常时先清理缓存再重跑:
> `rm -rf node_modules/.vite node_modules/.vite-temp`

## 架构

- **视图流程**(App.vue):`power` → `boot` → `login` → `terminal`,Vue Transition fade 切换
- **命令系统**(terminal/):`shell.ts` 定义 `Command` 接口与执行器(basic/text/system 分组);`systemCommands.ts` 诊断命令经 `ctx.stream()` 呈现,并 `appendSiteLog` 写入 `/var/log/site19/<cmd>.log`
- **交互增强**:Tab 补全(命令/路径)、历史持久化、`Ctrl+R` 反向搜索;文本工具 `grep`/`head`/`tail`/`wc`
- **键盘**(CustomKeyboard.vue):simple-keyboard 封装,**延迟初始化**——首次显示时才 `new SimpleKeyboard()`(挂载即初始化曾导致登录页黑屏;必须用具名导入 `{ SimpleKeyboard }`,默认导入在生产构建下不是构造函数)
- **音频**(audio/sfx.ts):Web Audio 合成,`ensureAudio()` 幂等,必须在用户手势内初始化
- **触摸设备**(composables/useTouch.ts):`matchMedia('(pointer: coarse)')` 检测,驱动键盘显示与系统键盘拦截

## 关键约定

- **SCP 叙事为轻点缀**:写实技术日志格式承载,禁止游戏化机制(审批玩法/事件剧情已明确否决并归档)
- **新命令规范**:中文输出,经 `ctx.stream()`(不直接写 stdout),行数充裕(每命令 15-40 行),SCP 元素用 `████` 涂黑与 `[ DATA EXPUNGED ]` 表达
- 键盘/登录页 CSS 用 scoped + `:deep()`(simple-keyboard 按钮为 JS 动态创建,无 scope 属性)
- 颜色遵循 Campbell 终端配色(#0C0C0C 底),accent 为终端绿 #16C60C
- 无纯黑(#000)与纯白(#fff),用 #0c0c0c / #f2f2f2 系
