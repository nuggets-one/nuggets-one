## Summary

- <!-- what changed and why -->

## Detail UI Contract (required when touching detail drawer/sheet)

- [ ] I followed `docs/ARTICLE_DETAIL_DRAWER_UI_SPEC.md` as the only implementation source.
- [ ] I did not implement from the legacy detail spec (non-implementable reference described in canonical spec section 0.1).
- [ ] I changed only owner files for touched zones (see ownership matrix in canonical spec).
- [ ] I verified no duplicated zone rendering (actions/source/brand rows appear only once).
- [ ] Hierarchy contract passes (top controls -> tags -> title -> meta -> source -> media -> body -> disclaimer -> footer, per canonical spec version).
- [ ] Typography token contract passes (or token table was updated in the same PR).

## Screenshots (required for detail UI changes)

- [ ] Before screenshot attached
- [ ] After screenshot attached
- [ ] Drawer state screenshot attached
- [ ] Full-page detail screenshot attached
- [ ] One edge state attached (YouTube hero / image hero / missing-media fallback / long-content disclaimer)

## Verification

- [ ] Ran local checks/tests relevant to this change
- [ ] No forbidden package/pattern introduced
