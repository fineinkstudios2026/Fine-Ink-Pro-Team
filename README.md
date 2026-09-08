# Fine Ink Studios Pro Team CMS

This package turns the Pro Team concept into a real editable website with a login-protected backend.

## Included

- Responsive desktop/mobile front-end
- Luxury Fine Ink Pro Team styling
- Admin dashboard at `/admin`
- Artist create/edit/delete
- Individual artist pages at `/artists/:slug`
- Profile image + hero image upload
- Artist portfolio upload/delete
- Featured portfolio images on the homepage
- Editable artist bios, specialties, location, pricing note, awards, conventions, Instagram, SEO title and description
- Editable homepage hero copy
- External form embed URL for your FIcomm-connected form
- Password change screen
- Owner-only user management for adding future admin users
- SQLite database
- Bcrypt password hashing
- Login rate limiting and session-based authentication

## First login

Username: `Rickyjr@fineinkstudios.com`

Password: `Welcome@123`

The first account is created as the **owner** account. Change the password from **Admin → Account** before putting the admin panel on a public domain.

## Run locally

Install Node.js 20+.

```bash
npm install
npm start
```

Then open:

- Website: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Add your external FIcomm form

1. Log in to `/admin`.
2. Open **Site Settings**.
3. Paste the public form URL into **External Form Embed URL**.
4. Save.

That form appears on the homepage and every individual artist page.

## Recommended hosting

This is no longer a static HTML-only site because it has login, a database and image uploads. Use a Node host with persistent storage, such as Render, Railway, Fly.io, DigitalOcean, or a VPS.

Persist both:

- `/data` — SQLite database and sessions
- `/public/uploads` — artist and portfolio images

A clean custom-domain setup would be:

`proteam.fineinkstudios.com`

## Production checklist

1. Change the initial admin password.
2. Replace `SESSION_SECRET` with a long random secret.
3. Set `NODE_ENV=production`.
4. Enable HTTPS.
5. Configure persistent storage for `/data` and `/public/uploads`.
6. Add your external FIcomm-connected form URL.
7. Replace sample artist entries with the real Pro Team roster.
8. Upload profile, hero and portfolio images.
9. Fill out SEO fields for every artist.
10. Configure backups for the database and uploads.

## Font note

The stylesheet includes `Festigan` as the first choice for the script accent, but the font file itself is not bundled. If you use Festigan commercially, host your properly licensed copy separately and add its `@font-face` declaration. Otherwise the site falls back to Bodoni Moda.


## Branding update

The public header now uses the supplied Fine Ink Studios stacked logo image instead of the text-based `FINE INK` wordmark.

The supplied `Festigan.otf` font is bundled locally and is used for the secondary/script typography, including the `PRO TEAM` header accent and script-style text throughout the public site.

## Full Website Editor

Admin → **Website Editor** now lets you edit the public site's global, homepage, artists-page, and artist-detail text blocks. For each block you can edit the wording, font, font size, weight, style, letter case, and alignment. The editor only exposes the four fonts bundled/used by the website: Anton, Bodoni Moda, Inter, and Festigan. A desktop/mobile preview is included beside the controls.

Artist-specific names, biographies, specialties, locations, social links, SEO, profile/hero images, and portfolio images remain editable under **Artists**.

## Easier Mac installation

This revision removes `better-sqlite3` and `connect-sqlite3`. On Node 24 it uses Node's built-in SQLite module plus a file-backed session store, so `npm install` no longer needs Python/node-gyp for the database.


## Restored homepage sections

The homepage now includes the previously discussed:
- Section 5 — Process: five editable steps.
- Section 6 — Testimonial: editable eyebrow, quote, name, and project detail.
- Section 8 — FAQ: five editable question-and-answer items.

All text and typography controls appear automatically inside Admin → Website Editor.

## macOS SQLite startup fix

This package explicitly creates the local `data/` directory before Node opens the SQLite database. This fixes the `ERR_SQLITE_ERROR: unable to open database file` error that can occur after unzipping on macOS when an empty data folder was omitted from the ZIP archive.


## Artist carousel update

The homepage artist roster and the full Artists page are now horizontal carousels. Adding more artists in the CMS adds them to the carousel instead of creating new rows.

Desktop and tablet use left/right arrow controls. On mobile the controls are hidden and visitors swipe or drag the carousel naturally left and right. CSS scroll snapping keeps cards aligned.


## Artist save fix

Fixed Node's built-in SQLite named-parameter binding so artist profile edits save correctly. The previous compatibility wrapper generated `@`, `:` and `$` variants for each field; `node:sqlite` rejects unused named variants. The wrapper now passes only the actual object keys and lets SQLite bind them to the statement's named parameters.


## Render proxy/login fix

This version sets Express `trust proxy` to `1` before sessions and rate limiting are initialized. Render terminates HTTPS and forwards requests to the Node service through a proxy, so this setting allows Express and `express-rate-limit` to correctly interpret `X-Forwarded-For` and secure request information. This resolves `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on the admin login route.
