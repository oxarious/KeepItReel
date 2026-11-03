> Historical development reference. Cloud features are excluded from the 0.3.1 private beta. Do not provision these services for this release.

# Enable optional text analysis

The distributed extension is fully usable for local feed filtering without a cloud service. This guide enables only the optional text-checking feature. It does not add video/image/audio detection.

## 1. Create the services

- Create a Supabase project in a region appropriate for your users.
- Obtain a Pangram developer account and API key.
- Inspect `GET https://text.external-api.pangram.com/models` using your key in the `x-api-key` header. Choose an available selector and confirm its current price and data-retention terms. The application does not silently fall back to another model.
- The current integration uses `POST /task` and `GET /task/{task_id}`. Provider API documentation: https://docs.pangram.com/api-reference/ai-detection

## 2. Apply the database migration

Run `supabase/migrations/202610270001_analysis.sql` in the Supabase SQL editor, or link the Supabase CLI to your new project and use `supabase db push`.

The migration creates usage, limits and request tables with row-level security enabled. Ordinary clients cannot read or change these tables or execute quota functions. Only the server service role can.

The defaults are 20 user credits/month and 2,000 global credits/month. One application credit covers up to 100 words. Confirm that these units match your provider's actual billing before opening the pilot.

To change budgets, use the SQL editor:

```sql
update public.analysis_limits
set user_monthly_credits = 20, global_monthly_credits = 2000
where id = true;
```

Reservation and global/user checks run under one PostgreSQL transaction lock. Limits are in credits, not currency; revise them when provider pricing changes. Configure additional provider spending limits where available.

## 3. Configure Auth

Disable public account creation for the invite-only pilot. Create the pilot users through the Supabase Auth dashboard. The extension calls email OTP sign-in with `shouldCreateUser: false`.

Configure production email delivery. Edit the email login template to show `{{ .Token }}` as a code; the extension expects a code, not an email redirect link. Test delivery to an invited address before distributing the cloud-enabled build. Supabase's default test email delivery is not a production mail service.

## 4. Set server secrets and deploy

Using the Supabase dashboard or CLI secret management, configure:

```text
PANGRAM_API_KEY=<provider secret>
PANGRAM_MODEL=<selector returned by /models>
ALLOWED_ORIGINS=chrome-extension://<your-extension-id>
```

The hosted function also uses Supabase's server-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never add the service-role key to the extension or its `.env`.

Deploy the `analyze` function using `supabase functions deploy analyze`. The function config has `verify_jwt=false` because the handler explicitly validates every bearer token using Supabase Auth `getUser`; this is not an unauthenticated endpoint. Browser origins are also checked. Origin checks supplement authentication and do not replace it.

## 5. Build the extension with public configuration

Copy `.env.example` to `.env` and enter only:

```text
WXT_SUPABASE_URL=https://<project-ref>.supabase.co
WXT_SUPABASE_ANON_KEY=<public anon or publishable client key>
```

Build with `pnpm build`, load `.output/chrome-mv3` in Chrome, and copy its extension ID from `chrome://extensions`. Add that exact origin to `ALLOWED_ORIGINS`. A published store ID or different unpacked path may require updating the origin list. For stable development IDs, use a Chrome manifest public key derived from your own extension identity; never ship a private signing key.

Check that the generated manifest has host access only to your Supabase origin in addition to the content-script sites. The WXT config loads `.env` using Node 22+; explicit build-environment variables take precedence.

## 6. Validate a paid request

Sign in from Check text, paste a non-sensitive 300–1,000-word English passage, review the preview, accept the upload checkbox, and submit. Confirm the assessment and remaining credits. Compare the recorded application credits with the provider's actual invoice units. Set the global pilot allowance conservatively until that comparison is complete.

Do not claim detector accuracy based on the mocked automated tests. Benchmark the configured model on known-origin passages from your actual use case and set expectations for edited and mixed authorship.

## Failure handling

- Existing request IDs are tied to user, text hash, and credit count; retries do not create another provider job.
- A rejected request before submission releases its allowance. Certain explicit provider 4xx rejections also release it.
- A timeout after submission might have created a paid job. The request becomes uncertain, retains its allowance, and is never automatically resubmitted.
- Provider failures after a job exists retain their reservation until operator reconciliation. This avoids assuming provider refunds.
- To refund a confirmed unbilled/failed request once, execute `select public.release_analysis('<request UUID>');`. Do not refund uncertain requests before checking provider records.
- A user can request at most six new jobs per minute, subject to the stricter monthly allowance. Provider status throttling is reported as retryable; the UI polls every two seconds for up to one minute.

## Data and operations

No passage bodies or provider response passages are written to application tables or console logs. Requests retain a text hash, user ID, credit amount, timestamp, provider task ID and a small assessment. This is pseudonymous operational data, not anonymous data.

The browser keeps the current draft in session storage until cleared or the browser session ends. Sign-in tokens stay in the extension origin's local storage; they are not exposed to content scripts. The upstream provider receives the submitted passage and may retain it under its own terms. Publish the applicable retention policy before enabling the service for other people.

Run a maintenance job or manual review to delete request records older than 90 days. Retain active-month quota rows and records needed to reconcile spending; do not reset budgets by deleting current-month rows. Define account-deletion and support procedures before a public launch.

Hosted deployment, real email delivery, real paid detector calls, and provider accuracy remain operator validation steps. They cannot be verified without your service accounts.
