# Neo Unified Frontend Migration Plan

## Goal

Publish one Neo frontend from `apps/jornada` while preserving independent
modules for Jornada, Focall and QuickForms.

## Non-goals

- no backend, database or domain-event redesign
- no change to application-grant security
- no technical-code rename from `HELP_HUB` to `FOCALL`
- no removal of external redirect entries from the Hub catalog

## Target shape

```text
apps/jornada/src/
  modules/
    jornada/
    focall/
    quick-forms/
  router/
  shell/
  features/auth/
packages/frontend-core/
  auth/
  api/
  theme/
  ui/
apps/api/
```

`modules/<name>` owns views, module-local components, API client, navigation,
route registration and tests. `shell`, `auth`, design tokens and generic UI
remain shared infrastructure.

## Migration phases

### 1. Establish the module boundary

- [x] add a versioned native-module registry in `apps/jornada`
- [x] map `JORNADA`, `HELP_HUB` and `QUICK_FORMS` to stable routes and module navigation
- [x] make `/aplicativos` resolve native entries locally and use browser redirects only for catalog entries of type `REDIRECT`
- [x] remove internal SSO redirects and ticket consumption from the Jornada router

### 2. Move Focall

- [x] move the maintained Focall code into `apps/jornada/src/modules/focall`
- [x] retain route paths under `/atendimentos`
- [ ] expose the support workspace through a module port, rather than allowing the shell to import support code
- [x] change visible product copy to `Focall`

### 3. Move QuickForms

- [x] move maintained QuickForms code into `apps/jornada/src/modules/quick-forms`
- [x] retain `/formularios`, sources and builder paths
- [x] delete older duplicate form views in Jornada after the moved tests pass

### 4. Consolidate runtime and PWA

- [x] retain one Vite config, manifest, service worker, environment template and local start command in `apps/jornada`
- [x] make module routes lazy so Focall and QuickForms do not enter the initial worker route bundle
- remove obsolete SSO-only code after direct-route tests cover it

### 5. Retire migration references

- [x] run route, authorization, interaction and build tests in the unified app
- [x] smoke-test HTTP direct visits to `/inbox`, `/atendimentos`, `/formularios` and `/aplicativos`
- [x] remove legacy workspace scripts; remove `apps/help-hub` and `apps/quick-forms` only after the final authenticated visual smoke and after their active local servers are stopped

## Acceptance criteria

- one login, one shell, one frontend build and one PWA manifest
- no internal module-to-module page reload or SSO ticket
- the Hub has no module sidebar; each module has only its own navigation
- access grants continue to protect every native module route in the frontend and backend
- Focall and QuickForms remain lazily loaded and independently tested modules
- external redirect entries remain available to authorized users
- all existing direct routes keep working
