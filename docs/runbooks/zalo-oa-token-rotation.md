# Runbook — Zalo OA access token expired

Zalo OA access tokens are valid for ~25 hours and refresh tokens for 3 months. The worker has a rotator job (`apps/worker/src/queues/zalo-token.ts`, TBD v0.2) that refreshes at the 20-hour mark.

## If outbound OA messages are failing with `error: -201` (token expired):

1. Pull the refresh token out of secret store:
   ```bash
   kubectl get secret pcn-api-secrets -o jsonpath='{.data.ZALO_OA_REFRESH_TOKEN}' | base64 -d
   ```
2. Run the rotation manually:
   ```bash
   curl -X POST https://oauth.zaloapp.com/v4/oa/access_token \
     -H 'secret_key: <ZALO_OA_SECRET>' \
     --data-urlencode 'refresh_token=<TOKEN>' \
     --data-urlencode 'app_id=<APP_ID>' \
     --data-urlencode 'grant_type=refresh_token'
   ```
3. Update the secret with the new `access_token` AND the new `refresh_token` (Zalo rotates both).
4. `kubectl rollout restart deployment pcn-worker pcn-api`.

If the refresh token itself is dead (e.g. >90 days since last rotation), the OA owner has to re-authorise the app in the Zalo OA portal.
