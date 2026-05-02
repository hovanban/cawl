export const PERMISSIONS = {
  // Articles (crawled pages)
  ARTICLE_READ:      "article.read",
  ARTICLE_CREATE:    "article.create",
  ARTICLE_UPDATE:    "article.update",
  ARTICLE_DELETE:    "article.delete",
  ARTICLE_TRANSLATE: "article.translate",
  ARTICLE_REWRITE:   "article.rewrite",
  ARTICLE_PUBLISH:   "article.publish",

  // Crawler jobs
  JOB_READ:   "job.read",
  JOB_CREATE: "job.create",
  JOB_UPDATE: "job.update",
  JOB_DELETE: "job.delete",
  JOB_RUN:    "job.run",

  // Publish sites
  SITE_READ:   "site.read",
  SITE_CREATE: "site.create",
  SITE_UPDATE: "site.update",
  SITE_DELETE: "site.delete",

  // AI prompts
  PROMPT_READ:   "prompt.read",
  PROMPT_CREATE: "prompt.create",
  PROMPT_UPDATE: "prompt.update",
  PROMPT_DELETE: "prompt.delete",

  // Settings
  SETTINGS_READ:   "settings.read",
  SETTINGS_UPDATE: "settings.update",

  // Users
  USER_READ:   "user.read",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",

  // Roles
  ROLE_READ:   "role.read",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  partner: [
    "article.read", "article.update", "article.translate", "article.rewrite", "article.publish",
    "job.read",
    "site.read",
    "prompt.read",
  ],
  user: ["article.read", "job.read"],
};

export function resolvePermissions(role: string, userOverrides: string[]): string[] {
  if (userOverrides.length > 0) return userOverrides;
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  return permissions.includes(required);
}

export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every((p) => hasPermission(permissions, p));
}
