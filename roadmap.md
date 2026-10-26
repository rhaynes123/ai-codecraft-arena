# Detroit training options

- [x] Verify real bootcamp and technology training providers using official sources.
- [x] Add a public training directory with local and online filters and official program links.
- [x] Make training discoverable from navigation and the challenge catalog.
- [x] Verify filters, links, page rendering, and existing tests (37 passing).

# AI model and context changes

- [x] Use verified Luna for chat and Sol for judging (both responded through the gateway; Sol returned the exact report schema).
- [x] Automatically attach the active file and matching visible tests, retaining manual extras (verified signed-in request paths).
- [x] Test context selection and model selection (16 focused tests passed; preview build OK).
- [x] Handle absent AI configuration without a route crash or practice-credit deduction (regression test and signed-in browser check passed; manual tests still run).
- [ ] Verify chat-to-tests and submission-to-report end to end: blocked by missing LOVABLE_API_KEY and SUPABASE_SERVICE_ROLE_KEY in the preview server runtime; direct gateway calls passed.