# Deploying aisopach.com

Two routes. Pick one; don't run both at the same domain.

- **A — GitHub Pages.** Free, no AWS account touched, live in about ten minutes. Right for a static
  marketing page. The workflow in this repo does it on every push to `main`.
- **B — S3 + CloudFront.** Keeps the site on AWS beside the Fifth Meridian platform, gives you WAF, logs
  and a shared certificate. More moving parts.

`aisopach.com` is registered at GoDaddy but its nameservers already point at **Route 53** (hosted zone
`Z023984237SGPGMB18XV6`, account `421974099016`). All DNS changes below go through Route 53, not the GoDaddy
DNS panel. Ready-made change batches live in `docs/dns/`.

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

### 3. DNS in Route 53

One command — the change batch has GitHub Pages' four A records, four AAAA records, and `www` →
`ryansourcerockepcom.github.io`:

```bash
aws route53 change-resource-record-sets --hosted-zone-id Z023984237SGPGMB18XV6 --change-batch file://docs/dns/pages-aisopach.json
```

Then in **Settings → Pages → Custom domain**, enter `aisopach.com` and save. Once the check passes, tick
**Enforce HTTPS** — the certificate is issued automatically and takes a few minutes.

DNS propagation is usually minutes. `nslookup aisopach.com` tells you when it has landed. (If GitHub ever
changes its Pages addresses, its own docs are the source of truth.)

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

### 4. DNS in Route 53

The zone is already in Route 53, so this is just an **A / ALIAS** record for the apex pointing at the
distribution, and the same for `www`.

### 5. Redeploying

```bash
aws s3 sync . s3://aisopach-site --exclude ".git/*" --exclude ".github/*" --delete
aws cloudfront create-invalidation --distribution-id EXXXXXXXX --paths "/*"
```

Worth turning into a workflow once the bucket and distribution exist — the same OIDC role pattern as the
Fifth Meridian platform's `deploy.yml`.

---

## Mail for access@aisopach.com

Inbound mail is handled on AWS and forwarded to `ryan@sourcerockep.com`. It is built and active; the only
thing it needs is DNS (see `infra/mail-forwarder/README.md`):

```bash
aws route53 change-resource-record-sets --hosted-zone-id Z023984237SGPGMB18XV6 --change-batch file://docs/dns/ses-aisopach.json
aws route53 change-resource-record-sets --hosted-zone-id Z08917152NOBYQ3TN99L --change-batch file://docs/dns/ses-sourcerockep.json
```

The first adds MX, SPF, DMARC and DKIM for `aisopach.com`. The second adds DKIM for `sourcerockep.com` so
SES (still in sandbox) is allowed to send to it.

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
