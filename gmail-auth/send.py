#!/usr/bin/env python3
"""Send test email via Gmail API. Usage: python3 send.py [to] [subject] [body]"""

import os, sys, pickle, json, base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

DIR = os.path.dirname(os.path.abspath(__file__))

def send(to, subject, body_html):
    # Load and refresh token
    with open(os.path.join(DIR, 'token.pickle'), 'rb') as f:
        creds = pickle.load(f)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(os.path.join(DIR, 'token.pickle'), 'wb') as f:
            pickle.dump(creds, f)
        print("[TOKEN] Refreshed and saved")

    service = build('gmail', 'v1', credentials=creds)

    msg = MIMEMultipart()
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body_html, 'html', 'utf-8'))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    response = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    print(f"[SENT] to {to} — ID: {response.get('id')}")
    return response

if __name__ == '__main__':
    to = sys.argv[1] if len(sys.argv) > 1 else 'alshamicourses@gmail.com'
    subject = sys.argv[2] if len(sys.argv) > 2 else 'Test from mail-platform'
    body = sys.argv[3] if len(sys.argv) > 3 else '<p>Hi,</p><p>This is a test email from the mail-platform.</p>'
    send(to, subject, body)
