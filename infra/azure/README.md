# Optional Azure scaffold — not deployed

AI assistance: OpenAI Codex. Date: 2026-11-15.

`main.bicep` is a reviewable, disabled-by-default starting point. **No Azure resources, paid services, login, credentials or public URL were created.** It is not the finished Azure profile and it does not change the local critical path.

## What the template models

- A user-assigned managed identity.
- A hierarchical-namespace StorageV2 account (ADLS Gen2), an authenticated private `exports` container and **Storage Blob Data Contributor scoped to that one container**. This built-in role includes delete; append-only retention/versioned export logic is not implemented by the role assignment.
- An RBAC Key Vault with no secrets and **no data-plane access grant** until a specific application dependency needs one.
- Log Analytics, Application Insights and a Container Apps managed environment.
- A separately opt-in, at-most-one-replica **ephemeral API preview** using a supplied public image. No registry passwords are accepted. Ingress is internal by default.

`enableInfrastructure=false` means no resources are selected. Resource groups/subscription, provider registrations, regional support, quotas, cost limits and deployment permissions must already be selected for any later deployment. The template does not authorize that deployment.

## What remains absent

PostgreSQL Flexible Server; database migrations and adapter; online Azure Speech adapter and authorization; Entra token use in application code; ADLS export/retention adapter; durable sync receiver and ACK/outbox; private endpoints/network design; production identity/tenancy and retention controls; automatic operational telemetry integration. Providing a managed identity alone does not implement those connections.

The intended durable profile is `Container Apps -> PostgreSQL` for transactions and `versioned exports -> ADLS` for audit/archive. [Container storage is ephemeral](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts). ADLS is **not** a supported mounted SQLite filesystem in this design. Enabling the synthetic API preview would lose its database on replica replacement and is explicitly not a durable save demonstration.

## Review and compile without deploying

With the standalone [Bicep CLI](https://github.com/Azure/bicep/releases) already installed:

```sh
bicep build infra/azure/main.bicep --outfile /tmp/astravital-template.json
```

Compilation does not create Azure resources or require signing into Azure. Record the actual compiler/version/outcome in [RESULTADOS.md](../../docs/RESULTADOS.md). A template that compiles has not thereby passed Azure deployment validation.

The official standalone Bicep CLI v0.49.2 compiled the template without diagnostics in this pass; the generated ARM file stayed in temporary work. This validates compilation only. Azure CLI was not found in this task's PATH; no login was attempted. A future read-only account inspection, if authorized and the CLI is installed, would use `az account show`; sign-in/deployment remain separate actions. No deploy command is included in the startup path.

If later preparing deployment, first resolve the persistent profile, regional service availability and budget. Estimate compute + PostgreSQL + Speech minutes + storage/operations + log ingestion/egress. No monthly cost or free entitlement is assumed. Log quota and scale limits reduce exposure but do not guarantee a billing cap.

## Local Docker profile

The root Dockerfile uses Node 26 and expects the committed package lock. It builds the local Three.js bundle and installs compiler/audio prerequisites, but does not include `whisper-cli` or download ASR weights during image build. Install/build the official whisper.cpp engine in a derived image or use an explicitly configured local executable; the default container is not ASR-ready. A named data volume preserves SQLite across **local container replacement**, not across losing that volume:

```sh
docker build -t astravital-local .
docker run --rm -p 127.0.0.1:4173:4173 --mount source=astravital-demo-data,target=/data astravital-local
```

This local image still needs voice setup/artifact configuration for real transcription. For experiments, a persistent runtime directory and the documented setup command are needed; inspect `/health` and the voice manifest rather than assuming the image contains a recognizer. Container build and microphone flow are pending validation until results are recorded. Do not copy `.env`, recordings, SQLite files, `.git` or downloaded models into the image.

## Primary implementation references

[Container Apps resource schema](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/containerapps) · [Managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity) · [Storage schema](https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts) · [Storage data roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage) · [Key Vault RBAC](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide) · [Application Insights schema](https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/components) · [Speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview).
