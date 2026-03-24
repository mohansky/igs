import { Link, createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Button } from '#/components/ui/button'
import { Hero } from '#/components/sections/Hero'
import { CtaBanner } from '#/components/sections/CtaBanner'
import { CardGroup } from '#/components/sections/CardGroup'
import { CardDescription, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: `Home | ${SITE_TITLE}` }],
  }),
  component: Home,
})

const { hero, programmes, whyUs, cta } = site.home

function Home() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      {/* Hero */}
      <Hero
        image={hero.image}
        kicker={hero.kicker}
        title={hero.title}
        description={hero.description}
        size="lg"
      >
        <Link to={hero.primaryCta.to as string}>
          <Button
            variant="outline"
            className="dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
          >
            {hero.primaryCta.label}
          </Button>
        </Link>
        <Link to={hero.secondaryCta.to as string}>
          <Button className="dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
            {hero.secondaryCta.label}
          </Button>
        </Link>
      </Hero>

      {/* Programmes */}
      <CardGroup
        kicker={programmes.kicker}
        title={programmes.title}
        items={programmes.items}
        columns="5"
        cardClassName="p-6"
        getKey={(prog) => prog.title}
        className="mt-20"
        renderItem={(prog) => (
          <>
            {/* <p className="island-kicker mb-1">{prog.age}</p>  */}
            <CardTitle>{prog.title}</CardTitle>
            <CardDescription>{prog.desc}</CardDescription>
          </>
        )}
      />

      {/* Why Choose Us */}
      <CardGroup
        kicker={whyUs.kicker}
        title={whyUs.title}
        items={whyUs.items}
        variant="list"
        columns="1"
        getKey={(item) => item.title}
        className="mt-20"
        renderItem={(item) => (
          <>
            <li className='list-disc list-inside text-2xl'> {item.title}</li>
          </>
        )}
      />

      {/* CTA */}
      <CtaBanner
        title={cta.title}
        description={cta.description}
        primaryCta={cta.primaryCta}
        secondaryCta={cta.secondaryCta}
        className="mt-20"
      />
    </main>
  )
}
