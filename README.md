# Team Profiles — ServiceNow-backed

A responsive team-profile page (accordions, search, rating-based sort, QR codes,
day/night theme) backed by a ServiceNow custom table.

## Deployment: GitHub Pages (direct to ServiceNow)

`index.html` calls the ServiceNow Table API directly from the browser using Basic
auth. This works because a `sys_cors_rule` allows the GitHub Pages origin.

Just commit `index.html` and enable GitHub Pages on the repo. Open:
`https://rajkolli725.github.io/<repo>/`

### ⚠️ Security note
Credentials are hardcoded in `index.html` and the page is **public** — anyone can
read the source and obtain them. Use a **dedicated, least-privilege, read-only**
ServiceNow account, and rotate the password if it has ever been broad. For anything
beyond a demo, use the proxy option below so credentials stay server-side.

## Required ServiceNow CORS rules

Both rules: domain = your Pages origin (`https://rajkolli725.github.io`), Active = true.

| Rule | REST API (`rest_api`) | Methods | Purpose |
|------|-----------------------|---------|---------|
| TeamProfile (exists) | `now/table` | GET | read records |
| **TeamProfile-Attachment (add this)** | `now/attachment` | GET | profile pictures + resumes |

To also allow Add / Edit / Delete from the page, enable on the `now/table` rule:
POST (add), PATCH (edit), DELETE (remove); and POST on the `now/attachment` rule
(uploading a new photo). Read-only needs only GET.

`Access-Control-Allow-Headers = *` is fine — ServiceNow reflects the requested
`Authorization` header, so no change is needed there.

## How it maps to ServiceNow

- Table: `x_palni_servicen_1_team_profiles`
- Field mapping is in `SN_FIELDS` in `index.html`.
- **Profile picture** and **resume** are stored as *attachments* on each record;
  the page fetches them (with auth) and renders/downloads them as blobs.
- **Rating** is computed in the browser from experience, certifications, trainings,
  implementations and skills — it is not stored in ServiceNow.

## Option B: local proxy (credentials stay server-side)

`team-profiles-proxy.js` is a zero-dependency Node server that holds the
credentials, serves the page, and proxies to ServiceNow. Use it instead of
hardcoding creds. Run `node team-profiles-proxy.js` and open http://localhost:3000.
(Switching back to the proxy means pointing the fetch calls at `/api/...` again.)
