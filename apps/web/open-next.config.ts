import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental (R2): o app não usa ISR. Nada a criar na conta da Cloudflare.
export default defineCloudflareConfig();
