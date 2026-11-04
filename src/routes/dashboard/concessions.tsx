import { createFileRoute, redirect } from '@tanstack/react-router'

// Now a tab on the Fees page; kept so old links and bookmarks still work.
export const Route = createFileRoute('/dashboard/concessions')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/fees', search: { tab: 'concessions' } })
  },
})
