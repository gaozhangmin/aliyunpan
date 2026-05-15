function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function planItemError(index, field) {
  return `items[${index}].${field} is required`
}

export function validateMovePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') {
    return { ok: false, errors: ['plan must be an object'], itemCount: 0 }
  }
  if (plan.version !== 1) errors.push('version must be 1')
  if (plan.operation !== 'move') errors.push('operation must be move')
  if (!hasText(plan.provider)) errors.push('provider is required')
  if (!hasText(plan.account_id)) errors.push('account_id is required')
  if (!Array.isArray(plan.items) || plan.items.length === 0) {
    errors.push('items must be a non-empty array')
  } else {
    plan.items.forEach((item, index) => {
      if (!hasText(item?.file_id)) errors.push(planItemError(index, 'file_id'))
      if (!hasText(item?.name)) errors.push(planItemError(index, 'name'))
      if (!hasText(item?.from_parent_file_id)) errors.push(planItemError(index, 'from_parent_file_id'))
      if (!hasText(item?.to_parent_file_id)) errors.push(planItemError(index, 'to_parent_file_id'))
    })
  }
  return {
    ok: errors.length === 0,
    errors,
    itemCount: Array.isArray(plan?.items) ? plan.items.length : 0,
  }
}

export function dryRunMovePlan(plan) {
  const validation = validateMovePlan(plan)
  const errors = validation.errors.map((message) => ({ code: 'invalid_plan', message }))
  if (!validation.ok) return { ok: false, changes: [], errors }

  const destinationKeys = new Set()
  const changes = []

  plan.items.forEach((item) => {
    const destKey = `${item.to_parent_file_id}/${(item.name || '').toLowerCase()}`
    if (destinationKeys.has(destKey)) {
      errors.push({
        code: 'duplicate_destination',
        file_id: item.file_id,
        message: `Duplicate destination in parent ${item.to_parent_file_id}: ${item.name}`,
      })
      return
    }
    destinationKeys.add(destKey)

    if (item.from_parent_file_id !== item.to_parent_file_id) {
      changes.push({
        drive_id: item.drive_id || '',
        file_id: item.file_id,
        name: item.name,
        type: item.type || 'file',
        from_parent_file_id: item.from_parent_file_id,
        to_parent_file_id: item.to_parent_file_id,
      })
    }
  })

  return {
    ok: errors.length === 0,
    changes: errors.length === 0 ? changes : [],
    errors,
  }
}
