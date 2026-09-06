export interface RetailNoiseSplit {
  clean: string
  variant: string
  preventa: boolean
}

export function splitRetailNoise(rawText: string): RetailNoiseSplit
export function stripRetailNoise(text: string): string
