# access@aisopach.com → ryan@sourcerockep.com

Everything at `*@aisopach.com` lands in an S3 bucket and is forwarded by a Lambda. All in `us-east-1`,
account `421974099016`.

| Piece | Name |
|---|---|
| SES receipt rule set (active) | `aisopach-inbound`, rule `forward-all`, recipients `aisopach.com` |
| S3 bucket (raw mail, 90-day expiry) | `aisopach-mail`, prefix `inbound/` |
| Lambda | `aisopach-mail-forwarder` — `forwarder.py`, Python 3.12 |
| IAM role | `aisopach-mail-forwarder` |
| SES identities | `aisopach.com` (send + receive), `sourcerockep.com` (so sandbox allows the forward) |

The forward goes out as `<original sender> via aisopach.com <access@aisopach.com>` with the original
sender in `Reply-To`, so replying from Gmail goes back to the person who wrote in and DKIM/DMARC pass.

## DNS

Both change batches are in `docs/dns/`. Until they are applied, SES shows both identities as pending and
mail to `aisopach.com` bounces.

## Changing the destination or redeploying the code

```bash
aws lambda update-function-configuration --function-name aisopach-mail-forwarder --region us-east-1 \
  --environment "Variables={MAIL_BUCKET=aisopach-mail,MAIL_PREFIX=inbound/,FORWARD_TO=ryan@sourcerockep.com,FORWARD_FROM=access@aisopach.com}"

powershell -Command "Compress-Archive -Path forwarder.py -DestinationPath forwarder.zip -Force"
aws lambda update-function-code --function-name aisopach-mail-forwarder --region us-east-1 --zip-file fileb://forwarder.zip
```

## brightmarkmed.com (added 2026-10-11)

Same code, deployed as a second Lambda, replacing Google Workspace for that domain. Everything at
`*@brightmarkmed.com` → ryan@sourcerockep.com, sent as `<sender> via brightmarkmed.com <forward@brightmarkmed.com>`.

| Piece | Name |
|---|---|
| SES receipt rule | `brightmarkmed-forward-all` in the same active set `aisopach-inbound` (SES allows only one active set) |
| S3 | `aisopach-mail`, prefix `brightmarkmed/` (same 90-day expiry) |
| Lambda | `brightmarkmed-mail-forwarder`, env `MAIL_PREFIX=brightmarkmed/`, `FORWARD_FROM=forward@brightmarkmed.com`; reuses role `aisopach-mail-forwarder` |
| DNS (Route 53 zone `Z06872593MKLMQ1GB5I11`) | MX `10 inbound-smtp.us-east-1.amazonaws.com`, SPF `include:amazonses.com`, `_amazonses` TXT, 3 SES DKIM CNAMEs |

Google Workspace was cancelled 2026-10-11 and its DNS records (`google._domainkey`, `dc-aa8e722993._spfm`,
`google-site-verification`) were removed.

## messerworksllc.com (added 2026-10-11)

Identical setup, also replacing Google Workspace: rule `messerworks-forward-all`, S3 prefix `messerworks/`, Lambda
`messerworks-mail-forwarder` (`FORWARD_FROM=forward@messerworksllc.com`), Route 53 zone `Z00006981XBOSS9GPCB2T`.

## Getting out of the SES sandbox

Not needed for the forward (destination domain is verified). Request production access only if the site
ever sends mail to arbitrary addresses (e.g. an auto-reply to the access form).
