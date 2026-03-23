import { Link, createFileRoute } from '@tanstack/react-router'
import { allBlogs } from 'content-collections'
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '#/lib/site'
import { Card } from '#/components/ui/card'
import { formatDate } from '#/lib/utils'
import { Image } from '#/components/ui/image'

const canonical = `${SITE_URL}/blog`
const pageTitle = `Blog | ${SITE_TITLE}`

export const Route = createFileRoute('/blog/')({
  head: () => ({
    links: [{ rel: 'canonical', href: canonical }],
    meta: [
      { title: pageTitle },
      { name: 'description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/images/lagoon-1.svg` },
    ],
  }),
  component: BlogIndex,
})

function BlogIndex() {
  const postsByDate = Array.from(
    new Map(
      [...allBlogs]
        .sort(
          (a, b) =>
            new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
        )
        .map((post) => [post.slug, post]),
    ).values(),
  )

  const featured = postsByDate[0]
  const posts = postsByDate.slice(1)
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="mb-4">
        <p className="island-kicker mb-2">School Updates</p>
        <h1 className="display-title m-0 text-4xl font-bold tracking-tight text-(--sea-ink) sm:text-5xl">
          Blog
        </h1>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="glass" className="rise-in rounded-2xl p-5 sm:p-6 lg:col-span-2">
          {featured.heroImage ? (
            <Image
              src={featured.heroImage}
              alt=""
              width={800}
              height={240}
              className="mb-4 h-44 w-full rounded-xl object-cover xl:h-60"
            />
          ) : null}
          <h2 className="m-0 text-2xl font-semibold text-(--sea-ink)">
            <Link
              to="/blog/$slug"
              params={{ slug: featured.slug }}
              className="no-underline"
            >
              {featured.title}
            </Link>
          </h2>
          <p className="mb-2 mt-3 text-base text-(--sea-ink-soft)">
            {featured.description}
          </p>
          <p className="m-0 text-xs text-(--sea-ink-soft)">
            {formatDate(featured.pubDate)}
          </p>
        </Card>

        {posts.map((post, index) => (
          <Card
            key={post.slug}
            variant="glass"
            className="rise-in rounded-2xl p-5 sm:last:col-span-2 lg:last:col-span-1"
            style={{ animationDelay: `${index * 80 + 120}ms` }}
          >
            {post.heroImage ? (
              <Image
                src={post.heroImage}
                alt=""
                width={400}
                height={176}
                className="mb-4 h-44 w-full rounded-xl object-cover"
              />
            ) : null}
            <h2 className="m-0 text-2xl font-semibold text-(--sea-ink)">
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="no-underline"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mb-2 mt-2 text-sm text-(--sea-ink-soft)">
              {post.description}
            </p>
            <p className="m-0 text-xs text-(--sea-ink-soft)">
              {formatDate(post.pubDate)}
            </p>
          </Card>
        ))}
      </section>
    </main>
  )
}
