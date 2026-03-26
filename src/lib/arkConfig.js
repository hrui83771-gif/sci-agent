const LEGACY_ARK_CONFIG = {
  apiKey: 'e49d4768-d46b-4cd3-ae83-c38a92f1bebb',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  defaultChatModel: 'doubao-1-5-vision-pro-32k-250115',
  visionModel: 'doubao-1-5-vision-pro-32k-250115',
  videoModel: 'doubao-seedance-1-5-pro-251215',
  videoImageUrl: '',
  filePurpose: 'assistants'
}

export function getArkClientConfig(env = {}) {
  const apiKey = String(env.VITE_ARK_API_KEY || LEGACY_ARK_CONFIG.apiKey || '').trim()
  const baseUrl = String(env.VITE_ARK_BASE_URL || LEGACY_ARK_CONFIG.baseUrl).trim()
  const rawFilePurpose = String(env.VITE_ARK_FILE_PURPOSE || LEGACY_ARK_CONFIG.filePurpose || '').trim().toLowerCase()
  const filePurpose = rawFilePurpose === 'assistants' ? 'user_data' : (rawFilePurpose || 'user_data')

  return {
    enabled: Boolean(apiKey),
    apiKey,
    baseUrl,
    defaultChatModel: env.VITE_ARK_MODEL || LEGACY_ARK_CONFIG.defaultChatModel,
    visionModel: env.VITE_ARK_VISION_MODEL || LEGACY_ARK_CONFIG.visionModel,
    videoModel: env.VITE_ARK_VIDEO_MODEL || LEGACY_ARK_CONFIG.videoModel,
    videoImageUrl: env.VITE_ARK_IMAGE_URL || LEGACY_ARK_CONFIG.videoImageUrl,
    filePurpose
  }
}

export { LEGACY_ARK_CONFIG }
