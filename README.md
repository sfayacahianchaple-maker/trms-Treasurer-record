# TRMS

TRMS is a membership and payment tracking system for zone treasurers and the head treasurer.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase Authentication
- PostgreSQL Database
- Row Level Security (RLS)
- jsPDF

## Project structure

- `index.html`: landing page
- `login.html`: login screen
- `admin-dashboard.html`: admin dashboard
- `treasurer-dashboard.html`: zone treasurer dashboard
- `zones.html`, `members.html`, `treasurers.html`, `monthly-due.html`, `additional-fees.html`, `reports.html`: admin workflows
- `backup-export.html`: admin-only annual and complete Excel backups
- `announcements.html`, `treasurer-announcements.html`: admin announcements and zone-treasurer announcements
- `zone-members.html`: payment and member table view for a zone
- `css/style.css`: shared styling
- `js/*.js`: app logic and page behaviors
- `supabase/schema.sql`: database + RLS setup

## Backups

The Head Treasurer can open **Backup & Export** from the Admin Dashboard to download an annual or complete `.xlsx` workbook. Exports use the signed-in Supabase session and the database's existing RLS policies, page through all matching rows, and do not change database records. Complete backups include a separate Wedding Fee Records worksheet because that table is part of the current TRMS schema. Keep downloaded files in a secure location because they contain personal and financial information.

## Setup

1. Create a Supabase project.
2. Copy your real project URL and anon key to `js/config.js`.
3. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
4. Run `supabase/announcements.sql` in the Supabase SQL editor to create the announcements table and role-based policies.
5. Open `login.html` in a browser or serve the folder with a static server.
6. Do not use the demo seed data or testing credentials. Use only your real Supabase users and profiles.

Example:

```bash
python -m http.server 8000
```

Then open:

- http://localhost:8000/login.html

## Notes

This project is structured as a front-end-ready prototype. The page scripts are ready to connect to Supabase with the `supabase-js` client and secure policies defined in the database schema.
