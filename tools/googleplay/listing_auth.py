"""Google Play sign-in shared by the upload script (service account from
GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS)."""
import json, os, sys, time
import jwt, requests

PKG = "com.accessible.backrooms"
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"
UPLOAD = f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PKG}"


def _token():
    raw = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS", "")
    sa = json.loads(open(raw).read() if os.path.isfile(raw) else raw)
    now = int(time.time())
    a = jwt.encode({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher",
                    "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3000}, sa["private_key"], algorithm="RS256")
    r = requests.post("https://oauth2.googleapis.com/token", data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": a}, timeout=60)
    r.raise_for_status()
    return r.json()["access_token"]


H = {"Authorization": "Bearer " + _token()}


def call(method, url, **kw):
    r = requests.request(method, url, headers={**H, **kw.pop("headers", {})}, timeout=600, **kw)
    if r.status_code >= 300:
        sys.exit(f"{method} {url.split(PKG)[-1]} -> {r.status_code}: {r.text[:800]}")
    return r.json() if r.content else {}
