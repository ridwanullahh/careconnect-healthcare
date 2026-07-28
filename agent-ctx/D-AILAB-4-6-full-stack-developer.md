# D-AILAB-4-6 — full-stack-developer

## Task
Implement AILab Tasks 4, 5, 6 (TODO6.md spec):
- Task 4: Emergency Communication Bridge
- Task 5: Medical Record Timeline Builder
- Task 6: Cultural & Religious Care Advisor

## Files Created
- `src/lib/ai/emergency-bridge.ts` — EmergencyBridgeService.generatePlan() → POST /api/ai/emergency-plan
- `src/lib/ai/medical-timeline.ts` — MedicalTimelineService.buildTimeline() → POST /api/ai/medical-timeline + fetchPatientRecords(userId) helper
- `src/lib/ai/cultural-advisor.ts` — CulturalAdvisorService.getGuidance() → POST /api/ai/cultural-guidance
- `src/pages/ailab/EmergencyBridgePage.tsx` — full React page (form, results, emergency banner)
- `src/pages/ailab/MedicalTimelinePage.tsx` — full React page (auto-loads patient records, vertical timeline visualization)
- `src/pages/ailab/CulturalAdvisorPage.tsx` — full React page (form with culture suggestions, results sections, disclaimer)

## Files Modified
- `src/App.tsx` — added 3 imports + 3 <Route> entries for /ailab/emergency-bridge, /ailab/medical-timeline, /ailab/cultural-advisor
- `src/pages/ailab/AILabPage.tsx` — added Siren, Globe2, History icons; added 3 new cards; updated ai-tools card to remove now-implemented features

## Patterns Used
- Shared `postAIEndpoint<T>()` helper in each lib file — fetches `${VITE_API_BASE_URL}${path}` with the `careconnect_api_token` from localStorage; unwraps `{data, error}` envelope; maps HTTP 503 → `AIServiceNotConfiguredError` with friendly message.
- Defensive `Array.isArray(...)` checks on every AI response field before rendering.
- Existing UI components: Card / CardHeader / CardTitle / CardContent, Badge, Button, Input, LoadingSpinner.
- NO indigo/blue on new cards — used red-600 (emergency), teal-600 (timeline), emerald-600 (cultural), slate-600 (ai-tools).
- NO emojis anywhere.

## Validation
- `npx tsc --noEmit` → exit 0 (no type errors).
- `bun run lint` blocked by pre-existing repo issue (eslint.config.js imports missing `typescript-eslint` package — same as noted by previous agents).
- Vite dev server returned HTTP 200 for all six new modules; compiled output contains no transform/parse errors.
- Backend AI endpoints confirmed returning HTTP 503 `{error:"AI service is not configured"}` when GEMINI_API_KEY is unset — my services map that to "AI service is not configured. Set GEMINI_API_KEY on the backend."
- All three new routes (/ailab/emergency-bridge, /ailab/medical-timeline, /ailab/cultural-advisor) return HTTP 200 from the dev server.

## Notable Decisions
- Patient record auto-load uses `dbHelpers.find(collections.patients, { user_id: userId })` to locate the patient record, then parallel-fetches encounters, conditions, medication_requests + medication_dispenses (merged), lab_results, imaging_orders filtered by patient_id. Each fetch has its own `.catch(() => [])` so a single failed collection doesn't break the whole timeline.
- The medical-timeline endpoint requires a session (401 if not signed in) per the backend route; emergency-plan and cultural-guidance are public.
- Timeline events are sorted oldest-first by parsed Date when available; undated events fall to the end.
- Each page surfaces an amber Safety Disclaimer card at the bottom in addition to task-specific banners.
