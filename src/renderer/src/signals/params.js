import { computed, signal } from '@preact/signals-react'

export const params = signal({})

export const name = computed(() => params?.name)
