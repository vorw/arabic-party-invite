# Arabic Invitation Site

Simple Arabic RSVP page for a dinner invitation.

## Frontend setup

Update the values at the top of `app.js`:

- `title`
- `welcome`
- `note`
- `eventLabel`
- `submitEndpoint`

Set `submitEndpoint` to your deployed Google Apps Script web app URL.

## Google Sheets setup

1. Create a Google Sheet.
2. Open `Extensions > Apps Script`.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Deploy as `Web app`.
5. Set access to `Anyone`.
6. Copy the web app URL into `submitEndpoint` in `app.js`.

Responses will be added to a sheet named `RSVP`.
