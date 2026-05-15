function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function planItemError(index, field) {
  return `items[${index}].${field} is required`
}

export function validateTrashPlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') {
    return { ok: false, errors: ['plan must be an object'], itemCount: 0 }
  }
  if (plan.version !== 1) errors.push('version must be 1')
  if (plan.operation !== 'trash') errors.push('operation must be trash')
  if (!hasText(plan.provider)) errors.push('provider is required')
  if (!hasText(plan.account_id)) errors.push('account_id is required')
  if (!Array.isArray(plan.items) || plan.items.length === 0) {
    errors.push('items must be a non-empty array')
  } else {
    plan.items.forEach((item, index) => {
      if (!hasText(item?.file_id)) errors.push(planItemError(index, 'file_id'))
      if (!hasText(item?.name)) errors.push(planItemError(index, 'name'))
    })
  }
  return {
    ok: errors.length === 0,
    errors,
    itemCount: Array.isArray(plan?.items) ? plan.items.length : 0,
  }
}

export function dryRunTrashPlan(plan) {
  const validation = validateTrashPlan(plan)
  const errors = validation.errors.map((message) => ({ code: 'invalid_plan', message }))
  if (!validation.ok) return { ok: false, items: [], errors }

  const changes = plan.items.map((item) => ({
    drive_id: item.drive_id || '',
    file_id: item.file_id,
    name: item.name,
    type: item.type || 'file',
    parent_file_id: item.parent_file_id || '',
    path: item.path || '',
  }))

  return { ok: true, items: changes, errors: [] }
}
