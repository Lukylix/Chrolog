export function prettyTime(ms) {
  const s = Math.floor(parseInt(ms) / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  const seconds = parseInt(s - hours * 3600 - minutes * 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''} ${seconds}s`
}

export function prettyTimeHoursMins(ms) {
  const s = Math.floor(parseInt(ms) / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''}`
}
