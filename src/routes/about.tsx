import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '#/components/ui/card'
import { Hero } from '#/components/sections/Hero'
import { CtaBanner } from '#/components/sections/CtaBanner'
import { AlternatingFeatures } from '#/components/sections/AlternatingFeatures'
import { SectionCard } from '#/components/sections/SectionCard'
import { TeamGrid } from '#/components/sections/TeamGrid'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: `About Us | ${SITE_TITLE}` }],
  }),
  component: About,
})

const { intro, mission, vision, team, approach, campus, cta } = site.about

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      {/* Intro */}
      <Hero
        image={intro.image}
        kicker={intro.kicker}
        title={intro.title}
        description={intro.description}
        size="md"
      />

      {/* Mission & Vision */}
      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        <Card variant="feature">
          <CardContent>
            <CardTitle>{mission.title}</CardTitle>
            <CardDescription>{mission.description}</CardDescription>
          </CardContent>
        </Card>
        <Card
          variant="feature" 
          style={{ animationDelay: '90ms' }}
        >
          <CardContent>
            <CardTitle>{vision.title}</CardTitle>
            <CardDescription>{vision.description}</CardDescription>
          </CardContent>
        </Card>
      </section>

      {/* Our Approach */}
      <SectionCard
        kicker={approach.kicker}
        title={approach.title}
        className="mt-20"
      >
        <CardContent className="space-y-4">
          {approach.paragraphs.map((paragraph) => (
            <CardDescription key={paragraph.slice(0, 40)}>
              {paragraph}
            </CardDescription>
          ))}
        </CardContent>
      </SectionCard>

      {/* Our Team */}
      <TeamGrid kicker={team.kicker} className="mt-20" groups={team.groups} />

      {/* Infrastructure */}
      <AlternatingFeatures
        kicker={campus.kicker}
        title={campus.title}
        items={campus.items}
        className="mt-20"
      />

      {/* CTA */}
      <CtaBanner
        title={cta.title}
        description={cta.description}
        primaryCta={{ label: cta.label, to: cta.to }}
        className="mt-20"
      />
    </main>
  )
}
