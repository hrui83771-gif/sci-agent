import { quickAssistantPrompt } from './quickAssistant.js'

export function getQuickAssistantPrompt(locale = 'zh') {
  return quickAssistantPrompt.locales[locale] || quickAssistantPrompt.locales.zh
}
