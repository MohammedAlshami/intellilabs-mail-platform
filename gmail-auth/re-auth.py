#!/usr/bin/env python3
"""Re-authenticate Gmail with read scope.

  python3 re-auth.py              # prints URL
  python3 re-auth.py <CODE>       # exchanges code (run in same dir)
"""
import sys, os, pickle, json
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
]

DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(DIR, '.auth_state.json')
CREDS_FILE = os.path.join(DIR, 'credentials.json')
TOKEN_FILE = os.path.join(DIR, 'token.pickle')

code = sys.argv[1] if len(sys.argv) > 1 else None

if not code:
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES,
        redirect_uri='urn:ietf:wg:oauth:2.0:oob')
    auth_url, _ = flow.authorization_url(prompt='consent')
    # Save flow state (includes PKCE verifier)
    with open(STATE_FILE, 'w') as f:
        json.dump({'code_verifier': flow.code_verifier}, f)
    print("=" * 70)
    print("VISIT THIS URL IN YOUR BROWSER:")
    print("=" * 70)
    print(auth_url)
    print("=" * 70)
    print()
    print("After authorizing, copy the code and run:")
    print(f"  python3 {sys.argv[0]} <PASTE_CODE_HERE>")
else:
    # Restore flow state from the saved verifier
    with open(STATE_FILE) as f:
        state = json.load(f)
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES,
        redirect_uri='urn:ietf:wg:oauth:2.0:oob')
    flow.code_verifier = state['code_verifier']
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(TOKEN_FILE, 'wb') as f:
        pickle.dump(creds, f)
    os.remove(STATE_FILE)
    print(f"✅ Token saved!")
    print(f"   Scopes: {creds.scopes}")
    print(f"   Expires: {creds.expiry}")
