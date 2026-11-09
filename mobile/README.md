# Intra Interiors — Mobile App (React Native / Expo)

Android & iOS app for the Intra Interiors ERP. It talks to the same server as the web app
(`https://www.intrainteriors.co/cms/api`) and uses the same logins, roles and permissions.

## What's in it

| Area | Screens |
| --- | --- |
| Home | Role-aware dashboard (projects, money, overdue / upcoming tasks, latest site reports) + quick actions |
| Projects | Project list → project hub (KPIs, status change, tasks, site reports, material requests, site stock, labour, work orders, measurements, bills, payments, expenses, interior rooms, documents, service tickets) |
| Sales & CRM | Leads, follow-ups, clients, site visits, BOQ, quotations (send / approve / reject / new version / convert to project), business flow |
| Site work | Daily site reports with camera photos, tasks (start / progress / done), interior design approvals, documents & photos, service tickets |
| Materials | Stock summary & low-stock alerts, stock movements, material requests (approve → PO), purchase orders (approve, GRN, purchase invoice), RFQ (award), vendors, material master |
| Workforce | Daily muster (P / H / A + OT) per site, attendance register, workers, subcontractors, work orders, measurement book (verify → bill) |
| Finance | Bills & invoices (record payment / receipt), payments, expenses with receipt photo |
| HR | My HR (leave balance, payslips), employees, staff attendance, leave (apply / approve / reject / cancel), payroll (approve / pay), salary advances |
| Other | Reports (13 reports), notifications with deep links, users & roles, company settings, profile & password |

Every module only appears for roles that have access (same `access` map the web uses).

## Structure

```
src/app/            screens (Expo Router — every file is a route)
  (tabs)/           Home · Projects · Alerts · Modules · Profile
  r/[key]/          generic list / detail / form for every module
src/config/resources.js   module definitions (fields, filters, list cards, workflow actions)
src/components/     UI kit, form engine (pickers, dates, camera upload, line items), list
src/lib/            API client, auth, formatting, web-path → mobile-route mapping
```

To change a form or add a field, edit `src/config/resources.js` (it mirrors `client/src/config/resources.jsx`).

## Run it on your phone (development)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (Android) or the Camera app (iPhone).

To point the app at a different server (e.g. your local API), change `expo.extra.apiUrl` in `app.json`,
e.g. `http://192.168.1.10:5000/api` (use your PC's LAN IP, not `localhost`).

## Build an installable app

Builds run on Expo's cloud (no Android Studio / Xcode needed). One-time setup:

```bash
npm install -g eas-cli      # or use: npx eas-cli@latest …
eas login
eas init                    # links the project to your Expo account
```

- **Android APK** to share / install directly: `eas build -p android --profile preview`
- **Play Store** (AAB): `eas build -p android --profile production` then `eas submit -p android`
- **App Store**: `eas build -p ios --profile production` then `eas submit -p ios` (needs an Apple Developer account)

App ids: Android `co.intrainteriors.erp`, iOS `co.intrainteriors.erp` (change in `app.json` before the first store upload if you want different ones).

## Notes

- The login is kept on the phone in secure storage until the user logs out (the web app asks again each browser session).
- Photos are uploaded to the same `/uploads` endpoint as the web app (max 20 MB per file).
- Printing / PDF of quotations, invoices and POs, CSV export and payroll bonus adjustments stay on the web app.
