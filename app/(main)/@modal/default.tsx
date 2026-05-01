// Required for parallel-slot routing — without this default, the @modal slot
// leaks into direct URL hits and breaks rendering. Phase 15 / plan §2.K.
export default function Default() {
  return null
}
