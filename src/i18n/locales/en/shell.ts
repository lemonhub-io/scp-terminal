export default {
  shell: {
    availableCommands: 'Available commands:',
    commandNotFound: 'bash: {name}: command not found',
    helpHint: 'Type "help" to see available commands.',
    unknownError: 'unknown error',
    cmd: {
      pwd: {
        usage: 'pwd',
        description: 'Print the current working directory',
      },
      ls: {
        usage: 'ls [-a] [-l] [-h] [path]',
        description: 'List directory contents',
      },
      cd: {
        usage: 'cd [path]',
        description: 'Change the current directory',
      },
      cat: {
        usage: 'cat [file...]',
        description: 'Print file contents (or stdin when no file)',
      },
      echo: {
        usage: 'echo [-n] [text...]',
        description: 'Print text to the terminal',
      },
      mkdir: {
        usage: 'mkdir [-p] DIR',
        description: 'Create a directory',
      },
      touch: {
        usage: 'touch FILE...',
        description: 'Create empty files',
      },
      rm: {
        usage: 'rm [-r] [-f] PATH...',
        description: 'Remove files or directories',
      },
      clear: {
        usage: 'clear',
        description: 'Clear the terminal screen',
      },
      help: {
        usage: 'help',
        description: 'Show available commands',
      },
      date: {
        usage: 'date',
        description: 'Show the current date and time',
      },
      whoami: {
        usage: 'whoami',
        description: 'Print the current user',
      },
      uname: {
        usage: 'uname [-a] [-s] [-n] [-r]',
        description: 'Print system information',
      },
      sysinfo: {
        usage: 'sysinfo',
        description: 'Show detailed system information',
      },
      check: {
        usage: 'check',
        description: 'Run a full system health check',
      },
      network: {
        usage: 'network',
        description: 'Diagnose network interfaces and connections',
      },
      services: {
        usage: 'services',
        description: 'List running services',
      },
      disk: {
        usage: 'disk',
        description: 'Show disk usage',
      },
      security: {
        usage: 'security',
        description: 'Scan security posture',
      },
      trace: {
        usage: 'trace IP',
        description: 'Trace the network path to an address',
      },
      containment: {
        usage: 'containment',
        description: 'Query containment zone status',
      },
      log: {
        usage: 'log',
        description: 'Show recent site logs',
      },
    },
  },
} as const
