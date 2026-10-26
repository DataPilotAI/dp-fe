/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly DP_API_BASE_URL?: string
    readonly DP_USE_MOCK?: string
    readonly DP_MAX_FILE_SIZE_MB?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
