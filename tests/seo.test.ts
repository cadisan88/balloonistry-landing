import { describe as group, expect, it } from 'vitest';
import {
  breadcrumbJsonLd,
  describe,
  faqJsonLd,
  isPlaceholder,
  localBusinessJsonLd,
  productJsonLd,
  robotsTxt,
  serializeJsonLd,
  sitemapXml,
} from '../src/lib/seo';

group('placeholders', () => {
  it('spots owner text that is still a TODO', () => {
    expect(isPlaceholder('TODO: description from the owner.')).toBe(true);
    expect(isPlaceholder('  TODO: x')).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder('Pink and gold balloons.')).toBe(false);
  });

  it('uses the fallback only while the text is a placeholder', () => {
    expect(describe('TODO: x', 'Fallback')).toBe('Fallback');
    expect(describe(' Real text ', 'Fallback')).toBe('Real text');
  });
});

group('localBusinessJsonLd', () => {
  it('uses the business info from site.ts', () => {
    const data = localBusinessJsonLd('https://www.balloonistry.ca/og.jpg');
    expect(data['@type']).toBe('LocalBusiness');
    expect(data.telephone).toBe('+12269786720');
    expect(data.address).toMatchObject({
      streetAddress: '233 Red Clover Court',
      addressLocality: 'Kitchener',
      addressRegion: 'ON',
      addressCountry: 'CA',
    });
    expect(data.sameAs).toEqual([
      'https://www.instagram.com/theballoonistry/',
      'https://www.facebook.com/profile.php?id=61583352010917',
    ]);
    // Never invented: no hours, no price range
    expect(data).not.toHaveProperty('openingHours');
    expect(data).not.toHaveProperty('priceRange');
  });
});

group('productJsonLd', () => {
  const base = { id: 'hot-air-balloon', name: 'Hot Air Balloon', description: 'd', imageUrl: 'i' };

  it('shows "From $X" as a low price in CAD', () => {
    expect(productJsonLd({ ...base, price: 75 }).offers).toEqual({
      '@type': 'AggregateOffer',
      lowPrice: 75,
      priceCurrency: 'CAD',
      url: 'https://www.balloonistry.ca/products/hot-air-balloon/',
    });
  });

  it('has no offer for a "Request a quote" product', () => {
    expect(productJsonLd(base)).not.toHaveProperty('offers');
  });
});

group('breadcrumbJsonLd', () => {
  it('numbers the crumbs and uses full URLs', () => {
    const data = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop/' },
    ]);
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.balloonistry.ca/' },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.balloonistry.ca/shop/' },
    ]);
  });
});

group('faqJsonLd', () => {
  it('leaves out questions without a real answer', () => {
    const data = faqJsonLd([
      { question: 'A?', answer: 'TODO: answer from the owner.' },
      { question: 'B?', answer: 'Yes, we deliver.\n' },
    ]);
    expect(data?.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'B?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes, we deliver.' },
      },
    ]);
  });

  it('returns nothing while every answer is a placeholder', () => {
    expect(faqJsonLd([{ question: 'A?', answer: 'TODO: x' }])).toBeUndefined();
  });
});

group('serializeJsonLd', () => {
  it('cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)' })).not.toContain('</script>');
  });
});

group('sitemap and robots', () => {
  it('lists full URLs', () => {
    const xml = sitemapXml([{ path: '/' }, { path: '/shop/' }]);
    expect(xml).toContain('<loc>https://www.balloonistry.ca/</loc>');
    expect(xml).toContain('<loc>https://www.balloonistry.ca/shop/</loc>');
  });

  it('points robots to the sitemap and keeps the API out', () => {
    expect(robotsTxt()).toContain('Sitemap: https://www.balloonistry.ca/sitemap.xml');
    expect(robotsTxt()).toContain('Disallow: /api/');
  });
});
