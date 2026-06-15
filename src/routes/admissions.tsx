import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { ContactForm } from '#/components/sections/ContactForm'
import { CTASection } from '#/components/sections/CTA'
import { Hero } from '#/components/sections/Hero'
import { Documents } from '#/components/sections/Documents'
// import { Eligibility } from '#/components/sections/Eligibility'
import { ProcessSteps } from '#/components/sections/ProcessSteps'

export const Route = createFileRoute('/admissions')({
  head: () => ({
    meta: [{ title: `Admissions | ${SITE_TITLE}` }],
  }),
  component: Admissions,
})

const { header, process, documents, dates, cta } = site.admissions

function Admissions() {
  return (
    <main>
      {/* Hero */}
      <div className="page-wrap pt-8 pb-16">
        <Hero
          kicker={`Admissions · ${header.kicker}`}
          headlineMaxWidth="20ch"
          title={
            <>
              How a child <em>joins</em> our school.
            </>
          }
          description={header.description}
        />
      </div>

      {/* Process steps */}
      <ProcessSteps
        kicker={process.kicker}
        title={process.title}
        steps={process.steps}
      />

      {/* Eligibility */}
      {/* <Eligibility
        kicker={eligibility.kicker}
        title={eligibility.title}
        items={eligibility.items}
      /> */}

      {/* Documents + dates */}
      <Documents
        kicker={documents.kicker}
        title={documents.title}
        items={documents.items}
        dates={dates}
      />

      {/* Enquiry form */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="contact-card">
            <div>
              <div className="section-eyebrow">Enquiry form</div>
              <h4>Write to us</h4>
              <p className="text-(--ink-soft) text-[15px] mt-2">
                We'll write back within a working day to set up a visit.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* CTA band */}
      <CTASection
        eyebrow="Ready to join?"
        title={cta.title}
        description={cta.description}
        buttons={[{ label: cta.label, to: cta.to }]}
        meta={[
          { label: '+91 80507 18044', detail: 'Mon–Fri, 9am to 1pm' },
          { label: '+91 97312 92369', detail: 'Mon–Fri, 9am to 1pm' },
          {
            label: 'indogermanschool@gmail.com',
            detail: 'We reply within a day',
          },
        ]}
      />
    </main>
  )
}
