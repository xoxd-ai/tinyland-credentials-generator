# tinyland-credentials-generator (RETIRED)

> **Retired 2026-10-09.** This repository is archived and receives no further
> changes. There is no replacement module.

`@tummycrypt/tinyland-credentials-generator` rendered a PNG credentials card
(with a TOTP QR code) for new admin users. Its only consumer was the
Mothership (xoxd-ai/tinyland.dev) direct-create path on the admin invite page,
which moves to the invitation-service flow in the Mothership integration
branch. No other live app or Bazel registry module depends on it, so it was
retired in the 2026-10 estate uplift (rulings RU2/RU7) rather than moved to
the new stack.

- Bazel registry: `tummycrypt_tinyland_credentials_generator` 0.2.2 and 0.2.3
  in [xoxd-ai/bazel-registry](https://github.com/xoxd-ai/bazel-registry) are
  marked `deprecated`. They stay resolvable; nothing is yanked.
- npm: no further versions will be published (RU8). Published versions are not
  unpublished.
- Code: the last released source is tag `v0.2.2`. The tinyland.dev
  `packages/` copy carries one type-only fix (TIN-1721) that was not
  reconciled here. Copy what you need into your own app instead of depending
  on this package.
