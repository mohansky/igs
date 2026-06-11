import { allSites } from 'content-collections'

export const site = allSites[0]!

export const SITE_TITLE = site.meta.title
export const SITE_DESCRIPTION = site.meta.description
export const SITE_URL = site.meta.url
