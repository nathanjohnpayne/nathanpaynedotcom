import { describe, expect, it } from 'vitest';
import rehypeFigureCaptions, { captionLinkNodes } from '../src/plugins/rehype-figure-captions.mjs';

const imageParagraph = (properties) => ({
  type: 'root',
  children: [
    {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{ type: 'element', tagName: 'img', properties, children: [] }],
    },
  ],
});

function figureOf(properties) {
  const tree = imageParagraph(properties);
  rehypeFigureCaptions()(tree);
  return tree.children[0];
}

describe('figure caption links from the image title', () => {
  it('appends title links to the caption and drops the title attribute', () => {
    const figure = figureOf({
      src: '/img.png',
      alt: 'Two stories.',
      title: 'Articles: [One](https://one.example/a) and [Two](https://two.example/b).',
    });
    const [img, figcaption] = figure.children;

    expect(figure.tagName).toBe('figure');
    expect(img.properties.title).toBeUndefined();
    expect(img.properties.alt).toBe('Two stories.');
    expect(figcaption.children).toEqual([
      { type: 'text', value: 'Two stories. ' },
      { type: 'text', value: 'Articles: ' },
      {
        type: 'element',
        tagName: 'a',
        properties: { href: 'https://one.example/a' },
        children: [{ type: 'text', value: 'One' }],
      },
      { type: 'text', value: ' and ' },
      {
        type: 'element',
        tagName: 'a',
        properties: { href: 'https://two.example/b' },
        children: [{ type: 'text', value: 'Two' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('keeps a caption without a title as the alt text alone', () => {
    const figcaption = figureOf({ src: '/img.png', alt: 'Plain caption.' }).children[1];
    expect(figcaption.children).toEqual([{ type: 'text', value: 'Plain caption.' }]);
  });

  it('links only https URLs and leaves other bracket syntax as text', () => {
    expect(captionLinkNodes('See [x](javascript:alert(1)) and [y](http://plain.example).')).toEqual(
      [{ type: 'text', value: 'See [x](javascript:alert(1)) and [y](http://plain.example).' }],
    );
  });
});
