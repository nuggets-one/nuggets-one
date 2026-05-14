/**
 * Legal documents: full-bleed white in light mode so no slate “frame” from main padding /
 * max-width. Cancels main `pt-6` with `-mt-6` + restores inner `pt-6`.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mt-6 ml-[calc(50%-50vw)] w-screen overflow-x-clip bg-white px-4 pb-10 pt-6 text-primary dark:bg-bg sm:px-6 lg:px-8"
    >
      {children}
    </div>
  )
}
