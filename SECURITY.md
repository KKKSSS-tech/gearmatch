# Security Policy

Gear Match is a static React/Vite web app. It does not currently run a backend
service or store user accounts.

## Supported Versions

Security fixes are applied to the `main` branch.

## Reporting a Vulnerability

Please report security issues privately by opening a GitHub issue with minimal
public detail and asking for a maintainer contact path, or by contacting the
maintainer through the GitHub profile linked from this repository.

Please do not post exploit steps, secrets, or private user data in a public
issue. A useful report includes:

- The affected URL, file, or dependency.
- Steps to reproduce.
- Expected impact.
- Suggested mitigation, if known.

## Scope

In scope:

- Dependency vulnerabilities that affect the shipped app.
- Cross-site scripting or unsafe rendering paths.
- Privacy issues related to analytics, ads, or outbound links.

Out of scope:

- Generic scanner output without a reproducible issue.
- Denial-of-service reports against third-party hosting.
- Issues that require control of a user's local browser or extension setup.
