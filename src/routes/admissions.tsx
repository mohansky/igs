import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { CtaBanner } from '#/components/sections/CtaBanner'
// import { CardGroup } from '#/components/sections/CardGroup'
import { SectionCard } from '#/components/sections/SectionCard'
import { CardDescription, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/admissions')({
  head: () => ({
    meta: [{ title: `Admissions | ${SITE_TITLE}` }],
  }),
  component: Admissions,
})

const { header, process, documents, dates, cta } = site.admissions

function Admissions() {
  return (
    <main className="page-wrap px-4 py-12">
      {/* Header */}
      <SectionCard kicker={header.kicker}>
        <h1 className="display-title mb-4 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
          {header.title}
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-(--sea-ink-soft)">
          {header.description}
        </p>
      </SectionCard>

      {/* Eligibility */}
      {/* <CardGroup
        kicker={eligibility.kicker}
        title={eligibility.title}
        items={eligibility.items}
        columns="3"
        cardClassName="p-6"
        getKey={(item) => item.programme}
        className="mt-20"
        renderItem={(item) => (
          <>
            <CardTitle>{item.programme}</CardTitle>
            <CardSubtitle>{item.age}</CardSubtitle>
            <CardDescription>{item.note}</CardDescription>
          </>
        )}
      /> */}

      {/* Application Process */}
      <SectionCard
        kicker={process.kicker}
        title={process.title}
        className="mt-20"
      >
        <div className="space-y-6">
          {process.steps.map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(79,184,178,0.14)] text-sm font-bold text-(--lagoon-deep)">
                {item.step}
              </div>
              <div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Documents Required */}
      <SectionCard
        kicker={documents.kicker}
        title={documents.title}
        className="mt-20"
      >
        <ul className="m-0 space-y-2.5 pl-5 text-sm leading-relaxed text-(--sea-ink-soft)">
          {documents.items.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </SectionCard>

      {/* Important Dates */}
      <SectionCard kicker={dates.kicker} title={dates.title} className="hidden mt-20">
        <div className="grid gap-3 sm:grid-cols-2">
          {dates.items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border p-4"
            >
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-(--kicker)">
                {item.label}
              </p>
              <CardDescription>{item.value}</CardDescription>
            </div>
          ))}
        </div>
      </SectionCard>

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
