<script lang="ts">
import './layout.css';
import favicon from '#lib/assets/favicon.svg';
import type { LayoutProps } from './$types';
let { children }: LayoutProps = $props();
import { Toaster } from '#lib/components/ui/sonner/index.js';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>
<Toaster />
{@render children()}


