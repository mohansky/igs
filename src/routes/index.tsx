import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE, SITE_URL } from '#/lib/site'
import { CTASection } from '#/components/sections/CTA'
import { Hero } from '#/components/sections/Hero'
import { Programmes } from '#/components/sections/Programmes'
import { Stats } from '#/components/sections/Stats'
import { Values } from '#/components/sections/Values'
import { FAQ } from '#/components/sections/FAQ'
import {
  SketchStar,
  SketchUnderline,
  SketchTree,
  SketchHand,
  SketchBook,
} from '#/components/Sketches'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: `Home | ${SITE_TITLE}` }],
    links: [{ rel: 'canonical', href: SITE_URL }],
  }),
  component: Home,
})

const { hero, programmes, stats, whyUs, pledge, faqs, cta } = site.home

const valueIcons = [SketchHand, SketchBook, SketchTree, SketchStar]

function Home() {
  return (
    <main>
      <div className="page-wrap pt-8 pb-20">
        <Hero
          kicker="A preschool in Kasturi Nagar · Bengaluru"
          title={hero.title
            .split(/(\bbloom\b)/)
            .map((part: string, i: number) =>
              part === 'bloom' ? (
                <em key={i}>
                  bloom
                  <SketchUnderline
                    width={150}
                    color="var(--accent)"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -10,
                      width: '100%',
                    }}
                  />
                </em>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          description={hero.description}
          descriptionMaxWidth="52ch"
          buttons={[
            {
              label: hero.primaryCta.label,
              to: hero.primaryCta.to,
              variant: 'accent',
            },
            {
              label: hero.secondaryCta.label,
              to: hero.secondaryCta.to,
              variant: 'ghost',
            },
          ]}
          handnote={{ text: 'Admissions for 2026–27 are open' }}
          collage={{
            images: [
              {
                src: hero.images?.[0] ?? '',
                alt: hero.kicker || hero.title,
                fallback: 'Story circle, mornings',
                style: {
                  top: '6%',
                  left: '8%',
                  width: '62%',
                  height: '58%',
                  transform: 'rotate(-3deg)',
                  zIndex: 2,
                },
              },
              {
                src: hero.images?.[1] ?? '',
                alt: hero.kicker || hero.title,
                fallback: 'Mud kitchen, after lunch',
                style: {
                  bottom: '4%',
                  right: '4%',
                  width: '52%',
                  height: '50%',
                  transform: 'rotate(2.5deg)',
                  zIndex: 1,
                  background: 'var(--bg-2)',
                },
              },
            ],
            showSketches: true,
            showCloud: true,
          }}
        />
      </div>

      {/* Programmes */}
      <Programmes
        kicker={programmes.kicker}
        title={programmes.title
          .split(/(\bone tiny step\b)/)
          .map((part: string, i: number) =>
            part === 'one tiny step' ? (
              <span key={i} className="italic text-(--accent)">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        description={programmes.description}
        items={programmes.items}
      />

      {/* Stats */}
      <Stats items={stats.items} />

      {/* Values + Pledge */}
      <Values
        kicker={whyUs.kicker}
        title={whyUs.title
          .split(/(\bexpect\b)/)
          .map((part: string, i: number) =>
            part === 'expect' ? (
              <span key={i} className="italic text-(--accent)">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        items={whyUs.items}
        valueIcons={valueIcons}
        pledge={{
          quote: pledge.quote
            .split(/(\bcareful hands\b)/)
            .map((part: string, i: number) =>
              part === 'careful hands' ? (
                <span key={i} className="accent">
                  {part}
                </span>
              ) : (
                part
              ),
            ),
          attribution: pledge.attribution,
        }}
      />

      {/* FAQs */}
      <FAQ kicker={faqs.kicker} title={faqs.title} items={faqs.items} />

      {/* CTA band */}
      <CTASection
        eyebrow="Admissions 2026–27"
        title={
          cta.title.includes('open') ? (
            <>
              Come for a{' '}
              <em className="italic" style={{ color: 'var(--accent-3)' }}>
                visit.
              </em>
            </>
          ) : (
            cta.title
          )
        }
        description={cta.description}
        buttons={[
          {
            label: cta.primaryCta.label,
            to: cta.primaryCta.to,
            variant: 'primary',
          },
          {
            label: cta.secondaryCta.label,
            to: cta.secondaryCta.to,
            variant: 'ghost',
          },
        ]}
        meta={[
          { label: '+91 80507 18044', detail: 'Mon–Fri, 9am to 1pm' },
          { label: '+91 97312 92369', detail: 'Mon–Fri, 9am to 1pm' },
          {
            label: 'info@indogermanschool.com',
            detail: 'We reply within a day',
          },
          { label: 'Kasturi Nagar, Bengaluru', detail: 'Drop in for a tour' },
        ]}
        showSketch
      />
    </main>
  )
}
