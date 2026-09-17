"""Forwards mail received by SES for aisopach.com to a real mailbox.

SES stores the raw message in S3, then invokes this. We re-send it with a
verified From (so DKIM/DMARC pass) and the original sender in Reply-To, so
replying from the destination inbox goes back to the person who wrote in.
"""
import email
import os
import re

import boto3

BUCKET = os.environ["MAIL_BUCKET"]
PREFIX = os.environ.get("MAIL_PREFIX", "")
FORWARD_TO = os.environ["FORWARD_TO"]
FROM = os.environ["FORWARD_FROM"]  # must be a verified SES identity

s3 = boto3.client("s3")
ses = boto3.client("ses")


def handler(event, _ctx):
    for rec in event["Records"]:
        mail = rec["ses"]["mail"]
        key = PREFIX + mail["messageId"]
        raw = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
        msg = email.message_from_bytes(raw)

        original_from = msg.get("From", "")
        original_to = ", ".join(mail.get("destination", []))

        # Strip headers that would fail auth or confuse SES on re-send.
        for h in ("DKIM-Signature", "Return-Path", "Sender", "Message-ID",
                  "Reply-To", "From", "To", "Cc", "Bcc"):
            del msg[h]

        display = re.sub(r"[<>\r\n]", "", original_from).strip() or "unknown sender"
        msg["From"] = f"{display} via aisopach.com <{FROM}>"
        msg["Reply-To"] = original_from
        msg["To"] = FORWARD_TO
        msg["X-Forwarded-For-Original-To"] = original_to

        ses.send_raw_email(
            Source=FROM,
            Destinations=[FORWARD_TO],
            RawMessage={"Data": msg.as_bytes()},
        )
    return {"disposition": "CONTINUE"}
