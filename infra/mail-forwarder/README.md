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

## Getting out of the SES sandbox

Not needed for the forward (destination domain is verified). Request production access only if the site
ever sends mail to arbitrary addresses (e.g. an auto-reply to the access form).
