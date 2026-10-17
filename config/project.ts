export const PRODUCT_NAME = 'Shadow Dojo';

export const PROJECT_LINKS = {
  portfolioCase: 'https://www.matheussiqueira.dev/pt-BR/projects/fruit-ninja',
  repository: 'https://github.com/matheussiqueira-dev/Clone-Fruit-Ninja',
  site: 'https://www.matheussiqueira.dev',
  linkedin: 'https://www.linkedin.com/in/matheussiqueira-dev',
  github: 'https://github.com/matheussiqueira-dev'
} as const;

// Injected by vite.config.ts at build time; the commit only exists on Vercel builds.
export const APP_VERSION = __APP_VERSION__;
export const COMMIT_SHA = __COMMIT_SHA__;
