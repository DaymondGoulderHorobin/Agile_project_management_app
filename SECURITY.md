# Security policy

Please report suspected vulnerabilities privately to the repository owner. Do not open a public issue containing exploit details, credentials, tenant data, runner capabilities, prohibited health information, or unredacted logs.

The supported security boundary is documented in [`docs/planning/06-security-and-privacy.md`](docs/planning/06-security-and-privacy.md). Until a tagged release exists, the default branch is the only supported development line.

If prohibited patient-identifiable health information is submitted, restrict access, stop downstream processing, notify the authorised privacy/security owner, preserve only non-sensitive audit metadata, remove the prohibited content safely, assess provider exposure, and document the incident and recovery.
