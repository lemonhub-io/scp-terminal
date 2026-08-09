export default {
  app: {
    title: 'SCP Terminal',
    brand: 'SITE-19 · ADMINISTRATION SYSTEM',
  },
  power: {
    start: 'START',
    hint: 'TAP TO BOOT',
  },
  boot: {
    version: 'kernel {version} · scp-terminal 1.0.0',
    skipHint: 'Press any key to skip',
  },
  login: {
    title: 'SCP Terminal',
    registerTitle: 'Set up your account',
    loginTitle: 'Sign in',
    registerSubtitle: 'First run — create a username and password',
    loginSubtitle: 'Enter your username and password',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'user',
    working: 'Working...',
    invalidCredentials: 'Invalid username or password',
  },
  locale: {
    label: 'Language',
    en: 'EN',
    zhCN: '中文',
  },
  terminal: {
    storageInitFailed: 'Failed to initialize storage: {error}',
    showKeyboard: 'Show keyboard',
  },
  keyboard: {
    model: 'SITE19-KBD-01',
    status: 'LINK ACTIVE',
    statusCaps: 'CAPS LOCK',
    statusSym: 'SYMBOLS',
    dismiss: 'Hide',
    shift: 'Shift',
    backspace: 'Backspace',
    enter: 'Enter',
    symbols: '123',
    letters: 'ABC',
    space: 'Space',
  },
  auth: {
    errors: {
      empty_username: 'Username must not be empty',
      password_too_short: 'Password must be at least {min} characters',
      account_exists: 'Account already exists',
    },
  },
  fs: {
    errors: {
      ENOENT: 'No such file or directory: {path}',
      EEXIST: 'File exists: {path}',
      ENOTDIR: 'Not a directory: {path}',
      EISDIR: 'Is a directory: {path}',
      ENOTEMPTY: 'Directory not empty: {path}',
    },
  },
  seed: {
    notes: '- Use "cd /tmp" to explore\n- Use "mkdir" and "touch" to create files\n',
  },
  time: {
    uptime: {
      withDays: '{days} days {hours} hours {minutes} minutes',
      withHours: '{hours} hours {minutes} minutes {seconds} seconds',
      withMinutes: '{minutes} minutes {seconds} seconds',
      secondsOnly: '{seconds} seconds',
    },
  },
} as const
