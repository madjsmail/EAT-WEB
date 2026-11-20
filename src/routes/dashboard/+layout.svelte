<script lang="ts">
import * as Sidebar from "#lib/components/ui/sidebar/index.js";
import AppSidebar from "#lib/components/app-sidebar.svelte";
import SiteHeader from "#lib/components/site-header.svelte";
import type { LayoutProps } from './$types';
let { children }: LayoutProps = $props();

</script>

<div class="[--header-height:calc(--spacing(14))]">
  <Sidebar.Provider class="flex flex-col">
    <SiteHeader />
    <div class="flex flex-1">
      <AppSidebar />
      <Sidebar.Inset>
        <div class="flex flex-1 flex-col gap-4 px-4 py-10">



          {@render children()}
        </div>
      </Sidebar.Inset>
    </div>
  </Sidebar.Provider>
</div>
