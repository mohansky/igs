import { createFileRoute } from '@tanstack/react-router'
import { cn } from '#/lib/utils'
import { site, SITE_URL } from '#/lib/site'
import { Image } from '#/components/ui/image'
import { Hero } from '#/components/sections/Hero'
import PhoneIcon from '#/components/icons/PhoneIcon'
import WhatsAppIcon from '#/components/icons/WhatsAppIcon'
import {
  SketchHand,
  SketchKidWaving,
  SketchLeaf,
  SketchStar,
  SketchSun,
} from '#/components/Sketches'

const PAGE_TITLE =
  'Playgroup & Play School in Kasturi Nagar for Toddlers | Indo-German School'
const PAGE_DESCRIPTION =
  "Looking for a playgroup near you? Our play school in Kasturi Nagar welcomes toddlers aged 1.5–2 years into a warm, caring playgroup — small groups, a safe & hygienic campus, and rolling admissions. Call or WhatsApp us today."

export const Route = createFileRoute('/playgroup')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESCRIPTION },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESCRIPTION },
      { property: 'og:url', content: `${SITE_URL}/playgroup` },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}/playgroup` }],
  }),
  component: Playgroup,
})

const { contact } = site

const whatsappDetail = contact.details.items.find((i: { label: string }) =>
  i.label.includes('WhatsApp'),
)
const phoneDetail = contact.details.items.find((i: { label: string }) =>
  i.label.includes('Phone'),
)

const PHONE = phoneDetail?.value ?? site.header.phone
const PHONE_DISPLAY = '+91 80507 18044'
const WHATSAPP_DIGITS = (whatsappDetail?.value ?? PHONE).replace(/\D/g, '')
const WHATSAPP_TEXT = "Hi, I'd like to enquire about the playgroup for my child."
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(WHATSAPP_TEXT)}`

const REASSURANCE_ITEMS = [
  {
    icon: SketchHand,
    title: 'Small, inclusive groups',
    desc: "Our playgroup keeps class sizes small and welcoming, so every toddler — whatever their pace — gets noticed, comforted, and encouraged.",
  },
  {
    icon: SketchKidWaving,
    title: 'Warm, experienced teachers',
    desc: 'Teachers trained in early years care who know how to settle a little one on their very first day away from home.',
  },
  {
    icon: SketchLeaf,
    title: 'Safe & hygienic space',
    desc: 'A CCTV-monitored, child-proofed play school campus with hygienic washrooms and a secure pick-up and drop-off process.',
  },
  {
    icon: SketchStar,
    title: 'Join anytime, no waiting',
    desc: "Rolling admissions mean your toddler can start playgroup the week you're ready — no need to wait for a new term.",
  },
]

const PHOTO_ITEMS = [
  { src: 'gallery/activityroom.jpg', alt: 'Playgroup activity room at Indo-German School, Kasturi Nagar' },
  { src: 'gallery/hygienic.jpg', alt: 'Safe, hygienic play school washroom for toddlers' },
  { src: 'gallery/classrooms.jpg', alt: 'Bright, toddler-friendly playgroup classroom' },
  { src: 'gallery/IMG_5904.jpg', alt: 'Toddlers at play in our Kasturi Nagar playgroup' },
  { src: 'gallery/IMG_5938.jpg', alt: 'Playgroup children exploring the outdoor play area' },
  { src: 'gallery/IMG_5952.jpg', alt: 'Story time in the Indo-German School playgroup' },
]

const JOIN_STEPS = [
  {
    step: '1',
    title: 'Call or WhatsApp us',
    desc: 'Tell us a little about your toddler and ask any questions — we typically reply within the day.',
  },
  {
    step: '2',
    title: 'Visit our Kasturi Nagar campus',
    desc: 'See the playgroup room, meet the teachers, and get a feel for the space before you decide.',
  },
  {
    step: '3',
    title: 'Join anytime',
    desc: "Rolling admissions mean you don't have to wait for a new term — begin whenever you're ready.",
  },
]

function CTAButtons({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-3.5', className)}>
      <a href={`tel:${PHONE}`} title={`Call us at ${PHONE}`}>
        <span className="btn-paper btn-accent">
          <PhoneIcon size={18} aria-hidden="true" />
          Call us
        </span>
      </a>
      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp us"
      >
        <span className="btn-paper btn-ghost">
          <WhatsAppIcon size={18} aria-hidden="true" />
          WhatsApp us
        </span>
      </a>
    </div>
  )
}

function Playgroup() {
  return (
    <main>
      {/* Hero */}
      <div className="page-wrap pt-8 pb-16">
        <Hero
          kicker="Playgroup & Play School · Kasturi Nagar"
          headlineMaxWidth="18ch"
          title={
            <>
              A caring <em>playgroup</em> for your toddler, close to home in
              Kasturi Nagar.
            </>
          }
          description="Our play school in Kasturi Nagar welcomes toddlers aged 1.5–2 years into a warm, unhurried playgroup — small groups, caring teachers, and a safe, hygienic space designed just for little ones."
          descriptionMaxWidth="52ch"
          handnote={{
            text: 'Admissions open all year — join anytime',
          }}
        />
        <CTAButtons className="mt-2" />
      </div>

      {/* Reassurance points */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Why parents choose us</div>
              <h2 className="text-[clamp(32px,4.5vw,48px)] leading-[1.05] max-w-[20ch]">
                Everything a first playgroup should feel like.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REASSURANCE_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="feature-card flex flex-col gap-3 p-7"
                >
                  <Icon size={56} color="var(--accent)" />
                  <h4 className="font-serif text-xl">{item.title}</h4>
                  <p className="text-(--ink-soft) text-[15px] m-0">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Photo section */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">A peek inside</div>
              <h2 className="text-[clamp(32px,4.5vw,48px)] leading-[1.05] max-w-[20ch]">
                Where your toddler's day happens.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {PHOTO_ITEMS.map((img, i) => (
              <div
                key={img.src}
                className="photo-card"
                style={{
                  aspectRatio: '4/5',
                  transform: `rotate(${(i % 3) - 1}deg)`,
                }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="rounded-[3px] object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to join */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Visit us</div>
              <h2 className="text-[clamp(32px,4.5vw,48px)] leading-[1.05] max-w-[20ch]">
                How to join our playgroup.
              </h2>
              <p>
                We're in Kasturi Nagar, Bengaluru, and we run rolling
                admissions — so your toddler can join the playgroup any
                time of year.
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {JOIN_STEPS.map((s, i) => (
              <article
                key={s.step}
                className="rounded-[18px] p-7 relative"
                style={{
                  border: '1.5px solid var(--ink)',
                  background: i % 2 ? 'var(--paper)' : 'var(--bg-2)',
                }}
              >
                <div
                  className="font-serif italic leading-none mb-4"
                  style={{ fontSize: 48, color: 'var(--accent)' }}
                >
                  {s.step.padStart(2, '0')}
                </div>
                <h4 className="font-serif text-xl mb-2">{s.title}</h4>
                <p className="text-(--ink-soft) text-[14.5px] m-0">
                  {s.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA band */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="cta-band">
            <div className="relative z-2">
              <div
                className="section-eyebrow"
                style={{ color: 'var(--accent-3)' }}
              >
                Ready when you are
              </div>
              <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05] text-(--paper) max-w-[18ch]">
                Come meet our <em className="italic text-(--accent-3)">playgroup</em>{' '}
                family.
              </h2>
              <p className="text-primary max-w-[38ch] mt-5 mb-7">
                Call or WhatsApp us to ask a question or book a visit to our
                Kasturi Nagar play school.
              </p>
              <CTAButtons />
            </div>

            <div className="cta-meta">
              <div>
                <b>{PHONE_DISPLAY}</b>
              </div>
              <div>
                <b>Kasturi Nagar, Bengaluru</b>
              </div>
              <div>
                <b>{contact.officeHours.hours[0]}</b>
              </div>
            </div>

            <div
              className="float wiggle"
              style={{ top: 20, right: 20, opacity: 0.7 }}
            >
              <SketchSun size={80} color="var(--accent-3)" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
