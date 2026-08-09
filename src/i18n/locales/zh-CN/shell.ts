export default {
  shell: {
    availableCommands: '可用命令:',
    commandNotFound: 'bash: {name}: 未找到命令',
    helpHint: '输入 "help" 查看可用命令。',
    unknownError: '未知错误',
    grep: {
      needPattern: '用法: grep [-i] PATTERN [FILE...]',
      badPattern: '无效的正则表达式',
    },
    history: {
      empty: '历史记录为空',
    },
    help: {
      group: {
        basic: '文件系统与 shell',
        text: '文本工具',
        system: 'Site-19 诊断',
      },
      usage: '用法: {usage}',
      unknown: 'help: 没有 {name} 的手册页',
      hintDetail: '提示: help 命令名  ·  Tab 补全  ·  Ctrl+R 历史搜索',
    },
    cmd: {
      pwd: {
        usage: 'pwd',
        description: '打印当前工作目录',
        man: '打印当前工作目录的绝对路径。',
      },
      ls: {
        usage: 'ls [-a] [-l] [-h] [path]',
        description: '列出目录内容',
        man: '列出目录项。-a 显示隐藏项，-l 长格式，-h 与 -l 联用显示人类可读大小。',
      },
      cd: {
        usage: 'cd [path]',
        description: '切换当前目录',
        man: '更改工作目录。省略路径时返回 home。',
      },
      cat: {
        usage: 'cat [file...]',
        description: '打印文件内容（无文件时读取标准输入）',
        man: '连接并打印文件。活动节点: /proc/*、/etc/hostname。',
      },
      echo: {
        usage: 'echo [-n] [text...]',
        description: '向终端打印文本',
        man: '以空格连接参数并输出。接受 -n 以兼容脚本习惯。',
      },
      mkdir: {
        usage: 'mkdir [-p] DIR',
        description: '创建目录',
        man: '创建目录。-p 按需创建父路径。',
      },
      touch: {
        usage: 'touch FILE...',
        description: '创建空文件',
        man: '创建空文件；若路径已存在则报错。',
      },
      rm: {
        usage: 'rm [-r] [-f] PATH...',
        description: '删除文件或目录',
        man: '删除路径。-r 递归，-f 忽略不存在的路径。',
      },
      clear: {
        usage: 'clear',
        description: '清屏',
        man: '清空当前可见终端缓冲区。',
      },
      grep: {
        usage: 'grep [-i] PATTERN [FILE...]',
        description: '按模式过滤行',
        man: '打印匹配 PATTERN（JS 正则）的行。-i 忽略大小写。无文件时读标准输入。',
      },
      head: {
        usage: 'head [-n N] [FILE]',
        description: '打印文件开头若干行',
        man: '默认 10 行。-n N 或 -nN 指定行数。无文件时读标准输入。',
      },
      tail: {
        usage: 'tail [-n N] [FILE]',
        description: '打印文件末尾若干行',
        man: '默认 10 行。-n N 或 -nN 指定行数。无文件时读标准输入。',
      },
      wc: {
        usage: 'wc [-l] [-w] [-c] [FILE...]',
        description: '统计行数、词数与字节数',
        man: '无标志时输出 行 词 字节。-l/-w/-c 选择列。无文件时读标准输入。',
      },
      help: {
        usage: 'help [COMMAND]',
        description: '显示命令列表或简短手册',
        man: '无参数时按分组列出命令；指定 COMMAND 时显示用法与说明。',
      },
      history: {
        usage: 'history [N]',
        description: '显示最近命令历史',
        man: '列出持久化历史。可选 N 限制最后 N 条。Ctrl+R 可搜索。',
      },
      date: {
        usage: 'date',
        description: '显示当前日期和时间',
        man: '打印当前 UTC 时间戳。',
      },
      whoami: {
        usage: 'whoami',
        description: '打印当前用户',
        man: '打印本会话登录名。',
      },
      uname: {
        usage: 'uname [-a] [-s] [-n] [-r]',
        description: '打印系统信息',
        man: '-s 产品名，-n 主机名，-r 内核，-a 全部字段。',
      },
      sysinfo: {
        usage: 'sysinfo',
        description: '显示详细系统信息',
      },
      check: {
        usage: 'check',
        description: '执行全量系统健康检查',
      },
      network: {
        usage: 'network',
        description: '诊断网络接口与连接',
      },
      services: {
        usage: 'services',
        description: '列出运行中的服务',
      },
      disk: {
        usage: 'disk',
        description: '显示磁盘使用情况',
      },
      security: {
        usage: 'security',
        description: '扫描安全态势',
      },
      trace: {
        usage: 'trace IP',
        description: '追踪到目标地址的网络路径',
      },
      containment: {
        usage: 'containment',
        description: '查询隔离区收容状态',
      },
      log: {
        usage: 'log',
        description: '显示站点最近日志',
      },
      personnel: {
        usage: 'personnel',
        description: '查询当班值勤名册',
      },
      power: {
        usage: 'power',
        description: '查看机房配电与 UPS 状态',
      },
      climate: {
        usage: 'climate',
        description: '环控与生物隔离环境诊断',
      },
      cameras: {
        usage: 'cameras',
        description: '视频汇聚与摄像头状态',
      },
      access: {
        usage: 'access',
        description: '门禁与刷卡审计汇总',
      },
      sra: {
        usage: 'sra',
        description: '现实稳定锚遥测查询',
      },
      comms: {
        usage: 'comms',
        description: '站间通信与无线电诊断',
      },
      vault: {
        usage: 'vault',
        description: '异常物品库登记查询',
      },
      sensors: {
        usage: 'sensors',
        description: '设施传感器总线轮询',
      },
      backup: {
        usage: 'backup',
        description: '备份与快照任务状态',
      },
      ps: {
        usage: 'ps',
        description: '采样系统进程表',
      },
      memos: {
        usage: 'memos',
        description: '站点运行通报',
      },
    },
  },
} as const
