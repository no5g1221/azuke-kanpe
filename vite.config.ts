import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveBasePath(env: Record<string, string>): string {
  const raw = (env.VITE_BASE_PATH ?? '').trim();
  if (!raw || raw === '/') {
    return '/';
  }
  const stripped = raw.replace(/^\/+|\/+$/g, '');
  return stripped ? `/${stripped}/` : '/';
}

function resolveSiteUrl(env: Record<string, string>): string {
  const raw =
    env.VITE_SITE_URL ||
    env.VERCEL_PROJECT_PRODUCTION_URL ||
    env.VERCEL_URL ||
    '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function injectOgpUrlsPlugin(base: string, siteUrl: string): Plugin {
  return {
    name: 'inject-ogp-urls',
    transformIndexHtml(html) {
      const ogpImageUrl = siteUrl ? `${siteUrl}/ogp.png` : `${base}ogp.png`;
      const ogUrlMeta = siteUrl
        ? `    <meta property="og:url" content="${siteUrl}/" />\n`
        : '';
      return html
        .replace(/__BASE_URL__/g, base)
        .replace(/__OGP_IMAGE_URL__/g, ogpImageUrl)
        .replace(/^[ \t]*<!-- __OG_URL_META__ -->\r?\n/m, ogUrlMeta);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = resolveBasePath(env);
  const siteUrl = resolveSiteUrl(env);

  return {
    base,
    plugins: [react(), tailwindcss(), injectOgpUrlsPlugin(base, siteUrl)],
  };
});
