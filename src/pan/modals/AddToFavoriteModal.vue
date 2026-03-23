<template>
  <a-modal
    v-model:visible="showModal"
    :title="isEditMode ? '编辑收藏名称' : '添加到收藏夹'"
    :width="400"
    :footer="false"
    @cancel="handleCancel"
    modal-class="modal-class"
    @keydown.esc="handleCancel"
    @keydown.enter="handleConfirm">
    <div class="add-to-favorite-modal">
      <div class="form-item">
        <label class="form-label">收藏名称:</label>
        <a-input
          ref="inputRef"
          v-model="favoriteName"
          placeholder="请输入收藏名称"
          size="large"
          @keydown.enter="handleConfirm"
          @keydown.esc="handleCancel"
        />
      </div>
      <div class="form-actions">
        <a-button size="large" @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          size="large"
          :disabled="!favoriteName.trim()"
          @click="handleConfirm"
        >
          {{ isEditMode ? '保存' : '添加' }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang='ts'>
import { ref, watch, nextTick, computed } from 'vue'
import { useModalStore } from '../../store'
import { FavoritesManager } from '../../utils/favorites'
import usePanTreeStore from '../../pan/pantreestore'
import message from '../../utils/message'

const modalStore = useModalStore()
const panTreeStore = usePanTreeStore()
const show = computed(() => modalStore.modalName === 'addtofavorite')
const modalData = computed(() => modalStore.modalData)

const showModal = ref(false)
const favoriteName = ref('')
const inputRef = ref()
const isEditMode = ref(false)
const editingId = ref('')

watch(show, async (newVal) => {
  if (newVal && modalData.value) {
    const { file_id, file_name, drive_id } = modalData.value

    // 检查是否已经是收藏状态
    const allFavorites = FavoritesManager.getAllFavorites()
    const existingFavorite = allFavorites.find(
      item => item.file_id === file_id && item.drive_id === drive_id
    )

    if (existingFavorite) {
      // 如果已经是收藏状态，进入编辑模式
      isEditMode.value = true
      editingId.value = existingFavorite.id
      favoriteName.value = existingFavorite.name
    } else {
      // 否则进入添加模式
      isEditMode.value = false
      editingId.value = ''
      favoriteName.value = file_name || ''
    }

    showModal.value = true
    await nextTick()
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  } else {
    showModal.value = false
  }
})

const handleCancel = () => {
  modalStore.showModal('', {})
}

const handleConfirm = () => {
  if (!favoriteName.value.trim()) return

  const { file_id, file_name, drive_id } = modalData.value

  if (isEditMode.value && editingId.value) {
    // 编辑现有收藏
    if (FavoritesManager.updateFavoriteName(editingId.value, favoriteName.value.trim())) {
      message.success('更新收藏名称成功')
      // 更新收藏夹树
      // panTreeStore.mUpdateFavoriteTree()
      modalStore.showModal('', {})
    } else {
      message.error('更新收藏名称失败')
    }
  } else {
    // 添加新收藏
    const id = FavoritesManager.addFavorite({
      name: favoriteName.value.trim(),
      file_id,
      drive_id,
      original_name: file_name
    })

    if (id) {
      message.success('添加收藏成功')
      // 更新收藏夹树
      // panTreeStore.mUpdateFavoriteTree()
      modalStore.showModal('', {})
    } else {
      message.error('添加收藏失败')
    }
  }
}
</script>

<style lang="less">
.add-to-favorite-modal {
  .form-item {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--color-text-1);
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .arco-input {
    font-size: 14px;
  }

  .arco-btn {
    min-width: 80px;
  }
}
</style>