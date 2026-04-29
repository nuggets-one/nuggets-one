import Link from 'next/link'

export default function NuggetNotFound() {
  return (
    <div className="max-w-2xl mx-auto py-24 px-4 text-center">
      <p className="text-base font-semibold text-primary mb-2">
        This nugget isn&apos;t available.
      </p>
      <p className="text-sm text-muted mb-6">
        It may have been removed or the link may be incorrect.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline underline-offset-2"
      >
        Back to Home
      </Link>
    </div>
  )
}
