#!/usr/bin/env bash
# Bootstrap Keycloak realm, client, and roles for AISPM.
# All vars are injected by compose.yml / Helm environment block — no .env file.
set -euo pipefail

KC_URL="${KEYCLOAK_URL:-http://localhost:8180}"
ADMIN_USER="${KEYCLOAK_ADMIN}"       # Must be set in compose.yml/Helm — no default
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD}"  # Must be set in compose.yml/Helm — no default
REALM="aispm"
CLIENT_ID="aispm-ui"
CLIENT_SECRET="${AISPM_CLIENT_SECRET}"  # Must be set in compose.yml keycloak service env block
KCADM="/opt/keycloak/bin/kcadm.sh"

echo "Assuming Keycloak is ready."

# Authenticate kcadm
echo "Authenticating kcadm as $ADMIN_USER ..."
"$KCADM" config credentials \
  --server "$KC_URL" --realm master \
  --user "$ADMIN_USER" --password "$ADMIN_PASS"

# Create realm (idempotent)
echo "Creating realm '$REALM' (if not exists) ..."
"$KCADM" get realms/"$REALM" > /dev/null 2>&1 || \
  "$KCADM" create realms \
    -s realm="$REALM" -s enabled=true -s displayName="ReedShield"

# Apply the ReedShield-branded login theme (idempotent). The theme is mounted at
# /opt/keycloak/themes/reedshield by compose.auth.yml; this points the realm at it so
# the hosted credential page matches the ReedShield product look. Keycloak still owns
# all authentication — the theme is CSS/logo only.
echo "Setting login theme 'reedshield' on realm '$REALM' ..."
"$KCADM" update realms/"$REALM" -s loginTheme=reedshield

# Brute-force protection on the realm (audit finding H5): lock an account
# temporarily after repeated failures to blunt credential stuffing at the token
# endpoint. Idempotent.
echo "Enabling brute-force protection on realm '$REALM' ..."
"$KCADM" update realms/"$REALM" \
  -s bruteForceProtected=true \
  -s failureFactor=5 \
  -s waitIncrementSeconds=60 \
  -s permanentLockout=false

# Create confidential client (idempotent)
echo "Creating client '$CLIENT_ID' (if not exists) ..."
CLIENT_EXISTS=$("$KCADM" get clients -r "$REALM" \
  --fields clientId -q clientId="$CLIENT_ID" 2>/dev/null | grep -c "\"$CLIENT_ID\"" || true)
if [ "$CLIENT_EXISTS" -eq 0 ]; then
  "$KCADM" create clients -r "$REALM" \
    -s clientId="$CLIENT_ID" \
    -s secret="$CLIENT_SECRET" \
    -s publicClient=false \
    -s directAccessGrantsEnabled="${KC_ALLOW_ROPC:-false}" \
    -s 'redirectUris=["http://localhost:5173/*","http://localhost:3001/*","http://aispm.local/*"]' \
    -s 'webOrigins=["http://localhost:5173","http://localhost:3001","http://aispm.local"]'
fi

# Create realm roles (idempotent)
echo "Creating realm roles (if not exists) ..."
for ROLE in "spm:admin" "spm:auditor" "spm:viewer" "spm:security-analyst"; do
  "$KCADM" get roles -r "$REALM" --fields name \
    | grep -q "\"$ROLE\"" || \
    "$KCADM" create roles -r "$REALM" -s name="$ROLE"
done

echo "Realm '$REALM' configured."
