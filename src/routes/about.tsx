import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Image } from '#/components/ui/image'
import { CTASection } from '#/components/sections/CTA'
import { Hero } from '#/components/sections/Hero'
import {
  SketchSun,
  SketchHand,
  SketchBook,
  SketchTree,
  SketchStar,
  SketchSwirl,
  SketchCloud,
} from '#/components/Sketches'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: `About Us | ${SITE_TITLE}` }],
  }),
  component: About,
})

const { intro, mission, vision, team, approach, campus, cta } = site.about
const { whyUs } = site.home

const valueIcons = [SketchHand, SketchBook, SketchTree, SketchStar]

function About() {
  return (
    <main>
      {/* Intro hero */}
      <div className="page-wrap pt-8 pb-16">
        <Hero
          kicker={intro.kicker}
          headlineMaxWidth="18ch"
          title={
            <>
              We started with a <em>simple idea</em> children deserve their own
              pace.
            </>
          }
          description={intro.description}
        />
      </div>

      {/* Photo + philosophy */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div className="relative mx-auto w-full max-w-115">
              <div
                className="photo-card"
                style={{ aspectRatio: '4/5', transform: 'rotate(-2deg)' }}
              >
                <Image
                  src={intro.image}
                  alt={intro.title}
                  fill
                  priority
                  className="rounded-[3px] object-cover"
                />
              </div>
              <div
                className="float wiggle"
                style={{ top: -30, right: -30, ['--rot' as never]: '12deg' }}
              >
                <SketchSun size={72} color="var(--accent-3)" />
              </div>
            </div>
            <div>
              <div className="section-eyebrow">{approach.kicker}</div>
              <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05] mb-10">
                {mission.title}.
              </h2>
              <p className="text-(--ink-soft) text-[17px] mt-10 mb-4">
                {mission.description}
              </p>
              <p className="text-(--ink-soft) text-[17px] mb-4">
                {vision.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Approach paragraphs */}
      {approach.paragraphs.length > 0 && (
        <section className="pb-24">
          <div className="page-wrap">
            <div className="island-shell p-10 sm:p-14 max-w-[80ch] mx-auto">
              <div className="section-eyebrow">{approach.kicker}</div>
              <h2 className="text-[clamp(28px,3.5vw,44px)] leading-tight mb-6">
                {approach.title}
              </h2>
              <div className="space-y-4">
                {approach.paragraphs.map((paragraph: string) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-(--ink-soft) text-[17px] leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Values / Why us */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="values-section">
            <div className="relative z-2 max-w-180">
              <div className="section-eyebrow">{whyUs.kicker}</div>
              <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05]">
                What you can{' '}
                <span className="italic text-(--accent)">expect</span> from us.
              </h2>
            </div>
            <div className="values-grid">
              {whyUs.items.map(
                (v: { title: string; desc: string }, i: number) => {
                  const Icon = valueIcons[i % valueIcons.length]
                  return (
                    <div className="value" key={v.title}>
                      <div className="value-icon">
                        <Icon size={72} />
                      </div>
                      <h4>{v.title}</h4>
                      <p>{v.desc}</p>
                    </div>
                  )
                },
              )}
            </div>
            <div
              className="float pointer-events-none"
              style={{ top: 24, right: 32, opacity: 0.35 }}
            >
              <SketchCloud size={140} color="var(--ink)" />
            </div>
            <div
              className="float pointer-events-none"
              style={{ bottom: -10, right: '20%', opacity: 0.25 }}
            >
              <SketchSwirl size={80} color="var(--ink)" />
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      {team.groups.length > 0 && (
        <section className="pb-24">
          <div className="page-wrap">
            <div className="section-head">
              <div>
                <div className="section-eyebrow">{team.kicker}</div>
                <h2 className="text-[clamp(36px,5vw,52px)] leading-[1.05]">
                  Meet the people{' '}
                  <span className="italic text-(--accent)">behind</span> our
                  days.
                </h2>
              </div>
            </div>
            {team.groups.map(
              (group: {
                title: string
                columns?: string
                members: { name: string; role: string; img: string }[]
              }) => (
                <div key={group.title} className="mb-14">
                  <h3 className="font-serif text-2xl mb-6">{group.title}</h3>
                  <div
                    className="grid gap-6"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(240px, 1fr))`,
                    }}
                  >
                    {group.members.map((m, i: number) => (
                      <div key={m.name} className="text-center">
                        <div
                          className="photo-card mx-auto mb-3"
                          style={{
                            aspectRatio: '1/1',
                            width: '100%',
                            transform: `rotate(${(i % 3) - 1}deg)`,
                          }}
                        >
                          <Image
                            src={m.img}
                            alt={m.name}
                            width={300}
                            height={300}
                            className="h-full w-full rounded-[3px] object-cover"
                          />
                        </div>
                        <div className="font-serif text-lg leading-tight">
                          {m.name}
                        </div>
                        <div className="text-sm text-(--ink-soft) font-mono uppercase tracking-wider">
                          {m.role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {/* Campus */}
      {campus.items.length > 0 && (
        <section className="pb-24" id="campus">
          <div className="page-wrap">
            <div className="section-head">
              <div>
                <div className="section-eyebrow">{campus.kicker}</div>
                <h2 className="text-[clamp(36px,5vw,52px)] leading-[1.05]">
                  Ten thousand square feet of{' '}
                  <span className="italic text-(--accent)">
                    somewhere to be small.
                  </span>
                </h2>
              </div>
              <p>{campus.title}</p>
            </div>
            <div className="campus-strip">
              {campus.items.map(
                (item: { title: string; img: string; desc: string }) => (
                  <div className="campus-photo" key={item.title}>
                    <Image
                      src={item.img}
                      alt={item.title}
                      width={400}
                      height={500}
                      className="h-full w-full rounded-sm object-cover"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <CTASection
        eyebrow="Visit us"
        title={cta.title}
        description={cta.description}
        buttons={[{ label: cta.label, to: cta.to }]}
        meta={[
          { label: 'Kasturi Nagar', detail: 'Bengaluru — drop in for a tour' },
          { label: '+91 80507 18044', detail: 'Mon–Fri, 9am to 1pm' },
          { label: '+91 97312 92369', detail: 'Mon–Fri, 9am to 1pm' },
        ]}
      />
    </main>
  )
}
