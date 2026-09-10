# ChaanBean for Android

A native Android client for the ChaanBean B2B credit-recovery and business-verification
platform — the Next.js app on branch `main` of
[L11cif3r/ChaanBean](https://github.com/L11cif3r/ChaanBean).

Kotlin · Jetpack Compose · Material 3 · Retrofit · kotlinx.serialization.
No Hilt, no annotation processing — dependencies are wired by hand through `AppContainer`.

## Screens

Taken from the `live` flavor against a running `main` server, so every figure below is
real seeded data rather than a mockup.

**Opening**

| Sign-in | Create account | Admin desk | Navigation |
|---|---|---|---|
| ![](docs/screenshots/01-login-client-signin.png) | ![](docs/screenshots/03-login-client-register.png) | ![](docs/screenshots/04-login-admin-signin.png) | ![](docs/screenshots/09-drawer-top.png) |

**Credit and recovery**

| Home | Risk mix | Business Check | Business profile |
|---|---|---|---|
| ![](docs/screenshots/06-dashboard-home.png) | ![](docs/screenshots/07-dashboard-risk-mix.png) | ![](docs/screenshots/14-business-check-list.png) | ![](docs/screenshots/47-business-detail.png) |

| Debtors | Debtor profile | Recovery worklist | Escalation ladder |
|---|---|---|---|
| ![](docs/screenshots/16-debtors-list.png) | ![](docs/screenshots/51-debtor-detail.png) | ![](docs/screenshots/18-recovery-worklist.png) | ![](docs/screenshots/29-recovery-escalation.png) |

| Statutory interest | Settlement | Arbitration | Compare |
|---|---|---|---|
| ![](docs/screenshots/31-recovery-escalation-3.png) | ![](docs/screenshots/64-recovery-settlement.png) | ![](docs/screenshots/20-arbitration-cases.png) | ![](docs/screenshots/62-business-compare.png) |

**Network, verification and admin**

| Trust Hub | Vendors | Background check | GST OTP |
|---|---|---|---|
| ![](docs/screenshots/22-trusthub-verify.png) | ![](docs/screenshots/25-vendors-registry.png) | ![](docs/screenshots/26-background-check.png) | ![](docs/screenshots/66-background-check-gst-otp.png) |

| Admin overview | Customers | Financials | Pipeline |
|---|---|---|---|
| ![](docs/screenshots/36-admin-overview.png) | ![](docs/screenshots/38-admin-customers.png) | ![](docs/screenshots/40-admin-financials.png) | ![](docs/screenshots/42-admin-pipeline.png) |

**Legal help** — `main` puts this on every page through `AppShell`

| MSME §16 | TRAI rules | IT Act §3A | Ask legal |
|---|---|---|---|
| ![](docs/screenshots/11-support-msme16.png) | ![](docs/screenshots/12-support-trai.png) | ![](docs/screenshots/61-support-itact.png) | ![](docs/screenshots/13-support-ask-legal.png) |

**Four languages and a dark theme**

| हिन्दी | മലയാളം | தமிழ் | Dark |
|---|---|---|---|
| ![](docs/screenshots/71-lang-hindi-drawer.png) | ![](docs/screenshots/73-lang-malayalam-drawer.png) | ![](docs/screenshots/75-lang-tamil-drawer.png) | ![](docs/screenshots/68-theme-dark-home.png) |

**[→ Full walkthrough: all 64 captures, every screen and tab](docs/SCREENS.md)**
**[→ API reference: all 42 endpoints, how to run against them, and their source](docs/API.md)**

Downloadable: **[API reference (PDF)](docs/pdf/ChaanBean-Android-API-Reference.pdf)** · **[Screen walkthrough (PDF)](docs/pdf/ChaanBean-Android-Screen-Walkthrough.pdf)**

---

## Read this before you deploy anything

**The server this app talks to performs no authentication.** That is not a limitation of
this client; it is a property of `main`. Verified against the source:

- `POST /api/auth` with `action: "login_admin"` destructures `{ email, password }` at
  `src/app/api/auth/route.ts:141` and never reads `password` again. If no admin row
  matches, it falls back to `findFirst()`, and if the table is empty it creates an `owner`.
- `action: "login_client"` never touches a credential either — it falls back to the
  hardcoded company `"Acme Traders Pvt Ltd"`, then to the first `Company` row.
- The admin registration passkey check at line 187 reads `if (securityKey && ...)`, so
  **omitting the field entirely skips the check** and mints an `owner` account.
- The 41-model Prisma schema contains no password, hash, or session-token field anywhere,
  so there is nothing for a credential to be checked against.
- None of the 42 route handlers reads a cookie, `Authorization` header, or session token,
  and there is no `middleware.ts`. `GET /api/businesses/[id]` takes an id straight from the
  URL into `findUnique` with no tenant scope.

Shipping this APK to devices publishes the API surface: the base URL and every endpoint
sit in plain sight inside the package. **Do not point the `live` flavor at anything holding
real customer data until the server has authentication and per-route authorization.**

The client keeps identity in exactly one place — `core/di/SessionStore.kt` — so that when
the server grows real sessions, the change is that file plus an OkHttp interceptor, rather
than an edit to every feature.

---

## Requirements

| | |
|---|---|
| JDK | 17 (Temurin 17.0.20 verified) |
| Android SDK | platform **36**, build-tools **36.0.0** |
| Gradle | 8.12 via the wrapper |
| AGP / Kotlin | 8.10.1 / 2.1.0 |
| min / target SDK | 26 / 36 |

## First clone

`local.properties` is gitignored because it names a machine-specific path, so create it
before the first build:

```
sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk
```

Use forward slashes — a backslash there is a `.properties` escape sequence that silently
corrupts the path, surfacing as "The filename, directory name, or volume label syntax is
incorrect" from the Android Gradle Plugin. Android Studio writes this file for you when it
opens the project.

## The AF_UNIX loopback fix — only if you hit it

On this machine every Gradle invocation failed with:

```
java.io.IOException: Unable to establish loopback connection
```

The cause is not Gradle and not the network. Gradle's launcher↔daemon handshake uses
`java.nio.channels.Pipe`, which on Windows is backed by an **AF_UNIX socket** created under
`java.io.tmpdir`. On this host that path makes `connect()` fail with `Invalid argument`.
Reproduced directly: a bare `Pipe.open()` throws with the default temp dir and succeeds
with `-Djdk.net.unixdomain.tmpdir=C:/gradletmp`. Plain TCP loopback works fine, which is
why the OS-level check misleads you.

**This fix is deliberately NOT in the repository.** It names a Windows path, so committing
it into `gradle.properties` or `gradlew` would break the build for anyone on Linux or macOS,
and for any Windows machine without that directory. It belongs in machine configuration:

```
setx GRADLE_OPTS "-Djdk.net.unixdomain.tmpdir=C:/gradletmp"
```

`org.gradle.jvmargs` alone is not enough — it reaches only the **daemon**, and the
**launcher** JVM fails first. `GRADLE_OPTS` covers the launcher; add the same `-D` to
`org.gradle.jvmargs` in `%USERPROFILE%\.gradle\gradle.properties` for the daemon. Create
`C:\gradletmp` first. Forward slashes are deliberate: a backslash in a `.properties` value
is an escape character.

If you are not on this machine, ignore all of the above — the checked-in project is
portable and needs none of it.

Also note `services.gradle.org` is unreachable from this network, so
`tasks.wrapper { validateDistributionUrl = false }` is set in `build.gradle.kts`. The 8.12
distribution is already in the local wrapper cache; `dl.google.com` and `repo1.maven.org`
are reachable, so dependency resolution works normally.

## Build

```bash
./gradlew :app:assembleMockDebug
```

APKs land in `app/build/outputs/apk/<flavor>/debug/`.

## Flavors

Two product flavors on the `backend` dimension:

| Flavor | Behaviour |
|---|---|
| `mock` | In-memory fixtures, no network. Runs standalone — useful for demos. Installs as `com.chaanbean.mobile.mock`, so it coexists with `live`. |
| `live` | Talks to `main`'s Next.js API at `http://10.0.2.2:3000/` (the emulator's view of the host loopback). |

Each feature picks its repository from one factory, keyed off `BuildConfig.USE_MOCK`:

```kotlin
object VendorsModule {
    fun repository(container: AppContainer): VendorsRepository =
        if (container.useMock) MockVendorsRepository()
        else LiveVendorsRepository(container.retrofit.create(VendorsApi::class.java))
}
```

### Running the `live` flavor

Start `main`'s server first:

```bash
git clone https://github.com/L11cif3r/ChaanBean.git && cd ChaanBean
npm install && npx prisma db push && npm run db:seed && npm run dev
```

Then `./gradlew :app:installLiveDebug`. On a physical device, change `API_BASE_URL` in
`app/build.gradle.kts` to your machine's LAN address and add that host to
`res/xml/network_security_config.xml` — cleartext is scoped to loopback hosts only, never
to the open internet.

## Architecture

```
core/
  di/         AppContainer (retrofit, json, useMock, session), SessionStore
  network/    Retrofit + kotlinx.serialization wiring
  model/      Outcome<T>, RiskFlag
  ui/         theme from main's chaan.* palette, shared components, rememberVm
feature/<area>/
  data/       @Serializable models, Retrofit API, Repository (interface + Live + Mock + Module)
  ui/         ViewModel (StateFlow) + Compose screens
  <Area>Nav.kt  routes + fun NavGraphBuilder.<area>Graph(nav: NavHostController)
navigation/   the app shell that composes every feature graph
```

Every feature owns its whole vertical slice and exposes one nav extension function, so
adding a feature never edits shared code. `core/ui/Color.kt` samples `main`'s
`tailwind.config.ts` `chaan.*` tokens verbatim, so the two clients read as one product.

Repositories return `Outcome<T>` (`Loading` / `Ok` / `Err`); screens render the three
states through `OutcomeContent` rather than repeating the branch.

## Honesty in the UI

Where `main` returns synthesized or unchecked data, the screens say so instead of implying
a guarantee the server never made — the OTP endpoint that ignores its `otp` parameter, the
Trust Hub checkpoints derived from a hash of the company name, and the settlement endpoint
that cannot detect a duplicate submission. Those notices are deliberate. Removing them
would make the app claim more than the server does.
