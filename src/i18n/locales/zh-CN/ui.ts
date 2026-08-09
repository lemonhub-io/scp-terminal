export default {
  app: {
    title: 'SCP 终端',
    brand: 'SITE-19 · 管理系统',
  },
  power: {
    start: '启动',
    hint: '轻触以开机',
  },
  boot: {
    version: '内核 {version} · scp-terminal 1.0.0',
    skipHint: '按任意键跳过',
  },
  login: {
    title: 'SCP 终端',
    registerTitle: '创建账户',
    loginTitle: '登录',
    registerSubtitle: '首次运行 — 请创建用户名和密码',
    loginSubtitle: '请输入用户名和密码',
    username: '用户名',
    password: '密码',
    usernamePlaceholder: 'user',
    working: '处理中...',
    invalidCredentials: '用户名或密码错误',
  },
  locale: {
    label: '语言',
    en: 'EN',
    zhCN: '中文',
  },
  terminal: {
    storageInitFailed: '存储初始化失败: {error}',
    showKeyboard: '显示键盘',
  },
  keyboard: {
    model: 'SITE19-KBD-01',
    status: '链路正常',
    statusCaps: '大写锁定',
    statusSym: '符号层',
    dismiss: '收起',
    shift: 'Shift',
    backspace: '退格',
    enter: '回车',
    symbols: '123',
    letters: 'ABC',
    space: '空格',
  },
  auth: {
    errors: {
      empty_username: '用户名不能为空',
      password_too_short: '密码至少需要 {min} 个字符',
      account_exists: '账户已存在',
    },
  },
  fs: {
    errors: {
      ENOENT: '没有那个文件或目录: {path}',
      EEXIST: '文件已存在: {path}',
      ENOTDIR: '不是目录: {path}',
      EISDIR: '是一个目录: {path}',
      ENOTEMPTY: '目录非空: {path}',
    },
  },
  seed: {
    notes: '- 使用 "cd /tmp" 探索目录\n- 使用 "mkdir" 和 "touch" 创建文件\n',
  },
  time: {
    uptime: {
      withDays: '{days} 天 {hours} 小时 {minutes} 分钟',
      withHours: '{hours} 小时 {minutes} 分钟 {seconds} 秒',
      withMinutes: '{minutes} 分钟 {seconds} 秒',
      secondsOnly: '{seconds} 秒',
    },
  },
} as const
