# SCP Terminal — OPFS 持久化后端设计

日期:2026-08-07
状态:已确认(用户对话中批准)

## 目标

虚拟文件系统获得一等 OPFS(Origin Private File System)支持,浏览器不支持 OPFS 时回退 IndexedDB。持久化跨会话。

## 决策

- 主线程异步句柄(非 Worker/SyncAccessHandle),经用户确认
- 跨会话持久,首次运行植入初始树
- 旧内存树 FileSystem.ts 整体删除,不保留兼容层

## 架构

- `src/terminal/fs/FsBackend.ts` — 异步后端接口:`list/read/write/mkdir/remove/exists`
  - 错误统一映射为 FsError(ENOENT/EEXIST/ENOTDIR/EISDIR/ENOTEMPTY)
  - 路径语义与现有 shell 一致(绝对/相对/`.`/`..`)
- `src/terminal/fs/OpfsBackend.ts` — OPFS 原生实现:
  - 目录↔FileSystemDirectoryHandle、文件↔FileSystemFileHandle,1:1
  - `createWritable()` 流式写入;`getFile().text()` 按需读取;`removeEntry({recursive:true})`
  - 整棵树零序列化,文件内容按需加载
  - 首启检测:`home` 目录不存在 → 植入 welcome.txt/notes.txt//tmp
- `src/terminal/fs/IdbBackend.ts` — 回退:整棵序列化树存单 key,变更后事务写回,内存快照读
- `src/terminal/fs/createBackend.ts` — 检测 `navigator.storage.getDirectory`,返回后端实例与名称
- Shell 异步化:命令签名 `(args, ctx) => Promise<void>`,executeCommand async
- TerminalView:启动时 await 后端初始化,横幅显示后端名;Enter 在 busy 时排队

## 测试

- 契约测试跑在 IdbBackend 上(fake-indexeddb,jsdom 无原生 IDB)
- OpfsBackend 用 mock 句柄验证路径解析/错误映射/流式写调用
- shell 测试注入 mock 后端,改异步断言
