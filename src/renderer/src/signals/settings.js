import { signal } from '@preact/signals-react'

export const minLogSecs = signal(5)
export const minLastInputSecs = signal(120)
export const startTrackingAtLaunch = signal(true)
export const startAtLaunch = signal(false)
export const isFirstSettingsLoad = signal(true)
export const extensionEnabled = signal(false)
export const browserProcesses = signal([
  'chrome',
  'brave',
  'operagx',
  'msedge',
  'chromium',
  'opera',
  'vivaldi'
])
export const sitesExclusions = signal([])

export function addSitesExclusion(exclusion) {
  sitesExclusions.value = [...new Set([...sitesExclusions.value, exclusion])]
}

export function toggleStartAtLaunch() {
  startAtLaunch.value = !startAtLaunch.value
}

export function setSettings(settings) {
  if (settings.minLogSecs) minLogSecs.value = settings.minLogSecs
  if (settings.minLastInputSecs) minLastInputSecs.value = settings.minLastInputSecs
  if (settings.startAtLaunch) startAtLaunch.value = settings.startAtLaunch
  if (settings.startTrackingAtLaunch) startTrackingAtLaunch.value = settings.startTrackingAtLaunch
  if (settings.isFirstSettingsLoad) isFirstSettingsLoad.value = settings.isFirstSettingsLoad
  if (settings.extensionEnabled) extensionEnabled.value = settings.extensionEnabled
  if (settings.browserProcesses) browserProcesses.value = settings.browserProcesses
  if (settings.sitesExclusions) sitesExclusions.value = settings.sitesExclusions
}
