// ──────────────────────────────────────────────────────
// AionCore API Type Definitions
// Auto-generated from aionui-api-types crate
// ──────────────────────────────────────────────────────

// ========== Generic Response Wrappers ==========

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ========== System / Settings ==========

export interface SystemSettings {
  theme?: string;
  language?: string;
  dataDir?: string;
  [key: string]: unknown;
}

export interface UpdateSettingsRequest {
  [key: string]: unknown;
}

export interface SystemInfoResponse {
  platform: string;
  arch: string;
  version: string;
  dataDir: string;
  workDir: string;
  local: boolean;
}

export interface UpdateCheckRequest {
  currentVersion: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion?: string;
  downloadUrl?: string;
}

export interface ClientPreferencesResponse {
  [key: string]: unknown;
}

export interface UpdateClientPreferencesRequest {
  [key: string]: unknown;
}

// ========== Provider ==========

export type AuthType = 'auth_token' | 'api_key' | 'both' | 'auth_token_clear_api_key';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  models?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProviderRequest {
  name: string;
  baseUrl: string;
  authType: AuthType;
  apiKey?: string;
}

export interface UpdateProviderRequest {
  name?: string;
  baseUrl?: string;
  authType?: AuthType;
  apiKey?: string;
}

export interface FetchModelsRequest {
  apiKey?: string;
  baseUrl?: string;
}

export interface FetchModelsAnonymousRequest {
  baseUrl: string;
  authType: AuthType;
  apiKey?: string;
}

export interface FetchModelsResponse {
  models: string[];
  error?: string;
}

export interface DetectProtocolRequest {
  baseUrl: string;
}

export interface ProtocolDetectionResponse {
  protocol: string;
  version?: string;
}

// ========== Conversation ==========

export interface Conversation {
  id: string;
  title: string;
  agentId?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface CreateConversationRequest {
  title: string;
  agentId?: string;
  workspacePath?: string;
}

export interface UpdateConversationRequest {
  title?: string;
  status?: 'active' | 'archived' | 'completed';
}

export interface ListConversationsQuery {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageRequest {
  content: string;
  attachments?: Array<{
    type: string;
    name: string;
    content: string;
  }>;
}

export interface SendMessageResponse {
  message: Message;
  streamId?: string;
}

export interface ListMessagesQuery {
  page?: number;
  pageSize?: number;
  before?: string;
  after?: string;
}

export interface ActiveCountResponse {
  count: number;
}

export interface AgentModeResponse {
  mode: 'auto' | 'manual' | 'plan';
}

export interface SetModeRequest {
  mode: 'auto' | 'manual' | 'plan';
}

export interface GetModelInfoResponse {
  providerId: string;
  model: string;
}

export interface SetModelRequest {
  providerId: string;
  model: string;
}

export interface SideQuestionRequest {
  content: string;
}

export interface SideQuestionResponse {
  content: string;
}

export interface SlashCommandItem {
  name: string;
  description: string;
}

export interface SearchMessagesQuery {
  q: string;
  page?: number;
  pageSize?: number;
}

export interface ConversationArtifactResponse {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface ConversationArtifactListResponse {
  artifacts: ConversationArtifactResponse[];
}

export interface UpdateConversationArtifactRequest {
  content?: string;
  name?: string;
}

export interface ConfirmationListResponse {
  confirmations: Array<{
    callId: string;
    prompt: string;
    status: 'pending' | 'confirmed' | 'rejected';
    createdAt: string;
  }>;
}

export interface ConfirmRequest {
  approved: boolean;
  reason?: string;
}

export interface ApprovalCheckQuery {
  action: string;
}

export interface ApprovalCheckResponse {
  required: boolean;
  approved?: boolean;
}

export interface CloneConversationRequest {
  conversationId: string;
  title?: string;
}

export interface CancelConversationRequest {
  reason?: string;
}

export interface CancelConversationResponse {
  success: boolean;
}

// ========== MCP ==========

export interface McpServer {
  id: string | number;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  transport: 'stdio' | 'sse';
  status?: 'connected' | 'disconnected' | 'error';
}

export interface McpServerResponse extends McpServer {
  createdAt: string;
  updatedAt: string;
}

export interface CreateMcpServerRequest {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse';
}

export interface UpdateMcpServerRequest {
  name?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse';
}

export interface BatchImportMcpServersRequest {
  servers: CreateMcpServerRequest[];
}

export interface TestMcpConnectionRequest {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface DetectedMcpServerResponse {
  name: string;
  command: string;
  args: string[];
  source: string;
}

export interface McpConnectionTestErrorCode {
  code: string;
  message: string;
}

// OAuth
export interface OAuthLoginRequest {
  serverId: string;
}

export interface OAuthLoginResponse {
  url: string;
}

export interface OAuthStatusResponse {
  authenticated: boolean;
  serverId: string;
}

export interface OAuthCheckStatusRequest {
  serverId: string;
}

export interface OAuthLogoutRequest {
  serverId: string;
}

// ========== File System ==========

export interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size?: number;
  modifiedAt?: string;
}

export interface DirOrFileResponse {
  entries: DirEntry[];
  path: string;
  parent?: string;
}

export interface BrowseDirectoryQuery {
  path?: string;
}

export interface GetFilesByDirRequest {
  path: string;
  pattern?: string;
}

export interface ListWorkspaceFilesRequest {
  pattern?: string;
  recursive?: boolean;
}

export interface WorkspaceFlatFileResponse {
  files: Array<{
    path: string;
    name: string;
    size: number;
    modifiedAt: string;
  }>;
}

export interface GetFileMetadataRequest {
  path: string;
}

export interface FileMetadataResponse {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'dir';
  modifiedAt: string;
  createdAt?: string;
}

export interface ReadFileRequest {
  path: string;
  encoding?: 'utf-8' | 'base64' | 'binary';
}

export interface ReadFileBufferRequest {
  path: string;
  offset?: number;
  length?: number;
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface CopyFilesRequest {
  source: string;
  target: string;
  recursive?: boolean;
}

export interface CopyFilesResponse {
  success: boolean;
  count?: number;
}

export interface RemoveEntryRequest {
  path: string;
  recursive?: boolean;
}

export interface RenameRequest {
  path: string;
  newName: string;
}

export interface RenameResponse {
  success: boolean;
  newPath: string;
}

export interface CreateTempFileRequest {
  prefix?: string;
  suffix?: string;
  content?: string;
}

export interface GetImageBase64Request {
  path: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface FetchRemoteImageRequest {
  url: string;
}

export interface FileWatchRequest {
  path: string;
  recursive?: boolean;
}

export interface FileChangeInfoResponse {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: string;
}

export interface SnapshotBaselineRequest {
  path: string;
  label?: string;
}

export interface SnapshotWorkspaceRequest {
  path: string;
}

export interface SnapshotInfoResponse {
  id: string;
  label?: string;
  createdAt: string;
  fileCount: number;
}

export interface SnapshotCompareResponse {
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface SnapshotStageRequest {
  path: string;
  files: string[];
}

export interface SnapshotDiscardRequest {
  path: string;
}

export interface ZipRequest {
  source: string;
  target: string;
}

export interface CancelZipRequest {
  id: string;
}

// ========== Cron ==========

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  type: 'interval' | 'cron' | 'once';
  enabled: boolean;
  action: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
}

export interface CronJobResponse extends CronJob {
  nextRunAt?: string;
}

export interface CreateCronJobRequest {
  name: string;
  schedule: string;
  type: 'interval' | 'cron' | 'once';
  action: string;
  enabled?: boolean;
}

export interface UpdateCronJobRequest {
  name?: string;
  schedule?: string;
  type?: 'interval' | 'cron' | 'once';
  action?: string;
  enabled?: boolean;
}

export interface ListCronJobsQuery {
  enabled?: boolean;
  type?: string;
}

export interface RunNowResponse {
  jobId: string;
  status: 'running' | 'queued';
}

export interface SaveCronSkillRequest {
  jobId?: string;
  skillId: string;
  content: string;
}

export interface HasSkillResponse {
  has: boolean;
  jobId?: string;
}

// ========== Channel ==========

export interface PluginStatusResponse {
  id: string;
  name: string;
  type: 'telegram' | 'dingtalk' | 'lark' | 'weixin' | 'openclaw';
  enabled: boolean;
  status: 'running' | 'stopped' | 'error';
  error?: string;
  config?: PluginConfigOptions;
}

export interface PluginConfigOptions {
  [key: string]: unknown;
}

export interface EnablePluginRequest {
  pluginId: string;
  config?: PluginConfigOptions;
}

export interface DisablePluginRequest {
  pluginId: string;
}

export interface TestPluginRequest {
  pluginId: string;
}

export interface TestPluginResponse {
  success: boolean;
  message?: string;
}

export interface PairingRequestResponse {
  id: string;
  pluginId: string;
  userId: string;
  userName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ApprovePairingRequest {
  pairingId: string;
}

export interface RejectPairingRequest {
  pairingId: string;
}

export interface ChannelUserResponse {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  role: 'user' | 'admin';
  authorizedAt: string;
}

export interface RevokeUserRequest {
  pluginId: string;
  userId: string;
}

export interface ChannelSessionResponse {
  id: string;
  pluginId: string;
  userId: string;
  status: 'active' | 'idle';
  lastActivityAt: string;
}

export interface BridgeResponse {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface SyncChannelSettingsRequest {
  pluginId: string;
  settings: Record<string, unknown>;
}

// ========== Agent ==========

export interface AgentMetadata {
  id: string;
  name: string;
  type: 'builtin' | 'custom' | 'remote';
  enabled: boolean;
  providerId?: string;
  model?: string;
  status?: 'ready' | 'error' | 'busy';
  error?: string;
}

export interface AcpHealthCheckRequest {
  agentId?: string;
}

export interface AcpHealthCheckResponse {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ProviderHealthCheckRequest {
  providerId: string;
  model?: string;
}

export interface ProviderHealthCheckResponse {
  reachable: boolean;
  latencyMs?: number;
  error?: string;
}

export interface SetEnabledRequest {
  enabled: boolean;
}

export interface CustomAgentUpsertRequest {
  name: string;
  providerId: string;
  model: string;
  systemPrompt?: string;
}

export interface DeleteCustomAgentResponse {
  deleted: boolean;
}

// Remote Agent
export interface RemoteAgentListItem {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeenAt?: string;
}

export interface RemoteAgentResponse extends RemoteAgentListItem {
  capabilities?: string[];
}

export interface CreateRemoteAgentRequest {
  name: string;
  url: string;
  token?: string;
}

export interface UpdateRemoteAgentRequest {
  name?: string;
  url?: string;
  token?: string;
}

export interface TestRemoteAgentConnectionRequest {
  url: string;
  token?: string;
}

export interface HandshakeResponse {
  success: boolean;
  agentInfo?: {
    name: string;
    version: string;
    capabilities: string[];
  };
}

// ========== Team ==========

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  agentCount?: number;
}

export interface TeamResponse extends Team {
  agents: TeamAgentResponse[];
}

export interface TeamListResponse {
  teams: TeamResponse[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface RenameTeamRequest {
  name: string;
}

export interface AddAgentRequest {
  name: string;
  providerId: string;
  model: string;
  systemPrompt?: string;
  role?: string;
}

export interface TeamAgentResponse {
  slotId: number;
  name: string;
  providerId: string;
  model: string;
  role?: string;
  status: 'idle' | 'thinking' | 'error';
}

export interface RenameAgentRequest {
  name: string;
}

export interface SendTeamMessageRequest {
  content: string;
  targetAgentSlot?: number;
}

export interface TeamSetModeRequest {
  mode: 'auto' | 'manual' | 'round-robin';
}

// ========== Extension ==========

export interface ExtensionSummaryResponse {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  installedAt?: string;
}

export interface DisableExtensionRequest {
  extensionId: string;
}

export interface EnableExtensionRequest {
  extensionId: string;
}

export interface GetI18nRequest {
  extensionId: string;
  locale?: string;
}

export interface GetPermissionsRequest {
  extensionId: string;
}

export interface PermissionDetailResponse {
  name: string;
  description?: string;
}

export interface PermissionSummaryResponse {
  permissions: PermissionDetailResponse[];
}

export interface GetRiskLevelRequest {
  extensionId: string;
}

// ========== Assistant ==========

export interface Assistant {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  state: 'active' | 'inactive';
  systemPrompt?: string;
  modelConfig?: {
    providerId: string;
    model: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssistantResponse extends Assistant {}

export interface CreateAssistantRequest {
  name: string;
  description?: string;
  systemPrompt?: string;
  modelConfig?: {
    providerId: string;
    model: string;
  };
}

export interface UpdateAssistantRequest {
  name?: string;
  description?: string;
  systemPrompt?: string;
  modelConfig?: {
    providerId: string;
    model: string;
  };
}

export interface SetAssistantStateRequest {
  state: 'active' | 'inactive';
}

export interface ImportAssistantsRequest {
  assistants: CreateAssistantRequest[];
}

export interface ImportAssistantsResult {
  imported: number;
  errors?: string[];
}

// ========== Shell ==========

export interface OpenFileRequest {
  filePath: string;
}

export interface ShowItemInFolderRequest {
  filePath: string;
}

export interface OpenExternalRequest {
  url: string;
}

export interface CheckToolInstalledRequest {
  tool: string;
}

export interface CheckToolInstalledResponse {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface OpenFolderWithRequest {
  folderPath: string;
  application?: string;
}

export interface SpeechToTextConfig {
  provider?: 'openai' | 'deepgram';
  apiKey?: string;
  language?: string;
}

// ========== Office ==========

export interface StartPreviewRequest {
  path: string;
}

export interface StopPreviewRequest {
  path?: string;
}

export interface PreviewUrlResponse {
  url: string;
  expiresAt?: string;
}

export interface DetectStarOfficeRequest {
  path: string;
}

export interface StarOfficeDetectResponse {
  isStarOffice: boolean;
  version?: string;
}

export interface DocumentConversionRequest {
  path: string;
  targetFormat: string;
}

export interface SaveSnapshotRequest {
  path: string;
  label?: string;
}

export interface ListSnapshotsRequest {
  path: string;
}

export interface PreviewSnapshotInfoDto {
  id: string;
  label?: string;
  createdAt: string;
}

export interface GetSnapshotContentRequest {
  path: string;
  snapshotId: string;
}

export interface SnapshotContentResponse {
  content: string;
  mimeType?: string;
}

// ========== Health ==========

export interface HealthResponse {
  status: 'ok';
  uptime?: number;
  version?: string;
}
