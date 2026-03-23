import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { cn } from '#/lib/utils'
import { Image } from '#/components/ui/image'

interface TeamMember {
  name: string
  role: string
  img: string
}

interface TeamGroupProps {
  title: string
  members: TeamMember[]
  columns?: string
  cardClassName?: string
}

interface TeamGridProps {
  kicker?: string
  groups: TeamGroupProps[]
  className?: string
}

function TeamGroup({ title, members, columns = '3', cardClassName }: TeamGroupProps) {
  const colsClass = columns === '2' ? 'sm:grid-cols-2' : 'grid-cols-3'

  return (
    <>
      <h2 className="display-title mb-6 text-2xl font-bold text-foreground sm:text-3xl">
        {title}
      </h2>
      <div className={cn('grid justify-center gap-4', colsClass)}>
        {members.map((member) => (
          <Card
            key={member.name}
            className={cn(
              'relative mx-auto w-full max-w-xs bg-transparent p-5 shadow-none border-0',
              cardClassName,
            )}
          >
            <Image
              src={member.img}
              alt={member.name}
              width={300}
              height={300}
              className="bg-green-300 relative z-20 aspect-square w-full rounded-md object-cover brightness-90 dark:brightness-75"
            />
            <CardHeader className='gap-0'>
              <CardTitle className='mb-0'>{member.name}</CardTitle>
              <CardDescription>{member.role}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  )
}

export function TeamGrid({ kicker, groups, className }: TeamGridProps) {
  return (
    <section className={className}>
      {kicker && <p className="island-kicker mb-2">{kicker}</p>}
      {groups.map((group, i) => (
        <div key={group.title} className={i > 0 ? 'mt-20' : undefined}>
          <TeamGroup {...group} />
        </div>
      ))}
    </section>
  )
}
