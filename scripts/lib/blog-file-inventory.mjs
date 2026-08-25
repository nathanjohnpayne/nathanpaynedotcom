import { readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { slug as githubSlug } from 'github-slugger';

export function findFilesRecursively(directory, predicate = () => true, ancestorRealpaths = new Set()) {
  const realDirectory = realpathSync(directory);
  if (ancestorRealpaths.has(realDirectory)) return [];

  const nextAncestors = new Set(ancestorRealpaths);
  nextAncestors.add(realDirectory);

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      let stats = entry;

      if (entry.isSymbolicLink()) {
        try {
          stats = statSync(entryPath);
        } catch {
          return [];
        }
      }

      if (stats.isDirectory()) {
        return findFilesRecursively(entryPath, predicate, nextAncestors);
      }
      return stats.isFile() && predicate(entryPath) ? [entryPath] : [];
    })
    .sort();
}

export function findBlogMarkdownFiles(directory) {
  return findFilesRecursively(directory, (filePath) => filePath.endsWith('.md'));
}

export function blogSlugFromPath(filePath, blogDirectory) {
  return relative(blogDirectory, filePath)
    .replace(/\.md$/, '')
    .split(sep)
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}
