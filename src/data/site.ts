// Business details used in SEO tags and Google structured data.
// Keep these in sync with your Google Business Profile.
export const SITE = {
  url: 'https://in2ition.media',
  name: 'In2ition Media',
};

export const business = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE.url}/#business`,
  name: 'In2ition Media',
  description: 'Web design studio in East Bank Demerara, Guyana, building custom, fast, search-friendly websites for businesses across Guyana.',
  url: `${SITE.url}/`,
  logo: `${SITE.url}/assets/img/logo-dark.png`,
  image: `${SITE.url}/assets/img/og-default.jpg`,
  telephone: '+592-692-2647',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '69 Nandy Park',
    addressLocality: 'East Bank Demerara',
    addressCountry: 'GY',
  },
  areaServed: { '@type': 'Country', name: 'Guyana' },
  knowsAbout: ['Web design', 'Website development', 'Search engine optimization', 'Website hosting'],
  sameAs: [
    'https://www.facebook.com/in2itionmedia/',
    'https://www.instagram.com/in2ition.media',
    'https://maps.google.com/?cid=3596183034083991518',
  ],
};

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: new URL(item.path, SITE.url).href,
  })),
});

export const readingTime = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 220));

export const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
