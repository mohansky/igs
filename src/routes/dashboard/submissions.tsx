import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { format } from 'date-fns'
import {
  getContactSubmissions,
  updateSubmissionStatus,
} from '#/server/contact'
import { Card, CardContent, CardDescription, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/dashboard/submissions')({
  beforeLoad: ({ context }) => {
    const userRole =
      (context.session.user as { role?: string }).role ?? 'student'
    if (!['admin', 'staff'].includes(userRole)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SubmissionsPage,
})

type SubmissionStatus = 'new' | 'read' | 'replied' | 'archived'

const statusColors: Record<SubmissionStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  read: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  replied: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
}

const statusOptions: SubmissionStatus[] = ['new', 'read', 'replied', 'archived']

function SubmissionsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['contact-submissions'],
    queryFn: () => getContactSubmissions(),
  })

  const filtered =
    filter === 'all'
      ? submissions
      : submissions.filter((s) => s.status === filter)

  const handleStatusChange = async (id: number, status: SubmissionStatus) => {
    await updateSubmissionStatus({ data: { id, status } })
    queryClient.invalidateQueries({ queryKey: ['contact-submissions'] })
  }

  const counts = {
    all: submissions.length,
    new: submissions.filter((s) => s.status === 'new').length,
    read: submissions.filter((s) => s.status === 'read').length,
    replied: submissions.filter((s) => s.status === 'replied').length,
    archived: submissions.filter((s) => s.status === 'archived').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Submissions</h1>
        <p className="text-sm text-muted-foreground">
          Manage enquiries from the website contact form
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...statusOptions] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            <span className="capitalize">{status}</span>
            <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
              {counts[status]}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CardDescription>No submissions found</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((submission) => {
            const isExpanded = expandedId === submission.id
            return (
              <Card
                key={submission.id}
                className={cn(
                  'cursor-pointer transition-shadow hover:shadow-md p-0',
                  submission.status === 'new' && 'border-l-4 border-l-chart-2',
                )}
                onClick={() =>
                  setExpandedId(isExpanded ? null : submission.id)
                }
              >
                <CardContent className="p-2">
                  {/* Summary row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="mb-0 truncate text-base">
                          {submission.name}
                        </CardTitle>
                        <span
                          className={cn(
                            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                            statusColors[
                              submission.status as SubmissionStatus
                            ],
                          )}
                        >
                          {submission.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {submission.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {submission.createdAt
                        ? format(
                            new Date(submission.createdAt),
                            'dd-MM-yyyy, h:mm a',
                          )
                        : '—'}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="mt-4 space-y-4 border-t pt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Email
                          </span>
                          <p className="mt-0.5">
                            <a
                              href={`mailto:${submission.email}`}
                              className="text-primary underline"
                            >
                              {submission.email}
                            </a>
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Phone
                          </span>
                          <p className="mt-0.5">
                            <a
                              href={`tel:${submission.phone}`}
                              className="text-primary underline"
                            >
                              {submission.phone}
                            </a>
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Subject
                          </span>
                          <p className="mt-0.5">{submission.subject}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Message
                        </span>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                          {submission.message}
                        </p>
                      </div>

                      {/* Status actions */}
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((status) => (
                          <Button
                            key={status}
                            variant={
                              submission.status === status
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            disabled={submission.status === status}
                            onClick={() =>
                              handleStatusChange(submission.id, status)
                            }
                          >
                            Mark as {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
