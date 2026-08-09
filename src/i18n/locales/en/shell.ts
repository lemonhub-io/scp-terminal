export default {
  shell: {
    availableCommands: 'Available commands:',
    commandNotFound: 'bash: {name}: command not found',
    helpHint: 'Type "help" to see available commands.',
    unknownError: 'unknown error',
    grep: {
      needPattern: 'usage: grep [-i] PATTERN [FILE...]',
      badPattern: 'invalid regular expression',
    },
    history: {
      empty: 'history is empty',
    },
    help: {
      group: {
        basic: 'Filesystem & shell',
        text: 'Text utilities',
        system: 'Site-19 diagnostics',
      },
      usage: 'Usage: {usage}',
      unknown: 'help: no manual entry for {name}',
      hintDetail: 'Tip: help COMMAND  ·  Tab completes  ·  Ctrl+R history search',
    },
    cmd: {
      pwd: {
        usage: 'pwd',
        description: 'Print the current working directory',
        man: 'Print absolute path of the current working directory.',
      },
      ls: {
        usage: 'ls [-a] [-l] [-h] [path]',
        description: 'List directory contents',
        man: 'List entries. -a show hidden, -l long format, -h human-readable sizes with -l.',
      },
      cd: {
        usage: 'cd [path]',
        description: 'Change the current directory',
        man: 'Change working directory. With no path, return to home.',
      },
      cat: {
        usage: 'cat [file...]',
        description: 'Print file contents (or stdin when no file)',
        man: 'Concatenate and print files. Live nodes: /proc/*, /etc/hostname.',
      },
      echo: {
        usage: 'echo [-n] [text...]',
        description: 'Print text to the terminal',
        man: 'Write arguments separated by spaces. -n is accepted for compatibility.',
      },
      mkdir: {
        usage: 'mkdir [-p] DIR',
        description: 'Create a directory',
        man: 'Create directory. -p creates parent path components as needed.',
      },
      touch: {
        usage: 'touch FILE...',
        description: 'Create empty files',
        man: 'Create empty files. Fails if a path already exists.',
      },
      rm: {
        usage: 'rm [-r] [-f] PATH...',
        description: 'Remove files or directories',
        man: 'Remove paths. -r recursive, -f ignore missing.',
      },
      clear: {
        usage: 'clear',
        description: 'Clear the terminal screen',
        man: 'Clear the visible terminal buffer.',
      },
      grep: {
        usage: 'grep [-i] PATTERN [FILE...]',
        description: 'Filter lines matching a pattern',
        man: 'Print lines matching PATTERN (JS RegExp). -i ignore case. Reads stdin when no file.',
      },
      head: {
        usage: 'head [-n N] [FILE]',
        description: 'Print the first lines of a file',
        man: 'Default 10 lines. -n N or -nN sets the count. Reads stdin when no file.',
      },
      tail: {
        usage: 'tail [-n N] [FILE]',
        description: 'Print the last lines of a file',
        man: 'Default 10 lines. -n N or -nN sets the count. Reads stdin when no file.',
      },
      wc: {
        usage: 'wc [-l] [-w] [-c] [FILE...]',
        description: 'Count lines, words, and bytes',
        man: 'With no flags, print lines words bytes. -l/-w/-c select columns. Reads stdin when no file.',
      },
      help: {
        usage: 'help [COMMAND]',
        description: 'Show command list or a short manual',
        man: 'Without args, list commands by group. With COMMAND, show usage and notes.',
      },
      history: {
        usage: 'history [N]',
        description: 'Show recent command history',
        man: 'List persisted history. Optional N limits to the last N entries. Ctrl+R searches.',
      },
      date: {
        usage: 'date',
        description: 'Show the current date and time',
        man: 'Print current UTC timestamp.',
      },
      whoami: {
        usage: 'whoami',
        description: 'Print the current user',
        man: 'Print the login name for this session.',
      },
      uname: {
        usage: 'uname [-a] [-s] [-n] [-r]',
        description: 'Print system information',
        man: '-s product, -n hostname, -r kernel, -a all fields.',
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
      personnel: {
        usage: 'personnel',
        description: 'Query on-duty personnel roster',
      },
      power: {
        usage: 'power',
        description: 'Show plant power and UPS status',
      },
      climate: {
        usage: 'climate',
        description: 'Diagnose HVAC and bio-isolation climate',
      },
      cameras: {
        usage: 'cameras',
        description: 'Video aggregation and camera status',
      },
      access: {
        usage: 'access',
        description: 'Badge and door access audit summary',
      },
      sra: {
        usage: 'sra',
        description: 'Query Scranton Reality Anchor telemetry',
      },
      comms: {
        usage: 'comms',
        description: 'Diagnose inter-site links and radio',
      },
      vault: {
        usage: 'vault',
        description: 'Query anomalous item vault registry',
      },
      sensors: {
        usage: 'sensors',
        description: 'Poll facility sensor bus',
      },
      backup: {
        usage: 'backup',
        description: 'Show backup and snapshot job status',
      },
      ps: {
        usage: 'ps',
        description: 'Sample system process table',
      },
      memos: {
        usage: 'memos',
        description: 'Show site operations bulletins',
      },
    },
  },
} as const
