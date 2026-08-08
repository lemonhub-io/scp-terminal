export default {
  shell: {
    availableCommands: '可用命令:',
    commandNotFound: 'bash: {name}: 未找到命令',
    helpHint: '输入 "help" 查看可用命令。',
    unknownError: '未知错误',
    cmd: {
      pwd: {
        usage: 'pwd',
        description: '打印当前工作目录',
      },
      ls: {
        usage: 'ls [-a] [-l] [-h] [path]',
        description: '列出目录内容',
      },
      cd: {
        usage: 'cd [path]',
        description: '切换当前目录',
      },
      cat: {
        usage: 'cat [file...]',
        description: '打印文件内容（无文件时读取标准输入）',
      },
      echo: {
        usage: 'echo [-n] [text...]',
        description: '向终端打印文本',
      },
      mkdir: {
        usage: 'mkdir [-p] DIR',
        description: '创建目录',
      },
      touch: {
        usage: 'touch FILE...',
        description: '创建空文件',
      },
      rm: {
        usage: 'rm [-r] [-f] PATH...',
        description: '删除文件或目录',
      },
      clear: {
        usage: 'clear',
        description: '清屏',
      },
      help: {
        usage: 'help',
        description: '显示可用命令',
      },
      date: {
        usage: 'date',
        description: '显示当前日期和时间',
      },
      whoami: {
        usage: 'whoami',
        description: '打印当前用户',
      },
      uname: {
        usage: 'uname [-a] [-s] [-n] [-r]',
        description: '打印系统信息',
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
    },
  },
} as const
