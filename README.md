# Invitations.live

This repository now contains two layers:

1. The new product-facing structure for `invitations.live`
2. The preserved legacy one-time invitation flow

## Routes

- `/` product homepage
- `/app/` host-facing product shell
- `/i/?code=...` guest-facing invite shell
- `/legacy/` old single-event invitation
- `/admin/` old admin dashboard for the legacy RSVP table

`404.html` also rewrites:

- `/i/<code>` to `/i/?code=<code>`
- `/event/<slug>` to `/app/?event=<slug>`

This keeps the site compatible with GitHub Pages while still letting the product use cleaner-looking share links.

## Supabase

Current files:

- `supabase/schema.sql` keeps the legacy one-off RSVP tables
- `supabase/product-schema.sql` adds the new product tables

Apply `supabase/product-schema.sql` in the Supabase SQL editor to enable the multi-event model:

- `profiles`
- `events`
- `event_settings`
- `guests`
- `responses`
- `event_assets`

## Product direction

The intended flow is:

1. A host signs into `/app/`
2. The host creates an event
3. The host adds guests
4. Each guest gets a unique invite code
5. The guest opens `/i/<code>`
6. The RSVP is stored in `responses`

## Migration note

The old dinner invitation is intentionally preserved at `/legacy/` so the root domain can now act as the public product homepage without losing the previous one-off build.
