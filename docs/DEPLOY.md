# Deploying aisopach.com

Two routes. Pick one; don't run both at the same domain.

- **A — GitHub Pages.** Free, no AWS account touched, live in about ten minutes. Right for a static
  marketing page. The workflow in this repo does it on every push to `main`.
- **B — S3 + CloudFront.** Keeps the site on AWS beside the Fifth Meridian platform, gives you WAF, logs
  and a shared certificate. More moving parts.

Both assume `aisopach.com` is registered at GoDaddy, like `fifthmeridian.ai`.

---

## A — GitHub Pages

### 1. Turn Pages on

Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Nothing else on that
screen.

### 2. Push

```bash
git push -u origin main
```

`.github/workflows/pages.yml` uploads the repository as-is and deploys it. Watch it under **Actions**. The
first run gives you a `https://<user>.github.io/aisopach/` URL — the `CNAME` file switches that to the
custom domain once DNS is in place.

### 3. DNS at GoDaddy

In GoDaddy → **My Products → aisopach.com → DNS → Manage zones**, set:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |
| CNAME | `www` | `<your-github-user>.github.io` | 600 |

(Those four A records are GitHub's published Pages addresses. If GitHub changes them, its own docs are the
source of truth.)

Then back in **Settings → Pages → Custom domain**, enter `aisopach.com` and save. Once the check passes,
tick **Enforce HTTPS** — the certificate is issued automatically and takes a few minutes.

DNS propagation is usually minutes, occasionally an hour. `nslookup aisopach.com` tells you when it has
landed.

### 4. Verify

- `https://aisopach.com` and `https://www.aisopach.com` both load
- the padlock is present
- the access form opens a mail draft (or posts to your endpoint — README, step 2)

---

## B — S3 + CloudFront

### 1. Bucket

```bash
aws s3 mb s3://aisopach-site --region us-east-1
aws s3 sync . s3://aisopach-site \
  --exclude ".git/*" --exclude ".github/*" --exclude "docs/*" --exclude "README.md" --exclude "CNAME" \
  --cache-control "public,max-age=300"
```

Leave **Block all public access** ON. CloudFront reaches the bucket through an Origin Access Control, not
public reads.

### 2. Certificate

ACM, **us-east-1** (CloudFront only reads certificates from that region):

```bash
aws acm request-certificate --domain-name aisopach.com \
  --subject-alternative-names www.aisopach.com \
  --validation-method DNS --region us-east-1
```

Add the CNAME validation records it returns to the GoDaddy zone. Validation completes within minutes of the
records resolving.

### 3. Distribution

Create a CloudFront distribution with:

- **Origin:** the S3 bucket, with **Origin access control** (S3 type) — let the console update the bucket
  policy for you
- **Viewer protocol policy:** Redirect HTTP to HTTPS
- **Default root object:** `index.html`
- **Alternate domain names:** `aisopach.com`, `www.aisopach.com`
- **Custom SSL certificate:** the one from step 2
- **Compress objects automatically:** yes

### 4. DNS at GoDaddy

GoDaddy cannot point an apex record at a CloudFront hostname — the same limitation `fifthmeridian.ai` hits.
Two ways out:

**Option 1 — move DNS to Route 53 (recommended).** Create a hosted zone for `aisopach.com`, copy the
existing records into it, then change the nameservers at GoDaddy to the four Route 53 gave you. You can then
add an **A / ALIAS** record for the apex pointing at the distribution, and the same for `www`. Propagation
takes up to 48 hours, usually far less.

**Option 2 — stay at GoDaddy.** `CNAME www → dxxxxx.cloudfront.net`, then use GoDaddy's **Forwarding** to
301 the apex to `https://www.aisopach.com`. Works, but the apex is a redirect rather than the real site.

### 5. Redeploying

```bash
aws s3 sync . s3://aisopach-site --exclude ".git/*" --exclude ".github/*" --delete
aws cloudfront create-invalidation --distribution-id EXXXXXXXX --paths "/*"
```

Worth turning into a workflow once the bucket and distribution exist — the same OIDC role pattern as the
Fifth Meridian platform's `deploy.yml`.

---

## The access form endpoint

The page ships with no backend. Options, cheapest first:

1. **Mail fallback (default).** No setup. Opens the visitor's mail client with the fields prefilled. Fine
   for launch, loses anyone without a configured mail client.
2. **Hosted form endpoint** (Formspree, Basin, Getform). Set `window.AISOPACH_ACCESS_ENDPOINT` to the URL
   they give you. Five minutes, handles spam, emails you each submission.
3. **API Gateway + Lambda → SES + DynamoDB.** A dozen lines of Lambda: validate, write the row, send the
   notification. Right answer once the list matters, and it keeps the leads inside your own account.
4. **A route on the Fifth Meridian platform.** It already has the database, SES and admin UI — an
   `/api/access-request` endpoint there would put engine leads and investor records in one place. Needs CORS
   for `https://aisopach.com`.

Whatever you choose, remember the page promises a reply in 48 hours.
