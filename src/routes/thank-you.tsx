import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { SketchBird, SketchStar } from '#/components/Sketches'

export const Route = createFileRoute('/thank-you')({
  head: () => ({
    meta: [
      { title: `Thank You | ${SITE_TITLE}` },
      { name: 'robots', content: 'noindex, follow' },
    ],
  }),
  component: ThankYou,
})

const { form } = site.contact

function ThankYou() {
  useEffect(() => {
    ;(window as Window & { dataLayer?: object[] }).dataLayer?.push({
      event: 'thank_you_page_view',
    })
  }, [])

  return (
    <main>
      <div className="page-wrap pt-8 pb-24">
        <section className="relative mx-auto max-w-[60ch] py-20 text-center">
          <div
            className="float wiggle"
            style={{ top: -10, left: '10%', ['--rot' as never]: '-8deg' }}
          >
            <SketchBird size={64} color="var(--accent-4)" />
          </div>
          <div
            className="float wiggle"
            style={{ top: 0, right: '8%', ['--rot' as never]: '10deg' }}
          >
            <SketchStar size={48} color="var(--accent-3)" />
          </div>

          <h1 className="hero-headline mx-auto" style={{ maxWidth: '16ch' }}>
            {form.successTitle}
          </h1>
          <p className="mx-auto mt-7 max-w-[45ch] text-[19px] leading-relaxed text-(--ink-soft)">
            {form.successMessage}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <Link to="/" title="Back to homepage">
              <span className="btn-paper btn-accent">
                Back to homepage
                <span aria-hidden style={{ fontSize: 18, lineHeight: 0.8 }}>
                  →
                </span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
