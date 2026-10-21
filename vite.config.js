import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const htmlPages = [
  'index',
  'login',
  'additional-fees',
  'wedding-fees',
  'admin-dashboard',
  'create-zone',
  'member-record',
  'members',
  'archives',
  'monthly-due',
  'payment-records',
  'reports',
  'backup-export',
  'treasurer-dashboard',
  'treasurer-members',
  'treasurer-payments',
  'treasurers',
  'zone-members',
  'zones'
];

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

function copyStaticDirectories() {
  const directories = ['js', 'css', 'assets'];

  return {
    writeBundle() {
      for (const directory of directories) {
        const destination = resolve(projectRoot, 'dist', directory);
        mkdirSync(destination, { recursive: true });
        cpSync(resolve(projectRoot, directory), destination, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyStaticDirectories()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        htmlPages.map((page) => [page, resolve(projectRoot, `${page}.html`)]),
      ),
    },
  },
});