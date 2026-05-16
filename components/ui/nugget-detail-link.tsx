'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string
}

/**
 * Feed → nugget navigation. Uses the canonical `/nuggets/[id]/[slug]` href so
 * Next.js can render the intercepted @modal sheet on client navigations.
 * `scroll={false}` keeps feed scroll when the sheet closes via router.back().
 */
export function NuggetDetailLink({ href, scroll = false, ...props }: Props) {
  return <Link href={href} scroll={scroll} {...props} />
}
