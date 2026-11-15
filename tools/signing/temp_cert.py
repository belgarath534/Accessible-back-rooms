#!/usr/bin/env python3
"""Manual App Store signing for the GitHub iPhone build, when Apple's cloud
signing is not allowed for the API key.

  temp_cert.py create <workdir>   makes a fresh key and CSR, asks Apple for a
      distribution certificate, makes an App Store profile (with Game Center
      and iCloud) for it, imports both into a temporary keychain and installs
      the profile. Writes SIGN_PROFILE_NAME / SIGN_CERT_ID to $GITHUB_ENV.
  temp_cert.py cleanup            revokes that certificate and deletes the
      profile again (builds already uploaded are not affected).
Never prints a key."""
import base64, os, subprocess, sys, time
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gamecenter"))
import create  # noqa: E402
call = create.call
BUNDLE = "com.accessible.backrooms"
PROFILE = "Backrooms GitHub App Store"
PDIR = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")


def env(k, v):
    with open(os.environ["GITHUB_ENV"], "a") as f:
        f.write(f"{k}={v}\n")


def do_create(work):
    os.makedirs(work, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "GitHub build"),
                                    x509.NameAttribute(NameOID.COUNTRY_NAME, "US")]))
           .sign(key, hashes.SHA256()))
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode()
    try:
        cert = call("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
            "certificateType": "DISTRIBUTION", "csrContent": csr_pem}}})["data"]
    except Exception as e:
        sys.exit(f"Apple refused to make a distribution certificate with this key: {e}")
    cid = cert["id"]
    env("SIGN_CERT_ID", cid)
    print("Temporary distribution certificate made:", cid)
    der = base64.b64decode(cert["attributes"]["certificateContent"])

    # p12 for the keychain
    from cryptography.hazmat.primitives.serialization import pkcs12
    pw = base64.b16encode(os.urandom(12)).decode()
    p12 = pkcs12.serialize_key_and_certificates(b"gh", key, x509.load_der_x509_certificate(der), None,
                                                serialization.BestAvailableEncryption(pw.encode()))
    p12_path = os.path.join(work, "dist.p12")
    open(p12_path, "wb").write(p12)
    kc = os.path.join(work, "build.keychain-db")
    kpw = base64.b16encode(os.urandom(12)).decode()
    run = lambda *a: subprocess.run(list(a), check=True, capture_output=True)
    run("security", "create-keychain", "-p", kpw, kc)
    run("security", "set-keychain-settings", "-lut", "21600", kc)
    run("security", "unlock-keychain", "-p", kpw, kc)
    # older openssl-style p12 may be needed by security; cryptography's default works on macOS 15
    run("security", "import", p12_path, "-k", kc, "-P", pw, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
    run("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", kpw, kc)
    cur = subprocess.run(["security", "list-keychains", "-d", "user"], capture_output=True, text=True).stdout.split()
    run("security", "list-keychains", "-d", "user", "-s", kc, *[c.strip('"') for c in cur])
    os.remove(p12_path)
    print("Certificate is in the build keychain")

    bid = [b for b in call("GET", f"/bundleIds?filter[identifier]={BUNDLE}&limit=50")["data"]
           if b["attributes"]["identifier"] == BUNDLE][0]["id"]
    from urllib.parse import quote
    for old in call("GET", f"/profiles?filter[name]={quote(PROFILE)}&limit=50")["data"]:
        call("DELETE", f"/profiles/{old['id']}")
    prof = call("POST", "/profiles", {"data": {"type": "profiles", "attributes": {"name": PROFILE, "profileType": "IOS_APP_STORE"},
                                               "relationships": {"bundleId": create.rel("bundleIds", bid),
                                                                 "certificates": {"data": [{"type": "certificates", "id": cid}]}}}})["data"]
    os.makedirs(PDIR, exist_ok=True)
    open(os.path.join(PDIR, prof["attributes"]["uuid"] + ".mobileprovision"), "wb").write(
        base64.b64decode(prof["attributes"]["profileContent"]))
    env("SIGN_PROFILE_NAME", PROFILE)
    env("SIGN_KEYCHAIN", kc)
    print("App Store profile made and installed:", PROFILE)


def do_cleanup():
    cid = os.environ.get("SIGN_CERT_ID")
    from urllib.parse import quote
    for old in call("GET", f"/profiles?filter[name]={quote(PROFILE)}&limit=50")["data"]:
        try:
            call("DELETE", f"/profiles/{old['id']}")
        except Exception as e:
            print("could not delete profile:", e)
    if cid:
        try:
            call("DELETE", f"/certificates/{cid}")
            print("Temporary certificate revoked")
        except Exception as e:
            print("could not revoke certificate:", e)


if __name__ == "__main__":
    do_create(sys.argv[2]) if sys.argv[1] == "create" else do_cleanup()
