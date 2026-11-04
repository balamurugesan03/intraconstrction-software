# Deploying to https://www.intrainteriors.co/cms

The app runs as **one Node process** (API + built React app) on port **5055**, served under the `/cms` sub-path
(`BASE_PATH=/cms` in `server/.env`, `VITE_BASE_PATH=/cms/` in `client/.env.production`).
Nginx proxies `https://www.intrainteriors.co/cms/` to it.

| Item | Value |
|---|---|
| Repo | https://github.com/balamurugesan03/intraconstrction-software |
| Folder on server | `/var/www/intrainteriors-cms` |
| PM2 app name | `intrainteriors-cms` |
| Port | `5055` |
| Database | `intrainteriors` |

These are deliberately different from any other app on the same server (e.g. unixova.com) so the two never clash.

## 1. Server prerequisites (Ubuntu VPS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs git
sudo npm i -g pm2
```
MongoDB: install MongoDB 7/8 on the server, or use a **MongoDB Atlas** connection string.

DNS: `intrainteriors.co` and `www.intrainteriors.co` A-records must point to this server's IP.

## 2. First deploy

```bash
cd /var/www
git clone https://github.com/balamurugesan03/intraconstrction-software.git intrainteriors-cms && cd intrainteriors-cms

cp deploy/.env.production.example server/.env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # paste as JWT_SECRET
nano server/.env                                                             # set JWT_SECRET, MONGO_URI

npm --prefix server ci --omit=dev
npm --prefix client ci && npm --prefix client run build

pm2 start ecosystem.config.cjs && pm2 save && pm2 startup     # auto-start on reboot
curl http://127.0.0.1:5055/cms/api/health                     # -> {"ok":true,"db":true}
```

The first Super Admin must exist in the database. If you copied an old database that has demo data, clear it
(keeps Super Admin logins only, then change that password in the app):
```bash
cd server && NODE_ENV=production node src/reset.js --force
```

## 3. Nginx

```bash
sudo cp deploy/nginx-intrainteriors-cms.conf /etc/nginx/sites-available/intrainteriors.co
sudo ln -s /etc/nginx/sites-available/intrainteriors.co /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d intrainteriors.co -d www.intrainteriors.co           # HTTPS
```
If an `intrainteriors.co` server block already exists, paste only the two `location` blocks into it.

Open **https://www.intrainteriors.co/cms/**

## 4. Updates

```bash
cd /var/www/intrainteriors-cms && bash deploy/deploy.sh
```

## Troubleshooting: /cms opens unixova.com (or another site)

- `grep -rn "intrainteriors" /etc/nginx/sites-enabled/` — no match means nginx has no block for this domain
  and is answering with its default site. Do step 3.
- `pm2 ls` — make sure `intrainteriors-cms` is online and not sharing a port with the other app
  (`sudo ss -ltnp | grep 5055` should show only this app).
- After fixing, clear the browser cache / unregister the old service worker (DevTools → Application → Service workers),
  because the installed PWA can keep showing the old site.

## Production checklist
- [ ] Strong `JWT_SECRET` (server refuses to start in production with the placeholder)
- [ ] Change the Super Admin password; create real users in **Users & Roles**
- [ ] Set company name / GSTIN / bank details in **Settings** (printed on quotations & invoices)
- [ ] Back up MongoDB (`mongodump`) and the `server/uploads/` folder regularly
- [ ] MongoDB not exposed to the internet (bind 127.0.0.1 or use Atlas IP allow-list)
