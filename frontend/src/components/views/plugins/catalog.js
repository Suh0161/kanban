export const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'docs', label: 'Docs' },
  { id: 'dev', label: 'Dev' },
];

/**
 * UI-only catalog for the plugin picker. Categories: docs | dev (for filter pills).
 * Row icons are chosen by `id` in PluginConnectCatalog (see CONNECT_BRAND_ICONS).
 */
export const PLUGIN_CATALOG = [
  {
    id: 'notion',
    name: 'Notion',
    description: 'Bring wikis, docs, and databases next to your board.',
    category: 'docs',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Link issues and PRs so code and planning stay aligned.',
    category: 'dev',
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Open specs and writeups without leaving your flow.',
    category: 'docs',
  },
  {
    id: 'microsoft-word',
    name: 'Microsoft Word',
    description: 'Attach Word-based briefs and review cycles to tasks.',
    category: 'docs',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post updates and nudge channels when work moves.',
    category: 'dev',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Tie frames and design files to what you are shipping.',
    category: 'dev',
  },
];
