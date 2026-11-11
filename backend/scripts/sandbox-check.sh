#!/bin/bash
# Checks whether your Sandbox account can run DigiLocker — the same calls the app makes.
#   bash sandbox-check.sh                  test keys  (https://test-api.sandbox.co.in)
#   bash sandbox-check.sh <BASE_URL>       e.g. https://api.sandbox.co.in for Live keys
#   bash sandbox-check.sh [<BASE_URL>] --full   also walks one real consent flow in your browser and prints the
#                                              SHAPE of Sandbox's reply (field names only; every value is hidden)
# Nothing is saved: keys are typed in (the secret is hidden) and never written to a file or to shell history.
BASE="https://test-api.sandbox.co.in"; FULL=0
for a in "$@"; do case "$a" in --full) FULL=1 ;; http*) BASE="${a%/}" ;; esac; done

read -p "Sandbox API key: " KEY
read -s -p "Sandbox API secret (hidden): " SECRET; echo

pyget() { python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    for k in sys.argv[1].split('.'): d=d.get(k,'') if isinstance(d,dict) else ''
    print(d if d is not None else '')
except Exception: print('')" "$1"; }

AUTH=$(curl -s -X POST "$BASE/authenticate" -H "x-api-key: $KEY" -H "x-api-secret: $SECRET" -H "x-api-version: 1.0.0")
TOKEN=$(printf '%s' "$AUTH" | pyget access_token)
if [ -z "$TOKEN" ]; then
  echo "STEP 1 FAILED - could not authenticate against $BASE. Response:"
  printf '%s' "$AUTH" | head -c 300; echo
  echo "Check: test keys go with https://test-api.sandbox.co.in, live keys with https://api.sandbox.co.in."
  exit 1
fi
echo "STEP 1 OK - the keys are valid for $BASE"

BODY='{"@entity":"in.co.sandbox.kyc.digilocker.session.request","flow":"signin","doc_types":["aadhaar"],"redirect_url":"https://healthmirror.duckdns.org/api/digilocker/callback"}'
start_session() { curl -s -w "\n%{http_code}" -X POST "$BASE/kyc/digilocker/sessions/init" -H "authorization: $1" -H "x-api-key: $KEY" -H "Content-Type: application/json" -d "$BODY"; }

RESP=$(start_session "$TOKEN"); CODE=$(printf '%s' "$RESP" | tail -n1); JSON=$(printf '%s' "$RESP" | sed '$d')
echo "STEP 2 - start a DigiLocker session (token sent as-is, as Sandbox's docs require): HTTP $CODE"

if [ "$CODE" != "200" ]; then
  printf '%s' "$JSON" | head -c 400; echo
  CODE2=$(start_session "Bearer $TOKEN" | tail -n1)
  echo "CONTROL - the same call the OLD way, with a 'Bearer ' prefix: HTTP $CODE2"
  if [ "$CODE2" = "200" ]; then
    echo "RESULT: Sandbox accepted ONLY the Bearer form. That is unexpected - paste this output to Claude."
  else
    TX=$(printf '%s' "$JSON" | pyget transaction_id)
    echo "RESULT: refused both ways, so the token format is not the problem. Most likely the DigiLocker API is not enabled for"
    echo "        this account (or the keys and URL don't match). Ask Sandbox support to enable the KYC > DigiLocker API"
    echo "        for your trial account${TX:+, quoting transaction id $TX}."
  fi
  exit 2
fi

SID=$(printf '%s' "$JSON" | pyget data.session_id)
URL=$(printf '%s' "$JSON" | pyget data.authorization_url)
echo "RESULT: Sandbox accepted the request - DigiLocker is enabled on this account. (session $SID)"
[ "$FULL" = "1" ] || { echo "Run again with --full to walk through one real consent and capture the reply's shape."; exit 0; }

echo
echo "STEP 3 - open this link in your browser, log in to DigiLocker with YOUR OWN account and give consent:"
echo "$URL"
read -p "When you've finished (you'll land back on the HealthMirror site), press Enter here... " _

ST=$(curl -s "$BASE/kyc/digilocker/sessions/$SID/status" -H "authorization: $TOKEN" -H "x-api-key: $KEY" | pyget data.status)
echo "STEP 4 - session status: ${ST:-unknown}"
[ "$ST" = "succeeded" ] || { echo "Consent was not completed, so there is no document to inspect. Run again."; exit 3; }

DOC=$(curl -s -w "\n%{http_code}" "$BASE/kyc/digilocker/sessions/$SID/documents/aadhaar" -H "authorization: $TOKEN" -H "x-api-key: $KEY")
echo "STEP 5 - the Aadhaar document: HTTP $(printf '%s' "$DOC" | tail -n1). Its shape, with every value hidden:"
printf '%s' "$DOC" | sed '$d' | python3 -c '
import sys, json, re
raw = sys.stdin.read()
def mask(v):
    if isinstance(v, dict): return {k: mask(x) for k, x in v.items()}
    if isinstance(v, list): return ([mask(v[0]), "... (%d items)" % len(v)] if v else [])
    if isinstance(v, bool) or v is None: return v
    if isinstance(v, (int, float)): return "<number>"
    s = str(v)
    if re.fullmatch(r"[0-9]+", s): return "<digits:%d>" % len(s)
    if re.fullmatch(r"[Xx*]+[0-9]{2,4}", s): return "<masked id, %d chars, ends in digits>" % len(s)
    if s.startswith("http"): return "<url>"
    return "<text:%d chars>" % len(s)
try:
    print(json.dumps(mask(json.loads(raw)), indent=2))
except Exception:
    if raw.lstrip().startswith("<"): print("XML document; tags:", ", ".join(sorted(set(re.findall(r"<([A-Za-z0-9_:.-]+)", raw)))[:40]))
    else: print("not JSON or XML: %d bytes" % len(raw))
'
