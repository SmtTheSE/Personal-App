export type ButtonVariant =
  | 'filled'
  | 'bordered'
  | 'borderedProminent'
  | 'plain'
  | 'destructive'

export type ButtonSize = 'sm' | 'md' | 'lg'

export type ChipVariant = 'filter' | 'status'
export type ChipColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral'

export type SheetDetent = 'medium' | 'large'

export interface SwipeActionConfig {
  id: string
  label: string
  icon?: unknown
  color?: string
  background?: string
  side: 'leading' | 'trailing'
}
