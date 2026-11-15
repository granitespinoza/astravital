// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// OPTIONAL SCAFFOLD, NOT DEPLOYED. All resource creation defaults to disabled.
// This does NOT provision PostgreSQL/Speech or implement the Azure adapters.
targetScope = 'resourceGroup'

@description('Explicit opt-in. False creates no resources; do not change without budget/region review.')
param enableInfrastructure bool = false

@description('Extra opt-in for an EPHEMERAL synthetic API preview. Not the durable Azure profile.')
param enableEphemeralApiPreview bool = false

@description('Existing public container image reference; preferably pin a digest. No registry credentials are accepted.')
param containerImage string = ''

@description('Use the selected resource group region; not a claim of service availability there.')
param location string = resourceGroup().location

@minLength(3)
@maxLength(12)
@description('Lowercase alphanumeric prefix. Storage/vault names append a deterministic suffix.')
param namePrefix string = 'astravital'

@description('Keep internal ingress by default. Public evaluation requires its own explicit decision.')
param externalIngress bool = false

var suffix = uniqueString(resourceGroup().id)
var storageName = take('${namePrefix}${suffix}', 24)
var vaultName = take('${namePrefix}-kv-${suffix}', 24)
var deployPreview = enableInfrastructure && enableEphemeralApiPreview && !empty(containerImage)
var tags = {
  project: 'astravital'
  data: 'synthetic-only'
  status: 'optional-scaffold'
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = if (enableInfrastructure) {
  name: '${namePrefix}-api-id'
  location: location
  tags: tags
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (enableInfrastructure) {
  name: '${namePrefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = if (enableInfrastructure) {
  name: '${namePrefix}-insights'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace!.id
    DisableIpMasking: false
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2025-01-01' = if (enableInfrastructure) {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  tags: tags
  properties: {
    isHnsEnabled: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    accessTier: 'Hot'
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = if (enableInfrastructure) {
  parent: storage
  name: 'default'
}

resource exports 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = if (enableInfrastructure) {
  parent: blobs
  name: 'exports'
  properties: { publicAccess: 'None' }
}

// Exact-container data access, not subscription-wide management. This built-in role
// includes blob deletion; append-only/versioned export policy still needs an adapter and review.
resource exportRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableInfrastructure) {
  scope: exports
  name: guid(exports!.id, identity!.id, 'blob-data-contributor')
  properties: {
    principalId: enableInfrastructure ? identity!.properties.principalId : ''
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

resource vault 'Microsoft.KeyVault/vaults@2025-05-01' = if (enableInfrastructure) {
  name: vaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 7
    accessPolicies: []
  }
}
// Intentionally no secrets and no vault data-plane role: grant only specific required
// secret access once an implemented adapter identifies a real dependency.

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = if (enableInfrastructure) {
  name: '${namePrefix}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: enableInfrastructure ? workspace!.properties.customerId : ''
        sharedKey: enableInfrastructure ? workspace!.listKeys().primarySharedKey : ''
      }
    }
  }
}

resource preview 'Microsoft.App/containerApps@2025-01-01' = if (deployPreview) {
  name: '${namePrefix}-preview'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity!.id}': {} }
  }
  properties: {
    managedEnvironmentId: environment!.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: externalIngress
        allowInsecure: false
        targetPort: 4173
        transport: 'http'
      }
    }
    template: {
      containers: [{
        name: 'astravital'
        image: containerImage
        env: [
          {
            name: 'HOST'
            value: '0.0.0.0'
          }
          {
            name: 'PORT'
            value: '4173'
          }
          {
            name: 'DB_PATH'
            value: '/tmp/astravital-demo.sqlite'
          }
          {
            name: 'SEED'
            value: '142'
          }
        ]
        resources: {
          cpu: json('0.5')
          memory: '1Gi'
        }
        probes: [{
          type: 'Readiness'
          httpGet: {
            path: '/health'
            port: 4173
            scheme: 'HTTP'
          }
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        }]
      }]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output status string = enableInfrastructure ? 'Scaffold provisioning selected; durable Azure profile still incomplete.' : 'Disabled: no resources selected.'
output previewUrl string = deployPreview ? 'https://${preview!.properties.configuration.ingress.fqdn}' : ''
output managedIdentityId string = enableInfrastructure ? identity!.id : ''
output archiveAccount string = enableInfrastructure ? storage!.name : ''
output keyVaultUri string = enableInfrastructure ? vault!.properties.vaultUri : ''
