import { ref } from 'vue'

const media = window.matchMedia('(pointer: coarse)')
const isCoarse = ref(media.matches)

media.addEventListener('change', (event) => {
  isCoarse.value = event.matches
})

export function useIsCoarse(): Readonly<ReturnType<typeof ref<boolean>>> {
  return isCoarse
}
