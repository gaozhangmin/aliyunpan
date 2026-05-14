function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeName(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

function currentItemId(item) {
  return item.file_id || item.fileId
}

function planItemError(index, field) {
  return `items[${index}].${field} is required`
}

export function validateRenamePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') {
    return { ok: false, errors: ['plan must be an object'], itemCount: 0 }
  }
  if (plan.version !== 1) errors.push('version must be 1')
  if (plan.operation !== 'rename') errors.push('operation must be rename')
  if (!hasText(plan.provider)) errors.push('provider is required')
  if (!hasText(plan.account_id)) errors.push('account_id is required')
  if (!Array.isArray(plan.items) || plan.items.length === 0) {
    errors.push('items must be a non-empty array')
  } else {
    plan.items.forEach((item, index) => {
      if (!hasText(item?.drive_id)) errors.push(planItemError(index, 'drive_id'))
      if (!hasText(item?.file_id)) errors.push(planItemError(index, 'file_id'))
      if (!hasText(item?.parent_file_id)) errors.push(planItemError(index, 'parent_file_id'))
      if (!hasText(item?.old_name)) errors.push(planItemError(index, 'old_name'))
      if (!hasText(item?.new_name)) errors.push(planItemError(index, 'new_name'))
    })
  }
  return {
    ok: errors.length === 0,
    errors,
    itemCount: Array.isArray(plan?.items) ? plan.items.length : 0,
  }
}

export function dryRunRenamePlan(plan, currentItems = []) {
  const validation = validateRenamePlan(plan)
  const errors = validation.errors.map((message) => ({ code: 'invalid_plan', message }))
  if (!validation.ok) return { ok: false, changes: [], errors }

  const currentById = new Map(currentItems.map((item) => [currentItemId(item), item]))
  const targetByParent = new Map()
  const changes = []

  plan.items.forEach((item) => {
    const current = currentById.get(item.file_id)
    if (current && current.name !== item.old_name) {
      errors.push({
        code: 'remote_name_mismatch',
        file_id: item.file_id,
        message: `Remote name mismatch for ${item.file_id}: expected ${item.old_name}, found ${current.name}`,
      })
      return
    }

    const parentKey = item.parent_file_id
    const targetKey = normalizeName(item.new_name)
    const seenTargets = targetByParent.get(parentKey) || new Set()
    if (seenTargets.has(targetKey)) {
      errors.push({
        code: 'duplicate_target_name',
        file_id: item.file_id,
        message: `Duplicate target name in parent ${parentKey}: ${targetKey}`,
      })
      return
    }
    seenTargets.add(targetKey)
    targetByParent.set(parentKey, seenTargets)

    if (item.old_name !== item.new_name) {
      changes.push({
        drive_id: item.drive_id,
        file_id: item.file_id,
        parent_file_id: item.parent_file_id,
        before_name: item.old_name,
        after_name: item.new_name,
      })
    }
  })

  return {
    ok: errors.length === 0,
    changes: errors.length === 0 ? changes : [],
    errors,
  }
}
