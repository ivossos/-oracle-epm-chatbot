# epmcopilot.com landing page

A static page in Portuguese, built from `src/` and `content.json` with no dependencies.

```bash
node build.mjs            # preview build, warns about missing values
node build.mjs --strict   # publish build, fails if anything required is missing
node scripts/og.mjs       # re-render src/og.png (needs Playwright)
```

Deploy the `dist/` folder to any static host. Serve `404.html` as the not-found page.

## Intake (confirmed by the user, 2026-11-01)

1. **One action:** book a 30-minute demo (Calendly link).
2. **Offer:** a 30-minute call where we connect a read-only agent to the buyer's FCCS/EPBCS test environment and run a live variance analysis. Free, no commitment.
3. **Buyer:** Controller at a R$500M+ Brazilian company on Oracle FCCS/EPBCS. Close takes 8+ business days. The page is in Portuguese.
4. **Top objections:** (a) Is my data safe? (b) Will IT approve this? (c) We already have consultants.
5. **Traffic source:** LinkedIn posts.
6. **Proof:** years in Oracle EPM, one measured result, and a live demo. **Exact values are still missing.** Fill them in `content.json`.

## Fill in before publishing (`content.json`)

| Key | What | If empty |
|---|---|---|
| `calendly_url` | Booking link | Strict build fails |
| `contact_email` | Footer and privacy contact | Strict build fails |
| `company_legal_name`, `company_cnpj` | Legal entity for the LGPD policy | Strict build fails / CNPJ hidden |
| `years_epm` | e.g. `15` | Hidden from proof bar and results |
| `result_value`, `result_label`, `result_source` | e.g. `9 → 5 dias úteis`, `fechamento do FCCS em cliente do varejo`, `medição do cliente, ago/2026` | Results section shows the "your own cube is the proof" copy instead |
| `screenshot_path`, `screenshot_alt` | A real product screenshot in `src/` | Hidden |
| `plausible_domain` | Turns on Plausible analytics | No script loaded. CTA clicks still push `agendar_demo` to `dataLayer` |

## Product claims to verify

These are written on the page as facts. Confirm each one, or edit `src/index.html`:

- The agent connects through the official Oracle EPM Cloud REST API with a Viewer-role user. It doesn't write data or run rules.
- It explains variances by entity, account and month, flags intercompany mismatches and pending consolidation, and answers questions in Portuguese.
- Nothing is installed on the client's side. Each access shows up in Oracle's own audit log.
- Privacy page: "we keep no copy of the Oracle data after the call". The privacy page also needs legal review.

## Checklist status

Done: 12 sections in order, one action with the same button text everywhere, no banned words, Inter 400/500/700 only, all values from tokens, flat backgrounds, max two columns, motion uses tokens and respects reduced motion, no horizontal scroll at 360px, one H1 plus H2s, skip link and focus ring, title under 60 characters and description under 155, OG tags and image, favicon, branded 404 with the CTA, privacy page with an LGPD consent line next to each CTA.

Still open (needs the user or a live deploy):
- Proof values (above). Sections 4 and 9 have no number until `result_value` is filled.
- Form validation, minimum fields, spam protection and the confirmation email are handled by Calendly. Set the Calendly event to ask for name, work email and company.
- HTTPS and the www → non-www redirect (host setting), Lighthouse 90+ on the live URL, one real booking tested end to end, and checks in Chrome, Safari and one real phone.

Known exception: `favicon.svg` hard-codes the navy and gold hex values, because an SVG file can't read CSS variables.
