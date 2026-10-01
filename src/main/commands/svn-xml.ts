// Leitura das saídas --xml do cliente SVN, sem dependência de biblioteca XML.

export interface SvnXmlStatusEntry {
  path: string;
  item: string;
  props: string;
  revision?: string;
}

export interface SvnXmlLogPath {
  action: string;
  kind?: string;
  path: string;
  copyFromPath?: string;
  copyFromRevision?: string;
}

export interface SvnXmlLogEntry {
  revision: string;
  author?: string;
  date?: string;
  message: string;
  paths: SvnXmlLogPath[];
}

export interface SvnXmlListEntry {
  name: string;
  kind: 'dir' | 'file';
  size?: number;
  revision?: string;
  author?: string;
  date?: string;
}

export interface SvnXmlInfo {
  url?: string;
  repositoryRoot?: string;
  workingCopyRoot?: string;
  revision?: string;
  lastChangedRevision?: string;
  kind?: string;
}

export function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

function readAttribute(attributes: string, name: string): string | undefined {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : undefined;
}

function readTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : undefined;
}

function blocks(xml: string, tag: string): Array<{ attributes: string; body: string }> {
  const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'g');
  return [...xml.matchAll(pattern)].map((match) => ({ attributes: match[1], body: match[2] }));
}

export function parseStatusXml(xml: string): SvnXmlStatusEntry[] {
  return blocks(xml, 'entry').flatMap(({ attributes, body }) => {
    const entryPath = readAttribute(attributes, 'path');
    const status = body.match(/<wc-status\b([^>]*)>/);

    if (entryPath === undefined || !status) {
      return [];
    }

    return [{
      path: entryPath,
      item: readAttribute(status[1], 'item') ?? 'none',
      props: readAttribute(status[1], 'props') ?? 'none',
      revision: readAttribute(status[1], 'revision')
    }];
  });
}

export function parseLogXml(xml: string): SvnXmlLogEntry[] {
  return blocks(xml, 'logentry').map(({ attributes, body }) => ({
    revision: readAttribute(attributes, 'revision') ?? '',
    author: readTag(body, 'author'),
    date: readTag(body, 'date'),
    message: readTag(body, 'msg') ?? '',
    paths: blocks(body, 'path').map((entry) => ({
      action: readAttribute(entry.attributes, 'action') ?? 'M',
      kind: readAttribute(entry.attributes, 'kind'),
      path: decodeXml(entry.body),
      copyFromPath: readAttribute(entry.attributes, 'copyfrom-path'),
      copyFromRevision: readAttribute(entry.attributes, 'copyfrom-rev')
    }))
  }));
}

export function parseListXml(xml: string): SvnXmlListEntry[] {
  return blocks(xml, 'entry').map(({ attributes, body }) => {
    const commit = body.match(/<commit\b([^>]*)>([\s\S]*?)<\/commit>/);
    const size = readTag(body, 'size');

    return {
      name: readTag(body, 'name') ?? '',
      kind: readAttribute(attributes, 'kind') === 'dir' ? 'dir' : 'file',
      size: size === undefined ? undefined : Number(size),
      revision: commit ? readAttribute(commit[1], 'revision') : undefined,
      author: commit ? readTag(commit[2], 'author') : undefined,
      date: commit ? readTag(commit[2], 'date') : undefined
    };
  });
}

export function parseInfoXml(xml: string): SvnXmlInfo {
  const entry = blocks(xml, 'entry')[0];

  if (!entry) {
    return {};
  }

  const commit = entry.body.match(/<commit\b([^>]*)>/);

  return {
    url: readTag(entry.body, 'url'),
    repositoryRoot: readTag(entry.body, 'root'),
    workingCopyRoot: readTag(entry.body, 'wcroot-abspath'),
    revision: readAttribute(entry.attributes, 'revision'),
    lastChangedRevision: commit ? readAttribute(commit[1], 'revision') : undefined,
    kind: readAttribute(entry.attributes, 'kind')
  };
}
