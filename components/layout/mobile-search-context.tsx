'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type MobileSearchContextValue = {
  isExpanded: boolean
  setExpanded: (expanded: boolean) => void
}

const MobileSearchContext = createContext<MobileSearchContextValue | null>(null)

export function MobileSearchProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpandedState] = useState(false)

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpandedState(expanded)
  }, [])

  const value = useMemo(
    () => ({ isExpanded, setExpanded }),
    [isExpanded, setExpanded]
  )

  return (
    <MobileSearchContext.Provider value={value}>{children}</MobileSearchContext.Provider>
  )
}

export function useMobileSearchExpanded(): boolean {
  return useContext(MobileSearchContext)?.isExpanded ?? false
}

export function useMobileSearchControls(): MobileSearchContextValue {
  const ctx = useContext(MobileSearchContext)
  if (!ctx) {
    throw new Error('useMobileSearchControls must be used within MobileSearchProvider')
  }
  return ctx
}
