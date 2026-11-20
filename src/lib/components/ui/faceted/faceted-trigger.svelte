<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import { PopoverTrigger } from '#lib/components/ui/popover/index.js'
  import { cn } from '#lib/utils.js'

  let {
    class: className,
    ...restProps
  }: ComponentProps<typeof PopoverTrigger> = $props()
</script>

<PopoverTrigger
  data-slot="faceted-trigger"
  class={cn(
    'justify-between text-start focus:outline-none focus:ring-1 focus:ring-ring',
    className,
  )}
  {...restProps}
/>
