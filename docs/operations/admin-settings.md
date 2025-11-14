# Admin Settings Playbook

The super admin console at `/dashboard/admin/settings` centralizes the global toggles introduced in Phase 4. Use this guide to update timelines, broadcast announcements, and manage security defaults without touching code.

## Access & Permissions
- Only `super_admin` accounts can view or update the page (staff will receive a redirect).
- Changes persist immediately and are reflected across dashboards after the next request.

## Configuration Areas

### Event Schedule
- **Start / End Dates** (date inputs) define the official Career City window.
- When both dates are set, visitors see a top-of-site badge summarizing the range.
- End date must be the same day or after the start date.

### Announcement Banner
- Toggle the **Enable banner** checkbox to broadcast a site-wide callout.
- Provide at least a title or message; both fields support rich, multi-line content (automatically trimmed to length limits).
- Users can dismiss the banner per session; updating the message re-displays it automatically.

### Export Defaults
- Pick the default visit scope (`All` vs. `Flagged`) and format (CSV today, PDF coming soon).
- Corporate dashboards adopt the scope on load and visually emphasize the preferred export action.

### Security & Sessions
- **Session timeout (minutes)** controls in-app warning timing and the corporate session heartbeat.
- **JWT lifetime (hours)** sets both the signed token expiry and authentication cookie duration.
- Reducing these values will force re-authentication sooner; increasing them relaxes session turnover.

## Operational Tips
- Stagger banner updates during low-traffic moments to avoid confusing attendees.
- After adjusting security values, remind staff to refresh their browsers to pick up new cookies.
- Record configuration changes (who/what/when) using the `Last update` panel for audit readiness.
