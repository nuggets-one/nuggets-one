'use client'

import { useCallback, useEffect, useState } from 'react'

const CHECKBOX_SELECTOR = '[data-articles-bulk-checkbox]'

function getCheckboxes(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(CHECKBOX_SELECTOR))
}

function getEnabledCheckboxes(): HTMLInputElement[] {
  return getCheckboxes().filter((el) => !el.disabled)
}

function readCheckedIds(): string[] {
  return getEnabledCheckboxes()
    .filter((el) => el.checked)
    .map((el) => el.dataset.articlesBulkArticleId)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
}

export function useArticlesBulkSelection() {
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([])

  const syncFromDom = useCallback(() => {
    setSelectedArticleIds(readCheckedIds())
  }, [])

  useEffect(() => {
    syncFromDom()

    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement | null
      if (!target?.matches(CHECKBOX_SELECTOR)) return
      syncFromDom()
    }

    document.addEventListener('change', onChange)
    return () => document.removeEventListener('change', onChange)
  }, [syncFromDom])

  const clearSelection = useCallback(() => {
    for (const el of getCheckboxes()) {
      el.checked = false
    }
    setSelectedArticleIds([])
  }, [])

  const selectAllOnPage = useCallback(() => {
    for (const el of getEnabledCheckboxes()) {
      el.checked = true
    }
    setSelectedArticleIds(readCheckedIds())
  }, [])

  const deselectAllOnPage = useCallback(() => {
    for (const el of getEnabledCheckboxes()) {
      el.checked = false
    }
    setSelectedArticleIds([])
  }, [])

  return {
    selectedArticleIds,
    selectedCount: selectedArticleIds.length,
    clearSelection,
    selectAllOnPage,
    deselectAllOnPage,
  }
}

export function ArticlesSelectAll() {
  const [enabledCount, setEnabledCount] = useState(0)
  const [allSelected, setAllSelected] = useState(false)
  const [someSelected, setSomeSelected] = useState(false)

  const updateState = useCallback(() => {
    const enabled = getEnabledCheckboxes()
    const checked = enabled.filter((el) => el.checked)
    setEnabledCount(enabled.length)
    setAllSelected(enabled.length > 0 && checked.length === enabled.length)
    setSomeSelected(checked.length > 0 && checked.length < enabled.length)
  }, [])

  useEffect(() => {
    updateState()
    document.addEventListener('change', updateState)
    return () => document.removeEventListener('change', updateState)
  }, [updateState])

  if (enabledCount === 0) {
    return <span className="sr-only">Select</span>
  }

  return (
    <input
      type="checkbox"
      checked={allSelected}
      ref={(el) => {
        if (el) el.indeterminate = someSelected
      }}
      onChange={(e) => {
        const enabled = getEnabledCheckboxes()
        if (e.target.checked) {
          for (const el of enabled) el.checked = true
        } else {
          for (const el of enabled) el.checked = false
        }
        enabled[0]?.dispatchEvent(new Event('change', { bubbles: true }))
      }}
      aria-label="Select all published nuggets on this page"
      className="size-4 rounded border-border text-accent focus:ring-accent/40"
    />
  )
}

export function ArticlesBulkCheckbox({
  articleId,
  title,
  disabled,
}: {
  articleId: string
  title: string
  disabled: boolean
}) {
  return (
    <input
      type="checkbox"
      data-articles-bulk-checkbox
      data-articles-bulk-article-id={articleId}
      disabled={disabled}
      aria-label={`Select ${title} for bulk add`}
      className="size-4 rounded border-border text-accent focus:ring-accent/40 disabled:opacity-40"
    />
  )
}
