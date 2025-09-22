<script setup lang="ts">
import { ref } from 'vue'
import { modalCloseAll } from '../utils/modal'
import message from '../utils/message'
import AliUser from '../aliapi/user'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  user_id: {
    type: String,
    required: true
  }
})

let resultList: any[] = []
const okLoading = ref(false)
const giftCodeText = ref('')

const handleHide = () => {
  modalCloseAll()
}

const handleClose = () => {
  okLoading.value = false
  giftCodeText.value = ''
  resultList = []
}

const handleUserRewardSpace = async () => {
  const text = giftCodeText.value
  if (!text) {
    message.error('请先粘贴要导入的福利码！')
    return
  }
  okLoading.value = true
  const codeList: string[] = []
  text.split('\n').forEach((code: string) => {
    if (code.length > 0) {
      codeList.push(code.trim())
    }
  })
  if (codeList.length == 0) {
    message.error('解析福利码失败，格式错误')
    return
  }
  // 批量执行func
  const func = (code: string) => AliUser.ApiUserRewardSpace(props.user_id, code)
  const successList: any = []
  const failList: any = []
  resultList = []
  await Promise.allSettled(codeList.map(code => func(code)))
    .then((results) => {
      results.forEach((result: any, index) => {
        let { status, message } = result.value
        let code = codeList[index]
        if (status) {
          successList.push(code)
        } else {
          failList.push(codeList[index])
        }
        resultList.push({ code, status: status ? '兑换成功' : '兑换失败', message })
      })
    })
  message.info('福利码兑换完成：' + successList.length + '个，失败：' + failList.length + '个')
  okLoading.value = false
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass'
           :footer='false' :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @close='handleClose'>
    <template #title>
      <span class='modaltitle'>福利码兑换（支持批量兑换）</span>
    </template>
    <div style='width: 500px'>
      <div style="margin-bottom: 32px">
        <div class="arco-textarea-wrapper arco-textarea-scroll">
          <textarea v-model.trim="giftCodeText"
                    class="arco-textarea input"
                    placeholder="请粘贴，每行一个福利码，例如：12345678">
          </textarea>
        </div>
        <div>
          <span class="oporg">注：福利码可以通过网络查找，可以增加容量和会员天数</span>
        </div>
        <a-collapse :bordered="false" v-if="!okLoading && resultList.length > 0">
          <a-collapse-item class='content' header="执行结果" key="1">
            <div style="height: 100%">
              <a-table table-layout-fixed stripe
                       :pagination='false'
                       :data="resultList"
                       :scroll="{ y: 100 }"
                       :bordered="{wrapper: true, cell: true}"
                       :size="'small'">
                <template #columns>
                  <a-table-column title="福利码" align="center" :width="180" dataIndex="code" key="code"></a-table-column>
                  <a-table-column title="状态" align="center" :width="100" dataIndex="status" key="status"></a-table-column>
                  <a-table-column title="信息" align="center" :width="180" dataIndex="message" key="message"></a-table-column>
                </template>
              </a-table>
            </div>
          </a-collapse-item>
        </a-collapse>
      </div>
      <div class="flex" style="justify-content: center; align-items: center; margin-bottom: 0">
        <a-button type="primary" size="small" tabindex="-1" :loading="okLoading" @click="handleUserRewardSpace">福利码兑换
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style lang="less" scoped>
.input {
  white-space: nowrap;
  word-break: keep-all;
  overflow: auto;
  height: 228px !important;
  resize: none !important;
}

.content :deep(.arco-collapse-item-content) {
  padding: 5px;
}
</style>