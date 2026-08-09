const ESC = String.fromCharCode(27)
const BEL = String.fromCharCode(7)

/** Strip SGR / CSI color sequences for plain-text logs. */
export function stripAnsi(text: string): string {
  const csi = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, 'g')
  const osc = new RegExp(`${ESC}\\][^${BEL}]*(?:${BEL}|${ESC}\\\\)`, 'g')
  return text.replace(csi, '').replace(osc, '')
}
