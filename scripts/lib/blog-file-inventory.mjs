import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function findFilesRecursively(directory, predicate = () => true) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return findFilesRecursively(entryPath, predicate);
      return entry.isFile() && predicate(entryPath) ? [entryPath] : [];
    })
    .sort();
}

export function findBlogMarkdownFiles(directory) {
  return findFilesRecursively(directory, (filePath) => filePath.endsWith('.md'));
}

export function blogSlugFromPath(filePath, blogDirectory) {
  return relative(blogDirectory, filePath).replace(/\.md$/, '').split(sep).join('/');
}
