# DataPilot AI: frontend

React + TypeScript UI for DataPilot AI. Upload a data file, chat with DAI about it (replies stream in), and review, approve or reject the cleanups DAI proposes.

## Run

```sh
npm install
npm run local      # http://localhost:5173, uses the mock API (see .env.local)
```

No Node on the host? Run it through Docker:

```sh
docker run --rm -it -p 5173:5173 -v "$PWD":/app -w /app node:22-alpine sh -c "npm install && npm run local -- --host"
```

| Script | Purpose |
| --- | --- |
| `npm run local` | Local Vite server with hot reload and `/api` proxied to the backend |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest + Testing Library |

## Configuration

Local settings live in `.env.local`, which is git-ignored. Create it with `cp .env.example .env.local`. `DP_USE_MOCK=true` serves everything from an in-browser mock (`src/api/mock.ts`), so the UI works without a backend; it is only honoured by `npm run local`, never by a production build. For a real backend set `DP_USE_MOCK=false` and `PROXY_TARGET` (default `http://localhost:8080`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `DP_API_BASE_URL` | `/api` | Base URL the browser calls |
| `DP_USE_MOCK` | `false` | Use the in-browser mock API |
| `DP_MAX_FILE_SIZE_MB` | `50` | Client-side upload size limit |
| `PROXY_TARGET` | `http://localhost:8080` | Local proxy target for `/api` (server-side only) |

## Backend contract (assumed, adjust in `src/api`)

All paths are under `/api`.

| Call | Request | Response |
| --- | --- | --- |
| `POST /datasets` | multipart, field `file` | `Dataset` `{id, name, sizeBytes, rowCount?, columns?[{name, type?}]}` |
| `POST /datasets/{id}/chat` | JSON `{message, history[{role, content}]}` | `text/event-stream`, one JSON event per `data:` line |
| `POST /datasets/{id}/cleanups/{proposalId}/approve` | JSON `{operationIds}` | `{status: "applied", message?, rowsChanged?}` |
| `POST /datasets/{id}/cleanups/{proposalId}/reject` | `{}` | `{status: "rejected", message?}` |

Chat stream events:

```json
{"type":"token","text":"partial text"}
{"type":"cleanup_proposal","proposal":{"id":"...","title":"...","summary":"...","operations":[{"id":"...","kind":"...","column":"...","description":"...","affectedRows":12}],"preview":{"columns":["a"],"before":[{"a":" x "}],"after":[{"a":"x"}]}}}
{"type":"error","message":"..."}
{"type":"done"}
```

Every response is validated with zod (`src/api/schemas.ts`); anything off-contract surfaces as a generic error.

## Layout

- `src/lib/http`: generic, app-agnostic HTTP layer (errors, validated JSON requests, upload with progress, SSE streaming). It imports nothing from `src/api`, so it can be lifted into a shared package unchanged.
- `src/api`: DataPilot-specific calls on top of it (endpoints, schemas, chat, datasets, cleanups, mock backend)
- `src/features/datasets`: upload and dataset summary
- `src/features/chat`: streaming chat (`useChat`, reducer, message list, composer)
- `src/features/cleanup`: proposal card with per-operation selection and before/after preview

## Notes

- Authentication is not implemented. Add it (preferably `HttpOnly` session cookies) before exposing this beyond local use.
- Client-side upload checks are for friendly errors only; the backend must enforce type and size limits.
- Model output is rendered as Markdown without raw HTML. Keep it that way.
