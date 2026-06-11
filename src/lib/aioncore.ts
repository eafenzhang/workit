// ──────────────────────────────────────────────────────
// AionCore API SDK
// HTTP REST client for all AionCore backend endpoints
// ──────────────────────────────────────────────────────

import type {
  ApiResponse, PaginatedResult,
  SystemSettings, UpdateSettingsRequest, SystemInfoResponse,
  UpdateCheckRequest, UpdateCheckResult, ClientPreferencesResponse, UpdateClientPreferencesRequest,
  Provider, CreateProviderRequest, UpdateProviderRequest,
  FetchModelsRequest, FetchModelsAnonymousRequest, FetchModelsResponse,
  DetectProtocolRequest, ProtocolDetectionResponse,
  Conversation, CreateConversationRequest, UpdateConversationRequest,
  ListConversationsQuery, Message, SendMessageRequest, SendMessageResponse,
  ListMessagesQuery, ActiveCountResponse,
  AgentModeResponse, SetModeRequest, GetModelInfoResponse, SetModelRequest,
  SideQuestionRequest, SideQuestionResponse, SlashCommandItem,
  SearchMessagesQuery, ConversationArtifactListResponse, UpdateConversationArtifactRequest,
  ConfirmationListResponse, ConfirmRequest, ApprovalCheckQuery, ApprovalCheckResponse,
  CloneConversationRequest,
  McpServerResponse, CreateMcpServerRequest, UpdateMcpServerRequest,
  BatchImportMcpServersRequest, TestMcpConnectionRequest, DetectedMcpServerResponse,
  OAuthLoginRequest, OAuthLoginResponse, OAuthCheckStatusRequest, OAuthStatusResponse, OAuthLogoutRequest,
  DirOrFileResponse, BrowseDirectoryQuery, GetFilesByDirRequest,
  ListWorkspaceFilesRequest, WorkspaceFlatFileResponse,
  GetFileMetadataRequest, FileMetadataResponse,
  ReadFileRequest, WriteFileRequest, CopyFilesRequest, CopyFilesResponse,
  RemoveEntryRequest, RenameRequest, RenameResponse,
  GetImageBase64Request, FetchRemoteImageRequest,
  FileWatchRequest, SnapshotBaselineRequest, SnapshotInfoResponse, SnapshotCompareResponse,
  SnapshotStageRequest, SnapshotDiscardRequest, ZipRequest, CancelZipRequest,
  CronJobResponse, CreateCronJobRequest, UpdateCronJobRequest,
  ListCronJobsQuery, RunNowResponse, SaveCronSkillRequest, HasSkillResponse,
  PluginStatusResponse, EnablePluginRequest, DisablePluginRequest,
  TestPluginRequest, TestPluginResponse,
  PairingRequestResponse, ApprovePairingRequest, RejectPairingRequest,
  ChannelUserResponse, RevokeUserRequest, ChannelSessionResponse,
  BridgeResponse, SyncChannelSettingsRequest,
  AgentMetadata, AcpHealthCheckRequest, AcpHealthCheckResponse,
  ProviderHealthCheckRequest, ProviderHealthCheckResponse,
  SetEnabledRequest, CustomAgentUpsertRequest, DeleteCustomAgentResponse,
  RemoteAgentListItem, RemoteAgentResponse, CreateRemoteAgentRequest,
  UpdateRemoteAgentRequest, TestRemoteAgentConnectionRequest, HandshakeResponse,
  TeamResponse, TeamListResponse, CreateTeamRequest, RenameTeamRequest,
  AddAgentRequest, TeamAgentResponse, RenameAgentRequest,
  SendTeamMessageRequest, TeamSetModeRequest,
  ExtensionSummaryResponse, DisableExtensionRequest, EnableExtensionRequest,
  AssistantResponse, CreateAssistantRequest, UpdateAssistantRequest, SetAssistantStateRequest,
  ImportAssistantsRequest, ImportAssistantsResult,
  OpenFileRequest, ShowItemInFolderRequest, OpenExternalRequest,
  CheckToolInstalledRequest, CheckToolInstalledResponse, OpenFolderWithRequest,
  StartPreviewRequest, StopPreviewRequest, PreviewUrlResponse,
  DetectStarOfficeRequest, StarOfficeDetectResponse,
  DocumentConversionRequest, SaveSnapshotRequest, PreviewSnapshotInfoDto,
  HealthResponse,
} from './api-types';

const AIONCORE_PORT_KEY = 'aioncore:port';
const DEFAULT_PORT = 13400;

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.aioncorePort) {
    return `http://localhost:${(window as any).electronAPI.aioncorePort}`;
  }
  // Dev mode: Vite proxy handles /api → AionCore
  return '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error((json as any).error || (json as any).code || 'Unknown API error');
  }
  return json.data as T;
}

async function requestVoid(method: string, path: string, body?: unknown): Promise<void> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || json.code || 'Unknown API error');
  }
}

async function uploadFile(path: string, formData: FormData): Promise<unknown> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, { method: 'POST', body: formData });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Upload failed');
  }
  return json.data;
}

// ─── Client ────────────────────────────────────────────

export const aioncore = {
  // ── Health ──
  health: (): Promise<HealthResponse> =>
    request<HealthResponse>('GET', '/health'),

  // ── System ──
  system: {
    getSettings: (): Promise<SystemSettings> =>
      request<SystemSettings>('GET', '/api/settings'),
    updateSettings: (data: UpdateSettingsRequest): Promise<SystemSettings> =>
      request<SystemSettings>('PATCH', '/api/settings', data),
    getInfo: (): Promise<SystemInfoResponse> =>
      request<SystemInfoResponse>('GET', '/api/system/info'),
    checkUpdate: (req: UpdateCheckRequest): Promise<UpdateCheckResult> =>
      request<UpdateCheckResult>('POST', '/api/system/check-update', req),
    getClientPrefs: (keys?: string[]): Promise<ClientPreferencesResponse> =>
      request<ClientPreferencesResponse>('GET', `/api/settings/client${keys ? `?keys=${keys.join(',')}` : ''}`),
    setClientPrefs: (data: UpdateClientPreferencesRequest): Promise<void> =>
      requestVoid('PUT', '/api/settings/client', data),
  },

  // ── Provider ──
  providers: {
    list: (): Promise<Provider[]> =>
      request<Provider[]>('GET', '/api/providers'),
    create: (data: CreateProviderRequest): Promise<Provider> =>
      request<Provider>('POST', '/api/providers', data),
    update: (id: string, data: UpdateProviderRequest): Promise<Provider> =>
      request<Provider>('PUT', `/api/providers/${id}`, data),
    delete: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/providers/${id}`),
    fetchModels: (id: string, req: FetchModelsRequest): Promise<FetchModelsResponse> =>
      request<FetchModelsResponse>('POST', `/api/providers/${id}/models`, req),
    fetchModelsAnonymous: (req: FetchModelsAnonymousRequest): Promise<FetchModelsResponse> =>
      request<FetchModelsResponse>('POST', '/api/providers/fetch-models', req),
    detectProtocol: (req: DetectProtocolRequest): Promise<ProtocolDetectionResponse> =>
      request<ProtocolDetectionResponse>('POST', '/api/providers/detect-protocol', req),
  },

  // ── Conversation ──
  conversations: {
    list: (q?: ListConversationsQuery): Promise<Conversation[]> =>
      request<Conversation[]>('GET', '/api/conversations', q),
    create: (req: CreateConversationRequest): Promise<Conversation> =>
      request<Conversation>('POST', '/api/conversations', req),
    get: (id: string): Promise<Conversation> =>
      request<Conversation>('GET', `/api/conversations/${id}`),
    update: (id: string, req: UpdateConversationRequest): Promise<Conversation> =>
      request<Conversation>('PATCH', `/api/conversations/${id}`, req),
    delete: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/conversations/${id}`),
    reset: (id: string): Promise<Conversation> =>
      request<Conversation>('POST', `/api/conversations/${id}/reset`),
    messages: {
      list: (convId: string, q?: ListMessagesQuery): Promise<PaginatedResult<Message>> =>
        request<PaginatedResult<Message>>('GET', `/api/conversations/${convId}/messages`, q),
      send: (convId: string, req: SendMessageRequest): Promise<SendMessageResponse> =>
        request<SendMessageResponse>('POST', `/api/conversations/${convId}/messages`, req),
      get: (convId: string, msgId: string): Promise<Message> =>
        request<Message>('GET', `/api/conversations/${convId}/messages/${msgId}`),
    },
    cancel: (id: string): Promise<void> =>
      requestVoid('POST', `/api/conversations/${id}/cancel`),
    warmup: (id: string): Promise<void> =>
      requestVoid('POST', `/api/conversations/${id}/warmup`),
    activeCount: (): Promise<ActiveCountResponse> =>
      request<ActiveCountResponse>('GET', '/api/conversations/active-count'),
    searchMessages: (q: SearchMessagesQuery): Promise<PaginatedResult<Message>> =>
      request<PaginatedResult<Message>>('GET', '/api/messages/search', q),
    // Ops
    sideQuestion: (id: string, req: SideQuestionRequest): Promise<SideQuestionResponse> =>
      request<SideQuestionResponse>('POST', `/api/conversations/${id}/side-question`, req),
    slashCommands: (id: string): Promise<SlashCommandItem[]> =>
      request<SlashCommandItem[]>('GET', `/api/conversations/${id}/slash-commands`),
    getMode: (id: string): Promise<AgentModeResponse> =>
      request<AgentModeResponse>('GET', `/api/conversations/${id}/mode`),
    setMode: (id: string, req: SetModeRequest): Promise<AgentModeResponse> =>
      request<AgentModeResponse>('PUT', `/api/conversations/${id}/mode`, req),
    getModel: (id: string): Promise<GetModelInfoResponse> =>
      request<GetModelInfoResponse>('GET', `/api/conversations/${id}/model`),
    setModel: (id: string, req: SetModelRequest): Promise<GetModelInfoResponse> =>
      request<GetModelInfoResponse>('PUT', `/api/conversations/${id}/model`, req),
    artifacts: {
      list: (convId: string): Promise<ConversationArtifactListResponse> =>
        request<ConversationArtifactListResponse>('GET', `/api/conversations/${convId}/artifacts`),
      update: (convId: string, artId: string, req: UpdateConversationArtifactRequest): Promise<void> =>
        requestVoid('PATCH', `/api/conversations/${convId}/artifacts/${artId}`, req),
    },
    listConfirmations: (id: string): Promise<ConfirmationListResponse> =>
      request<ConfirmationListResponse>('GET', `/api/conversations/${id}/confirmations`),
    confirm: (id: string, callId: string, req: ConfirmRequest): Promise<void> =>
      requestVoid('POST', `/api/conversations/${id}/confirmations/${callId}/confirm`, req),
    checkApproval: (id: string, q: ApprovalCheckQuery): Promise<ApprovalCheckResponse> =>
      request<ApprovalCheckResponse>('GET', `/api/conversations/${id}/approvals/check`, q),
    clone: (req: CloneConversationRequest): Promise<Conversation> =>
      request<Conversation>('POST', '/api/conversations/clone', req),
  },

  // ── MCP ──
  mcp: {
    listServers: (): Promise<McpServerResponse[]> =>
      request<McpServerResponse[]>('GET', '/api/mcp/servers'),
    addServer: (req: CreateMcpServerRequest): Promise<McpServerResponse> =>
      request<McpServerResponse>('POST', '/api/mcp/servers', req),
    importServers: (req: BatchImportMcpServersRequest): Promise<McpServerResponse[]> =>
      request<McpServerResponse[]>('POST', '/api/mcp/servers/import', req),
    getServer: (id: string | number): Promise<McpServerResponse> =>
      request<McpServerResponse>('GET', `/api/mcp/servers/${id}`),
    editServer: (id: string | number, req: UpdateMcpServerRequest): Promise<McpServerResponse> =>
      request<McpServerResponse>('PUT', `/api/mcp/servers/${id}`, req),
    deleteServer: (id: string | number): Promise<void> =>
      requestVoid('DELETE', `/api/mcp/servers/${id}`),
    toggleServer: (id: string | number): Promise<McpServerResponse> =>
      request<McpServerResponse>('POST', `/api/mcp/servers/${id}/toggle`),
    testConnection: (req: TestMcpConnectionRequest): Promise<void> =>
      requestVoid('POST', '/api/mcp/test-connection', req),
    getAgentConfigs: (): Promise<DetectedMcpServerResponse[]> =>
      request<DetectedMcpServerResponse[]>('GET', '/api/mcp/agent-configs'),
    // OAuth
    oauthCheckStatus: (req: OAuthCheckStatusRequest): Promise<OAuthStatusResponse> =>
      request<OAuthStatusResponse>('POST', '/api/mcp/oauth/check-status', req),
    oauthLogin: (req: OAuthLoginRequest): Promise<OAuthLoginResponse> =>
      request<OAuthLoginResponse>('POST', '/api/mcp/oauth/login', req),
    oauthLogout: (req: OAuthLogoutRequest): Promise<void> =>
      requestVoid('POST', '/api/mcp/oauth/logout', req),
    oauthAuthenticated: (): Promise<OAuthStatusResponse[]> =>
      request<OAuthStatusResponse[]>('GET', '/api/mcp/oauth/authenticated'),
  },

  // ── File System ──
  files: {
    browse: (path?: string): Promise<DirOrFileResponse> =>
      request<DirOrFileResponse>('GET', `/api/fs/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    getDir: (req: GetFilesByDirRequest): Promise<DirOrFileResponse> =>
      request<DirOrFileResponse>('POST', '/api/fs/dir', req),
    listWorkspace: (req: ListWorkspaceFilesRequest): Promise<WorkspaceFlatFileResponse> =>
      request<WorkspaceFlatFileResponse>('POST', '/api/fs/list', req),
    metadata: (req: GetFileMetadataRequest): Promise<FileMetadataResponse> =>
      request<FileMetadataResponse>('POST', '/api/fs/metadata', req),
    read: (req: ReadFileRequest): Promise<string> =>
      request<string>('POST', '/api/fs/read', req),
    write: (req: WriteFileRequest): Promise<void> =>
      requestVoid('POST', '/api/fs/write', req),
    upload: (formData: FormData): Promise<unknown> =>
      uploadFile('/api/fs/upload', formData),
    copy: (req: CopyFilesRequest): Promise<CopyFilesResponse> =>
      request<CopyFilesResponse>('POST', '/api/fs/copy', req),
    remove: (req: RemoveEntryRequest): Promise<void> =>
      requestVoid('POST', '/api/fs/remove', req),
    rename: (req: RenameRequest): Promise<RenameResponse> =>
      request<RenameResponse>('POST', '/api/fs/rename', req),
    imageBase64: (req: GetImageBase64Request): Promise<string> =>
      request<string>('POST', '/api/fs/image-base64', req),
    fetchRemoteImage: (req: FetchRemoteImageRequest): Promise<string> =>
      request<string>('POST', '/api/fs/fetch-remote-image', req),
    watch: {
      start: (req: FileWatchRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/watch/start', req),
      stop: (): Promise<void> =>
        requestVoid('POST', '/api/fs/watch/stop'),
      stopAll: (): Promise<void> =>
        requestVoid('POST', '/api/fs/watch/stop-all'),
    },
    snapshot: {
      init: (req: SnapshotBaselineRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/init', req),
      info: (req: SnapshotBaselineRequest): Promise<SnapshotInfoResponse> =>
        request<SnapshotInfoResponse>('POST', '/api/fs/snapshot/info', req),
      compare: (): Promise<SnapshotCompareResponse> =>
        request<SnapshotCompareResponse>('POST', '/api/fs/snapshot/compare'),
      baseline: (req: SnapshotBaselineRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/baseline', req),
      stage: (req: SnapshotStageRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/stage', req),
      discard: (req: SnapshotDiscardRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/discard', req),
      reset: (): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/reset'),
      branches: (): Promise<string[]> =>
        request<string[]>('POST', '/api/fs/snapshot/branches'),
      dispose: (): Promise<void> =>
        requestVoid('POST', '/api/fs/snapshot/dispose'),
    },
    zip: {
      create: (req: ZipRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/zip', req),
      cancel: (req: CancelZipRequest): Promise<void> =>
        requestVoid('POST', '/api/fs/zip/cancel', req),
    },
  },

  // ── Cron ──
  cron: {
    listJobs: (q?: ListCronJobsQuery): Promise<CronJobResponse[]> =>
      request<CronJobResponse[]>('GET', '/api/cron/jobs', q),
    createJob: (req: CreateCronJobRequest): Promise<CronJobResponse> =>
      request<CronJobResponse>('POST', '/api/cron/jobs', req),
    getJob: (id: string): Promise<CronJobResponse> =>
      request<CronJobResponse>('GET', `/api/cron/jobs/${id}`),
    updateJob: (id: string, req: UpdateCronJobRequest): Promise<CronJobResponse> =>
      request<CronJobResponse>('PUT', `/api/cron/jobs/${id}`, req),
    deleteJob: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/cron/jobs/${id}`),
    runNow: (id: string): Promise<RunNowResponse> =>
      request<RunNowResponse>('POST', `/api/cron/jobs/${id}/run`),
    saveSkill: (req: SaveCronSkillRequest): Promise<void> =>
      requestVoid('POST', '/api/cron/skills', req),
    hasSkill: (id: string): Promise<HasSkillResponse> =>
      request<HasSkillResponse>('GET', `/api/cron/skills/has/${id}`),
  },

  // ── Channel ──
  channels: {
    getPlugins: (): Promise<PluginStatusResponse[]> =>
      request<PluginStatusResponse[]>('GET', '/api/channel/plugins'),
    enablePlugin: (req: EnablePluginRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/plugins/enable', req),
    disablePlugin: (req: DisablePluginRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/plugins/disable', req),
    testPlugin: (req: TestPluginRequest): Promise<TestPluginResponse> =>
      request<TestPluginResponse>('POST', '/api/channel/plugins/test', req),
    getPairings: (): Promise<PairingRequestResponse[]> =>
      request<PairingRequestResponse[]>('GET', '/api/channel/pairings'),
    approvePairing: (req: ApprovePairingRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/pairings/approve', req),
    rejectPairing: (req: RejectPairingRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/pairings/reject', req),
    getUsers: (): Promise<ChannelUserResponse[]> =>
      request<ChannelUserResponse[]>('GET', '/api/channel/users'),
    revokeUser: (req: RevokeUserRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/users/revoke', req),
    getSessions: (): Promise<ChannelSessionResponse[]> =>
      request<ChannelSessionResponse[]>('GET', '/api/channel/sessions'),
    getBridges: (): Promise<BridgeResponse[]> =>
      request<BridgeResponse[]>('GET', '/api/channel/bridges'),
    syncSettings: (req: SyncChannelSettingsRequest): Promise<void> =>
      requestVoid('POST', '/api/channel/settings/sync', req),
  },

  // ── Agent ──
  agents: {
    list: (): Promise<AgentMetadata[]> =>
      request<AgentMetadata[]>('GET', '/api/agents'),
    refresh: (): Promise<AgentMetadata[]> =>
      request<AgentMetadata[]>('POST', '/api/agents/refresh'),
    healthCheck: (req: AcpHealthCheckRequest): Promise<AcpHealthCheckResponse> =>
      request<AcpHealthCheckResponse>('POST', '/api/agents/health-check', req),
    providerHealthCheck: (req: ProviderHealthCheckRequest): Promise<ProviderHealthCheckResponse> =>
      request<ProviderHealthCheckResponse>('POST', '/api/agents/provider-health-check', req),
    setEnabled: (id: string, req: SetEnabledRequest): Promise<void> =>
      requestVoid('PATCH', `/api/agents/${id}/enabled`, req),
    createCustom: (req: CustomAgentUpsertRequest): Promise<AgentMetadata> =>
      request<AgentMetadata>('POST', '/api/agents/custom', req),
    updateCustom: (id: string, req: CustomAgentUpsertRequest): Promise<AgentMetadata> =>
      request<AgentMetadata>('PUT', `/api/agents/custom/${id}`, req),
    deleteCustom: (id: string): Promise<DeleteCustomAgentResponse> =>
      request<DeleteCustomAgentResponse>('DELETE', `/api/agents/custom/${id}`),
  },

  // ── Remote Agent ──
  remoteAgents: {
    list: (): Promise<RemoteAgentListItem[]> =>
      request<RemoteAgentListItem[]>('GET', '/api/remote-agents'),
    create: (req: CreateRemoteAgentRequest): Promise<RemoteAgentResponse> =>
      request<RemoteAgentResponse>('POST', '/api/remote-agents', req),
    get: (id: string): Promise<RemoteAgentResponse> =>
      request<RemoteAgentResponse>('GET', `/api/remote-agents/${id}`),
    update: (id: string, req: UpdateRemoteAgentRequest): Promise<RemoteAgentResponse> =>
      request<RemoteAgentResponse>('PUT', `/api/remote-agents/${id}`, req),
    delete: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/remote-agents/${id}`),
    testConnection: (req: TestRemoteAgentConnectionRequest): Promise<void> =>
      requestVoid('POST', '/api/remote-agents/test-connection', req),
    handshake: (id: string): Promise<HandshakeResponse> =>
      request<HandshakeResponse>('POST', `/api/remote-agents/${id}/handshake`),
  },

  // ── Team ──
  teams: {
    list: (): Promise<TeamListResponse> =>
      request<TeamListResponse>('GET', '/api/teams'),
    create: (req: CreateTeamRequest): Promise<TeamResponse> =>
      request<TeamResponse>('POST', '/api/teams', req),
    get: (id: string): Promise<TeamResponse> =>
      request<TeamResponse>('GET', `/api/teams/${id}`),
    remove: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/teams/${id}`),
    rename: (id: string, req: RenameTeamRequest): Promise<void> =>
      requestVoid('PATCH', `/api/teams/${id}/name`, req),
    addAgent: (teamId: string, req: AddAgentRequest): Promise<TeamAgentResponse> =>
      request<TeamAgentResponse>('POST', `/api/teams/${teamId}/agents`, req),
    removeAgent: (teamId: string, slotId: number): Promise<void> =>
      requestVoid('DELETE', `/api/teams/${teamId}/agents/${slotId}`),
    renameAgent: (teamId: string, slotId: number, req: RenameAgentRequest): Promise<void> =>
      requestVoid('PATCH', `/api/teams/${teamId}/agents/${slotId}/name`, req),
    sendMessage: (teamId: string, req: SendTeamMessageRequest): Promise<Message> =>
      request<Message>('POST', `/api/teams/${teamId}/messages`, req),
  },

  // ── Extension ──
  extensions: {
    list: (): Promise<ExtensionSummaryResponse[]> =>
      request<ExtensionSummaryResponse[]>('GET', '/api/extensions'),
    enable: (req: EnableExtensionRequest): Promise<void> =>
      requestVoid('POST', '/api/extensions/enable', req),
    disable: (req: DisableExtensionRequest): Promise<void> =>
      requestVoid('POST', '/api/extensions/disable', req),
  },

  // ── Hub ──
  hub: {
    list: (): Promise<unknown[]> =>
      request<unknown[]>('GET', '/api/hub'),
    install: (pkg: string): Promise<void> =>
      requestVoid('POST', `/api/hub/install`, { pkg }),
  },

  // ── Skills ──
  skills: {
    list: (): Promise<unknown[]> =>
      request<unknown[]>('GET', '/api/skills'),
    delete: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/skills/${id}`),
  },

  // ── Assistant ──
  assistants: {
    list: (): Promise<AssistantResponse[]> =>
      request<AssistantResponse[]>('GET', '/api/assistants'),
    create: (req: CreateAssistantRequest): Promise<AssistantResponse> =>
      request<AssistantResponse>('POST', '/api/assistants', req),
    update: (id: string, req: UpdateAssistantRequest): Promise<AssistantResponse> =>
      request<AssistantResponse>('PUT', `/api/assistants/${id}`, req),
    delete: (id: string): Promise<void> =>
      requestVoid('DELETE', `/api/assistants/${id}`),
    setState: (id: string, req: SetAssistantStateRequest): Promise<void> =>
      requestVoid('PATCH', `/api/assistants/${id}/state`, req),
    import_: (req: ImportAssistantsRequest): Promise<ImportAssistantsResult> =>
      request<ImportAssistantsResult>('POST', '/api/assistants/import', req),
  },

  // ── Shell ──
  shell: {
    openFile: (req: OpenFileRequest): Promise<void> =>
      requestVoid('POST', '/api/shell/open-file', req),
    showInFolder: (req: ShowItemInFolderRequest): Promise<void> =>
      requestVoid('POST', '/api/shell/show-item-in-folder', req),
    openExternal: (req: OpenExternalRequest): Promise<void> =>
      requestVoid('POST', '/api/shell/open-external', req),
    checkTool: (req: CheckToolInstalledRequest): Promise<CheckToolInstalledResponse> =>
      request<CheckToolInstalledResponse>('POST', '/api/shell/check-tool-installed', req),
    openFolderWith: (req: OpenFolderWithRequest): Promise<void> =>
      requestVoid('POST', '/api/shell/open-folder-with', req),
  },

  // ── Office ──
  office: {
    startWordPreview: (req: StartPreviewRequest): Promise<PreviewUrlResponse> =>
      request<PreviewUrlResponse>('POST', '/api/word-preview/start', req),
    stopWordPreview: (req: StopPreviewRequest): Promise<void> =>
      requestVoid('POST', '/api/word-preview/stop', req),
    startExcelPreview: (req: StartPreviewRequest): Promise<PreviewUrlResponse> =>
      request<PreviewUrlResponse>('POST', '/api/excel-preview/start', req),
    stopExcelPreview: (req: StopPreviewRequest): Promise<void> =>
      requestVoid('POST', '/api/excel-preview/stop', req),
    startPptPreview: (req: StartPreviewRequest): Promise<PreviewUrlResponse> =>
      request<PreviewUrlResponse>('POST', '/api/ppt-preview/start', req),
    stopPptPreview: (req: StopPreviewRequest): Promise<void> =>
      requestVoid('POST', '/api/ppt-preview/stop', req),
    conversion: (req: DocumentConversionRequest): Promise<void> =>
      requestVoid('POST', '/api/office/conversion', req),
    snapshot: {
      list: (req: { path: string }): Promise<PreviewSnapshotInfoDto[]> =>
        request<PreviewSnapshotInfoDto[]>('POST', '/api/office/snapshot/list', req),
      save: (req: SaveSnapshotRequest): Promise<void> =>
        requestVoid('POST', '/api/office/snapshot/save', req),
    },
    detectStarOffice: (req: DetectStarOfficeRequest): Promise<StarOfficeDetectResponse> =>
      request<StarOfficeDetectResponse>('POST', '/api/office/detect-staroffice', req),
  },
};
