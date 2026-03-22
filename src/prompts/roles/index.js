import { customerManagerRole } from './customerManager.js'
import { productManagerRole } from './productManager.js'
import { riskManagerRole } from './riskManager.js'

const PROFESSIONAL_ROLES = [
  customerManagerRole,
  productManagerRole,
  riskManagerRole
]

export const DEFAULT_PROFESSIONAL_ROLE = 'customer_manager'

export function getProfessionalRoleOptions(locale = 'zh') {
  return PROFESSIONAL_ROLES.map((role) => ({
    value: role.value,
    ...(role.locales[locale] || role.locales.zh)
  }))
}
