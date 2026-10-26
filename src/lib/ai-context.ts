type ContextFile = { path: string; content: string; hidden?: boolean };

export const isVisibleTest = (path: string) =>
  path.startsWith("tests/") || /(?:^|\/)__tests__\//.test(path) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);

function normalize(path: string) {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function modulePath(path: string) {
  return path.replace(/\.[cm]?[jt]sx?$/, "").replace(/\/index$/, "");
}

export function selectAIContext<T extends ContextFile>(files: T[], active: string, attached: string[]): T[] {
  const visible = files.filter((file) => !file.hidden);
  const current = visible.find((file) => file.path === active);
  const auto = new Set<string>(current ? [current.path] : []);
  if (current && !isVisibleTest(current.path)) {
    const source = modulePath(current.path);
    const companion = source.replace(/^src\//, "");
    for (const file of visible) {
      if (!isVisibleTest(file.path)) continue;
      const stem = modulePath(file.path).replace(/\.(test|spec)$/, "");
      const namedMatch = stem === source || stem.replace(/^tests\//, "") === companion;
      const imports = [...file.content.matchAll(/(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)["']([^"']+)["']/g)];
      const importsSource = imports.some((match) => {
        const spec = match[1];
        if (!spec?.startsWith(".")) return false;
        const directory = file.path.slice(0, file.path.lastIndexOf("/") + 1);
        return modulePath(normalize(directory + spec)) === source;
      });
      if (namedMatch || importsSource) auto.add(file.path);
    }
  }
  // Automatic context goes first so the API's existing ten-file limit preserves it before extras.
  return [...visible.filter((file) => auto.has(file.path)),
    ...visible.filter((file) => !auto.has(file.path) && attached.includes(file.path))];
}