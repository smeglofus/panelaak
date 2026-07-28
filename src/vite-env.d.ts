/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public base URL of the leaderboard API, e.g. https://api.example.com.
   * Leave unset for the docker-compose deployment, where nginx proxies /api
   * on the same origin. Required for builds served without that proxy
   * (GitHub Pages, desktop builds).
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
