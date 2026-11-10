import { parse, type DefaultTreeAdapterMap } from 'parse5';

// Parse5 creates data nodes only: it has no browser, fetcher, scripting engine,
// CSS renderer or resource loader. Nothing from the message enters the DOM.
export function htmlReceiptText(html: string): string {
  const document = parse(html);
  const chunks: string[] = [];
  const ignored = new Set(['head','script','style','template','noscript','iframe','object','embed','svg','math','form','button','input','select','textarea']);
  const blocks = new Set(['p','div','section','article','header','footer','address','blockquote','ul','ol','li','tr','h1','h2','h3','h4','h5','h6','pre','hr']);
  function walk(node: DefaultTreeAdapterMap['node'], depth: number) {
    if (depth > 100) throw new Error('HTML receipt is too deeply nested; paste its confirmation text instead.');
    if (node.nodeName === '#text') { chunks.push((node as DefaultTreeAdapterMap['textNode']).value.replace(/\s+/g, ' ')); return; }
    if ('tagName' in node) {
      if (ignored.has(node.tagName)) return;
      const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
      const style = (attrs.get('style') || '').replace(/\s+/g, '').toLowerCase();
      if (attrs.has('hidden') || attrs.get('aria-hidden') === 'true' || /(?:^|;)(?:display:none|visibility:hidden|mso-hide:all)(?:!important)?(?:;|$)/.test(style)) return;
      if (node.tagName === 'br' || blocks.has(node.tagName)) chunks.push('\n');
      if (node.tagName === 'td' || node.tagName === 'th') chunks.push(' ');
    }
    if ('childNodes' in node) for (const child of node.childNodes) walk(child, depth + 1);
    if ('tagName' in node && blocks.has(node.tagName)) chunks.push('\n');
  }
  walk(document, 0);
  return chunks.join('').split('\n').map(line => line.trim()).filter(Boolean).join('\n');
}
