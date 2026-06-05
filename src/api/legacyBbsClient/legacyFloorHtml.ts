export function extractLegacyFloorContentHtml(rawHtml: string) {
  const value = rawHtml.trim();

  if (!value) {
    return '';
  }

  const document = parseHtml(value);

  if (!document) {
    return value;
  }

  const textBlock = findLegacyTextBlock(document);

  if (textBlock) {
    return textBlock.innerHTML.trim();
  }

  return document.body.innerHTML.trim() || value;
}

export function extractLegacySignatureContentHtml(rawHtml: string) {
  const value = rawHtml.trim();

  if (!value) {
    return '';
  }

  const document = parseHtml(value);

  if (!document) {
    return value;
  }

  const signature = document.querySelector<HTMLElement>('.sigblock > .sig, .sig');

  return signature?.innerHTML.trim() ?? document.body.innerHTML.trim() ?? value;
}

function parseHtml(value: string) {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  return new DOMParser().parseFromString(value, 'text/html');
}

function findLegacyTextBlock(document: Document) {
  const legacyTextBlock = document.querySelector<HTMLElement>(
    [
      'tr.floor[id] .bubble.text > .textblock',
      'tr.floor[id] .textblock',
      '.bubble.text > .textblock',
    ].join(', '),
  );

  if (legacyTextBlock) {
    return legacyTextBlock;
  }

  const bodyChildren = Array.from(document.body.children);

  if (bodyChildren.length === 1 && bodyChildren[0]?.classList.contains('textblock')) {
    return bodyChildren[0] as HTMLElement;
  }

  return null;
}
