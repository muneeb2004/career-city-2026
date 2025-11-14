# Release Regression Checklist

Run this suite before every release or significant settings change to guard against regressions introduced in Phase 4.

## 1. Authentication & Security
- ✅ Verify login/signup still succeed and cookies expire according to `JWT lifetime`.
- ✅ Confirm session timeout warnings appear at the configured offset and force logout at expiry.
- ✅ Attempt to access `/dashboard/admin/settings` as a staff user (should redirect) and as a super admin (should load).
- ✅ Re-run Supabase Row Level Security smoke tests for `admin_settings`, `student_visits`, and `corporate_clients`.

## 2. Global Announcement Banner
- ✅ Enable the banner and ensure it renders on landing, welcome, staff, and corporate dashboards.
- ✅ Dismiss the banner; reload to confirm per-session persistence, then update the banner copy and confirm it reappears.
- ✅ Toggle the banner off and confirm only the condensed event badge remains (when event dates exist).

## 3. Event & Export Defaults
- ✅ Adjust event start/end dates and verify the badge text updates instantly.
- ✅ Set export scope to `Flagged`, reload a corporate dashboard, and confirm the filter + highlighted button match.
- ✅ Revert export scope to `All` and ensure pagination + CSV exports include unflagged visits.

## 4. Responsive & Performance
- ✅ Test landing/welcome pages on at least one low-end device or simulator with `prefers-reduced-motion` enabled.
- ✅ Inspect primary dashboards at breakpoints (320px, 768px, 1024px) for layout stability.
- ✅ Run `npm run lint` and a manual Lighthouse pass (performance + accessibility) on the marketing screens.

## 5. Documentation
- ✅ Update changelog or release notes with modified settings and operational considerations.
- ✅ Notify stakeholders of banner or schedule updates before publishing.
