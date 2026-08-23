import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useReducer } from 'react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL } from '../lib/site'
import { Toaster } from '#/components/ui/sonner'
import { SchemaOrg } from '#/components/SchemaOrg'
import {
  applyDensity,
  getDensity,
  subscribeToPreferences,
} from '#/lib/preferences'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles/styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;var dens=window.localStorage.getItem('prefs:density');var d=(dens==='compact'||dens==='comfortable')?dens:'comfortable';root.classList.remove('density-compact','density-comfortable');root.classList.add('density-'+d);}catch(e){}})();`

const GTM_ID = 'GTM-KC392LXX'
const GTM_HEAD_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`

const GADS_ID = 'AW-18155861608'
const GADS_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GADS_ID}');`

function GoogleAdsTag() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname.startsWith('/dashboard')) return null
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`}
      />
      <script dangerouslySetInnerHTML={{ __html: GADS_SCRIPT }} />
    </>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: SITE_TITLE,
      },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
      {
        name: 'keywords',
        content:
          'preschool, nursery, LKG, UKG, kindergarten, Bengaluru, Bangalore, Indo-German School, early childhood education, admissions open',
      },
      {
        name: 'author',
        content: SITE_TITLE,
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      {
        property: 'og:title',
        content: SITE_TITLE,
      },
      {
        property: 'og:description',
        content: SITE_DESCRIPTION,
      },
      {
        property: 'og:url',
        content: SITE_URL,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: SITE_TITLE,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: SITE_TITLE,
      },
      {
        name: 'twitter:description',
        content: SITE_DESCRIPTION,
      },
      // PWA
      {
        name: 'application-name',
        content: 'IGS',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'IGS',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'theme-color',
        content: '#f6efe2',
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: '#1c1812',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    links: [
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'preload',
        href: '/fonts/nunito-v32-latin-regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/fraunces-v38-latin-regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">Page not found</p>
      <a href="/" className="text-blue-500 hover:underline">
        Go home
      </a>
    </div>
  ),
})

// Authorization failures are expected and safe to surface. Anything else may
// carry internals (DB driver text, SQL, stack frames), so show a generic
// message and keep the detail server-side.
function RootErrorComponent({ error }: { error: Error }) {
  const message = error.message ?? ''
  const isAuthError =
    message === 'Unauthorized' ||
    message === 'Forbidden' ||
    message.startsWith('Books are closed through')

  if (!import.meta.env.DEV && !isAuthError) {
    console.error('Unhandled route error:', error)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">
        {isAuthError ? 'Access denied' : 'Something went wrong'}
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-prose">
        {isAuthError
          ? message === 'Unauthorized'
            ? 'Please sign in to continue.'
            : "You don't have permission to view this."
          : 'An unexpected error occurred. Please try again, or contact an administrator if it persists.'}
      </p>
      {import.meta.env.DEV && !isAuthError && (
        <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-4 text-left text-xs">
          {error.stack ?? message}
        </pre>
      )}
      <a href="/" className="text-blue-500 hover:underline">
        Go home
      </a>
    </div>
  )
}

function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [, bump] = useReducer((v: number) => v + 1, 0)
  useEffect(() => {
    applyDensity(getDensity())
    return subscribeToPreferences(() => bump())
  }, [])
  return <>{children}</>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // The dashboard brings its own chrome (sidebar + header); the marketing
  // Header/Footer would sit above the fixed sidebar and hide its top items.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isDashboard = pathname.startsWith('/dashboard')

  // Register the PWA service worker (production only — a SW in dev caches
  // aggressively and fights HMR).
  useEffect(() => {
    if (!import.meta.env.PROD) return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GTM_HEAD_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <GoogleAdsTag />
        <HeadContent />
        <SchemaOrg />
      </head>
      <body className="font-sans antialiased wrap:anywhere selection:bg-[rgba(79,184,178,0.24)]">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <TanStackQueryProvider>
          <PreferencesProvider>
            {!isDashboard && <Header />}
            {children}
            {!isDashboard && <Footer />}
          </PreferencesProvider>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </TanStackQueryProvider>
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
}
