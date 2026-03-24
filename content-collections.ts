import { defineCollection, defineConfig } from '@content-collections/core'
import { compileMDX } from '@content-collections/mdx'
import remarkGfm from 'remark-gfm'
import { z } from 'zod'

const blog = defineCollection({
  name: 'blog',
  directory: 'content/blog',
  include: '**/*.mdx',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    content: z.string(),
    heroImage: z.string().optional(),
  }),
  transform: async (document, context) => {
    return {
      ...document,
      slug: document._meta.path,
      pubDate: new Date(document.pubDate).toISOString(),
      mdx: await compileMDX(context, document, {
        remarkPlugins: [remarkGfm],
      }),
    }
  },
})

const navItemSchema = z.object({
  label: z.string(),
  to: z.string(),
})

const ctaSchema = z.object({
  label: z.string(),
  to: z.string(),
})

const site = defineCollection({
  name: 'site',
  directory: 'content/site',
  include: 'index.yaml',
  parser: 'yaml',
  schema: z.object({
    meta: z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
    }),
    header: z.object({
      logoSrc: z.string(),
      logoAlt: z.string(),
      phone: z.string(),
      email: z.string(),
      nav: z.array(navItemSchema),
    }),
    footer: z.object({
      schoolName: z.string(),
      tagline: z.string(),
      quickLinks: z.array(navItemSchema),
      contact: z.object({
        email: z.string(),
        phone: z.string(),
        hours: z.array(z.string()),
      }),
      copyright: z.string(),
    }),
    home: z.object({
      hero: z.object({
        kicker: z.string(),
        image: z.string(),
        title: z.string(),
        description: z.string().optional(),
        primaryCta: ctaSchema,
        secondaryCta: ctaSchema,
      }),
      programmes: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            age: z.string(),
            desc: z.string(),
          }),
        ),
      }),
      whyUs: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            desc: z.string(),
          }),
        ),
      }),
      cta: z.object({
        title: z.string(),
        description: z.string(),
        primaryCta: ctaSchema,
        secondaryCta: ctaSchema,
      }),
    }),
    about: z.object({
      intro: z.object({
        kicker: z.string(),
        image: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      mission: z.object({
        title: z.string(),
        description: z.string(),
      }),
      vision: z.object({
        title: z.string(),
        description: z.string(),
      }),
      team: z.object({
        kicker: z.string(),
        groups: z.array(
          z.object({
            title: z.string(),
            columns: z.string().optional(),
            cardClassName: z.string().optional(),
            members: z.array(
              z.object({
                name: z.string(),
                role: z.string(),
                img: z.string(),
              }),
            ),
          }),
        ),
      }),
      approach: z.object({
        kicker: z.string(),
        title: z.string(),
        paragraphs: z.array(z.string()),
      }),
      campus: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            img: z.string(),
            desc: z.string(),
          }),
        ),
      }),
      cta: z.object({
        title: z.string(),
        description: z.string(),
        label: z.string(),
        to: z.string(),
      }),
    }),
    admissions: z.object({
      header: z.object({
        kicker: z.string(),
        title: z.string(),
        description: z.string(),
      }),
      eligibility: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            programme: z.string(),
            age: z.string(),
            note: z.string(),
          }),
        ),
      }),
      process: z.object({
        kicker: z.string(),
        title: z.string(),
        steps: z.array(
          z.object({
            step: z.string(),
            title: z.string(),
            desc: z.string(),
          }),
        ),
      }),
      documents: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(z.string()),
      }),
      dates: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
      }),
      cta: z.object({
        title: z.string(),
        description: z.string(),
        label: z.string(),
        to: z.string(),
      }),
    }),
    contact: z.object({
      header: z.object({
        kicker: z.string(),
        title: z.string(),
      }),
      address: z.object({
        title: z.string(),
        lines: z.array(z.string()),
      }),
      details: z.object({
        title: z.string(),
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
      }),
      officeHours: z.object({
        title: z.string(),
        hours: z.array(z.string()),
      }),
      form: z.object({
        title: z.string(),
        successTitle: z.string(),
        successMessage: z.string(),
      }),
    }),
  }),
})

export default defineConfig({
  collections: [blog, site],
})
