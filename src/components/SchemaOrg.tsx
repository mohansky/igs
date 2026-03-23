import { site, SITE_URL } from '#/lib/site'

export function SchemaOrg() {
  const { meta, header, footer, contact, home, about } = site

  const phone = contact.details.items.find((i) => i.label.includes('Phone'))
  const email = contact.details.items.find((i) => i.label.includes('Email'))
  const phoneValue = phone?.value ?? header.phone
  const emailValue = email?.value ?? footer.contact.email

  const schemas = [
    // 1. School (primary entity)
    {
      '@context': 'https://schema.org',
      '@type': ['School', 'Preschool', 'ChildCare'],
      '@id': `${SITE_URL}/#school`,
      name: meta.title,
      alternateName: 'IGS Bengaluru',
      description: meta.description,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/igslogo.svg`,
      },
      image: [`${SITE_URL}/hero6.jpg`, `${SITE_URL}/hero7.jpg`],
      telephone: phoneValue,
      email: emailValue,
      foundingDate: '2020',
      slogan: about.intro.title,
      keywords: [
        'preschool',
        'nursery school',
        'kindergarten',
        'LKG',
        'UKG',
        'early childhood education',
        'Bengaluru preschool',
        'Kasturi Nagar school',
        'play-based learning',
        'Indo-German School',
      ],
      knowsLanguage: ['en', 'hi', 'kn'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: '#8/P, 1st A Main, 3rd D Cross Road, Kasturi Nagar',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        postalCode: '560043',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 13.0012,
        longitude: 77.6595,
      },
      hasMap: 'https://www.google.com/maps?q=Kasturi+Nagar,+Bengaluru',
      areaServed: {
        '@type': 'City',
        name: 'Bengaluru',
      },
      priceRange: '$$',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
          ],
          opens: '08:00',
          closes: '13:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Saturday',
          opens: '09:00',
          closes: '12:00',
        },
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: phoneValue,
          email: emailValue,
          contactType: 'admissions',
          availableLanguage: ['English','Kannada', 'Tamil', 'Telegu', 'Malayalam', 'Hindi'],
        },
      ],
      // Educational programmes as offered courses
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Programmes',
        itemListElement: home.programmes.items.map(
          (prog: { title: string; age: string; desc: string }) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'EducationalOccupationalProgram',
              name: prog.title,
              description: prog.desc,
              educationalProgramMode: 'full-time',
              timeToComplete: 'P1Y',
              occupationalCategory: 'Early Childhood Education',
            },
          }),
        ),
      },
      sameAs: [] as string[],
    },

    // 2. WebSite schema (enables sitelinks search box)
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: meta.title,
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#school` },
    },

    // 3. EducationalOrganization with programme details
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#educationalorg`,
      name: meta.title,
      url: SITE_URL,
      educationalCredentialAwarded: 'Preschool Certificate',
      hasCredential: {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'Early Childhood Education',
      },
    },
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  )
}
