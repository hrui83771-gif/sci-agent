<template>
  <div class="page-container">
    <h2>AI支持</h2>
    <p>获取AI智能分析和建议，帮助您选择合适的农资产品。</p>
    
    <!-- AI功能卡片 -->
    <div class="features-container">
      <el-card shadow="hover" class="feature-card">
        <template #header>
          <div class="feature-header">
            <el-icon class="feature-icon"><ChatDotRound /></el-icon>
            <span>AI智能助手</span>
          </div>
        </template>
        <div class="feature-content">
          <p>与AI助手进行对话，获取实时的农资产品建议和农业知识。</p>
          <el-button type="primary" @click="openAIChat">
            <el-icon><Message /></el-icon>
            开始对话
          </el-button>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="feature-card">
        <template #header>
          <div class="feature-header">
            <el-icon class="feature-icon"><TrendCharts /></el-icon>
            <span>产品推荐</span>
          </div>
        </template>
        <div class="feature-content">
          <p>AI根据您的需求和种植情况，为您推荐最适合的农资产品。</p>
          <el-button type="primary" @click="getProductRecommendations">
            <el-icon><Star /></el-icon>
            获取推荐
          </el-button>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="feature-card">
        <template #header>
          <div class="feature-header">
            <el-icon class="feature-icon"><Warning /></el-icon>
            <span>病虫害识别</span>
          </div>
        </template>
        <div class="feature-content">
          <p>上传作物照片，AI帮助识别病虫害并提供防治建议。</p>
          <el-button type="primary" @click="identifyPests">
            <el-icon><Camera /></el-icon>
            识别病虫害
          </el-button>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="feature-card">
        <template #header>
          <div class="feature-header">
            <el-icon class="feature-icon"><Lightbulb /></el-icon>
            <span>种植建议</span>
          </div>
        </template>
        <div class="feature-content">
          <p>AI根据天气、土壤等数据，为您提供科学的种植建议。</p>
          <el-button type="primary" @click="getPlantingAdvice">
            <el-icon><Reading /></el-icon>
            获取建议
          </el-button>
        </div>
      </el-card>
    </div>
    
    <!-- AI对话区域 -->
    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <span>AI对话助手</span>
          <div class="header-actions">
            <el-button type="default" size="small" @click="clearChat">
              <el-icon><Delete /></el-icon> 清空
            </el-button>
            <el-switch v-model="autoReply" size="small" active-text="自动回复" inactive-text="手动回复" />
          </div>
        </div>
      </template>
      <div class="card-content">
        <div class="chat-container">
          <div class="chat-messages" ref="chatMessages">
            <!-- 所有消息，根据role属性区分 -->
            <div v-for="(message, index) in messages" :key="index" :class="['message', message.role === 'user' ? 'user-message' : 'bot-message']">
              <div class="message-avatar">
                <el-icon v-if="message.role === 'user'"><User /></el-icon>
                <el-icon v-else><ChatDotRound /></el-icon>
              </div>
              <div class="message-content">
                <!-- 文本内容 -->
                <div v-if="message.content" class="message-text-container">
                  <div class="message-text" v-html="message.content"></div>
                  <el-button 
                    v-if="message.role === 'assistant'" 
                    type="text" 
                    size="small" 
                    @click="copyMessageContent(message.content)"
                    class="copy-message-btn"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                    复制
                  </el-button>
                </div>
                
                <!-- 图片内容 -->
                <div v-if="message.images && message.images.length > 0" class="message-media">
                  <el-image
                    v-for="(image, imgIndex) in message.images"
                    :key="'img-' + index + '-' + imgIndex"
                    :src="image"
                    :preview-src-list="message.images"
                    fit="cover"
                    class="message-image"
                  ></el-image>
                </div>
                
                <!-- Token用量显示（如果有） -->
                <div v-if="message.usage" class="token-usage">
                  <span>Token用量: 总 {{ message.usage.total_tokens }} | 提示 {{ message.usage.prompt_tokens }} | 完成 {{ message.usage.completion_tokens }}</span>
                </div>
                
                <div class="message-time">{{ message.time }}</div>
              </div>
            </div>
            
            <!-- 加载中动画 -->
            <div v-if="loading" class="message bot-message">
              <div class="message-avatar">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="message-content">
                <div class="loading-indicator">
                  <el-icon class="loading-icon"><Loading /></el-icon>
                  <span>正在思考中...</span>
                </div>
                <div class="message-time">{{ new Date().toLocaleTimeString() }}</div>
              </div>
            </div>
          </div>
          
          <!-- 输入区域 -->
            <div class="chat-input-area">
              <!-- 多模态输入工具栏 - 紧凑布局 -->
              <div class="input-toolbar-compact">
                <div class="upload-wrapper">
                  <el-button
                    type="default"
                    @click="toggleImageUpload"
                    class="upload-btn"
                  >
                    <el-icon><Plus /></el-icon>
                    <span>上传图片</span>
                  </el-button>
                  
                  <!-- 图片上传组件 - 折叠式 -->
                  <div v-if="showImageUpload" class="upload-panel">
                    <el-upload
                      action=""
                      :http-request="handleImageUpload"
                      list-type="picture-card"
                      :limit="1"
                      :on-exceed="handleExceed"
                      accept="image/*"
                      :class="['compact-upload']"
                    >
                      <el-icon><Plus /></el-icon>
                      <template #tip>
                        <div class="el-upload__tip">
                          支持上传 JPG、PNG 等格式图片，最多上传 1 张
                        </div>
                      </template>
                    </el-upload>
                  </div>
                </div>
              </div>
              
              <!-- 已上传媒体预览 -->
              <div v-if="uploadedImages.length > 0" class="media-preview-compact">
                <div class="preview-list-compact">
                  <div v-for="(image, index) in uploadedImages" :key="'img-' + index" class="preview-item-small">
                    <el-image
                      :src="image.url"
                      :preview-src-list="uploadedImages.map(img => img.url)"
                      fit="cover"
                      class="preview-image-small"
                    ></el-image>
                    <el-button
                      type="danger"
                      size="mini"
                      @click="removeMedia('image', index)"
                      class="remove-btn-small"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 文本输入和发送按钮 -->
              <div class="input-wrapper">
                <el-input
                  v-model="inputMessage"
                  placeholder="请输入您的问题..."
                  type="textarea"
                  :rows="3"
                  resize="vertical"
                  @keyup.enter.ctrl="sendMessage"
                ></el-input>
                <!-- 发送按钮 -->
                <el-button 
                  type="primary" 
                  @click="sendMessage" 
                  :loading="sending"
                  class="send-btn"
                >
                  <el-icon><PaperPlane /></el-icon>
                  发送
                </el-button>
              </div>
              
              <div class="input-hint">
                <span>按 Ctrl + Enter 发送消息</span>
              </div>
            </div>
        </div>
      </div>
    </el-card>
    
    <!-- AI创作 -->
    <el-card shadow="hover" class="content-card">
      <template #header>
        <div class="card-header">
          <span>AI创作</span>
          <span class="beta-tag">内测开放</span>
        </div>
      </template>
      <div class="card-content">
        <div class="report-container">
          <!-- 左侧：图片生成 -->
          <div class="report-item">
            <div class="report-title">
              <el-icon><Picture /></el-icon>
              <span>图片生成</span>
            </div>
            <div class="report-summary">
              <p>使用AI模型生成高质量农资宣传图片，提升产品展示效果。</p>
              <div class="model-info">
                <el-tag type="success">doubao-seedream-4-5-251128</el-tag>
              </div>
            </div>
            <div class="report-actions">
              <el-button type="primary" size="small" @click="openImageGenerationDialog">图片生成</el-button>
            </div>
          </div>
          
          <!-- 右侧：视频生成 -->
          <div class="report-item">
            <div class="report-title">
              <el-icon><VideoPlay /></el-icon>
              <span>视频生成</span>
            </div>
            <div class="report-summary">
              <p>使用AI模型生成农资产品宣传视频，增强品牌传播力。</p>
              <div class="model-info">
                <el-tag type="success">doubao-seedance-1-0-lite-t2v-250428</el-tag>
              </div>
            </div>
            <div class="report-actions">
              <el-button type="primary" size="small" @click="openVideoGenerationDialog">视频生成</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 技术支持信息 -->
    <div class="tech-support">
      <el-divider></el-divider>
      <div class="support-info">
        <span>技术支持：</span>
        <el-tag type="info">火山引擎</el-tag>
        <span class="model-info">使用模型：</span>
        <el-tag type="success">{{ doubaoApi.model }}</el-tag>
      </div>
    </div>
    
    <!-- 图片生成对话框 -->
    <el-dialog
      v-model="showImageGenerationDialog"
      title="AI图片生成"
      width="800px"
      center
    >
      <div class="image-generation-dialog">
        <!-- 提示词输入 -->
        <div class="prompt-section">
          <el-form label-position="top" label-width="80px">
            <el-form-item label="生成提示词">
              <el-input
                v-model="imageGenerationPrompt"
                type="textarea"
                :rows="4"
                placeholder="请输入图片生成提示词，例如：'高质量农资宣传图片，展示绿色有机肥料，背景是农田'"
                resize="vertical"
              ></el-input>
            </el-form-item>
            <el-form-item label="使用模型">
              <el-tag type="success">{{ imageModel }}</el-tag>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 生成按钮 -->
        <div class="action-section">
          <el-button type="primary" @click="generateImage" :loading="imageGenerating" size="large">
            <el-icon><Picture /></el-icon>
            生成图片
          </el-button>
        </div>
        
        <!-- 生成结果 -->
        <div v-if="generatedImages.length > 0" class="result-section">
          <h3>生成结果：</h3>
          <div class="generated-images">
            <div v-for="(image, index) in generatedImages" :key="index" class="generated-image-item">
              <el-image
                :src="image"
                fit="cover"
                :preview-src-list="generatedImages"
                class="generated-image"
              ></el-image>
              <div class="image-actions">
                <el-button type="primary" size="small" @click="copyImageLink(image)" class="ivory-button">
                  <el-icon><DocumentCopy /></el-icon>
                  复制链接
                </el-button>
                <el-button type="primary" size="small" @click="viewOriginalImage(image)" class="ivory-button">
                  <el-icon><View /></el-icon>
                  查看原图
                </el-button>
                <el-button type="primary" size="small" @click="downloadImage(image)" class="ivory-button">
                  <el-icon><Download /></el-icon>
                  下载图片
                </el-button>
              </div>
              <!-- 免责说明 -->
              <div class="disclaimer">
                <el-icon class="warning-icon"><Warning /></el-icon>
                <span>AI生成内容仅供参考，请勿用于非法用途，后果自负</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 视频生成对话框 -->
    <el-dialog
      v-model="showVideoGenerationDialog"
      title="AI视频生成"
      width="800px"
      center
    >
      <div class="video-generation-dialog">
        <!-- 提示词输入 -->
        <div class="prompt-section">
          <el-form label-position="top" label-width="80px">
            <el-form-item label="生成提示词">
              <el-input
                v-model="videoGenerationPrompt"
                type="textarea"
                :rows="4"
                placeholder="请输入视频生成提示词，例如：'写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近'"
                resize="vertical"
              ></el-input>
            </el-form-item>
            <el-form-item label="使用模型">
              <el-tag type="success">{{ videoModel }}</el-tag>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 生成按钮 -->
        <div class="action-section">
          <el-button type="primary" @click="createVideoTask" :loading="videoGenerating" size="large">
            <el-icon><VideoPlay /></el-icon>
            生成视频
          </el-button>
        </div>
        
        <!-- 任务状态 -->
        <div v-if="videoTaskId" class="status-section">
          <el-card shadow="hover" class="task-status-card">
            <div class="task-status-header">
              <div class="task-status-title">
                <el-icon :class="getTaskStatusIcon()"></el-icon>
                <span>{{ getTaskStatusText() }}</span>
              </div>
              <el-tag :type="getTaskStatusType()" size="small">{{ videoTaskStatus }}</el-tag>
            </div>
            <div class="task-status-content">
              <div class="task-info-item">
                <span class="task-info-label">任务ID:</span>
                <span class="task-info-value">{{ videoTaskId }}</span>
                <el-button 
                  type="text" 
                  size="small" 
                  @click="copyTaskId" 
                  class="copy-task-id-btn"
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </div>
              <!-- 任务进度条 -->
              <div class="task-progress">
                <el-progress 
                  :percentage="getTaskProgress()" 
                  :status="getTaskProgressStatus()"
                  :stroke-width="10"
                  :color="getTaskStatusColor()"
                ></el-progress>
              </div>
              <!-- 任务阶段说明 -->
              <div class="task-steps">
                <div 
                  v-for="(step, index) in taskSteps" 
                  :key="index" 
                  :class="['task-step', { 'active': isStepActive(step), 'completed': isStepCompleted(step) }]"
                >
                  <div class="step-number">{{ index + 1 }}</div>
                  <div class="step-content">
                    <div class="step-title">{{ step.title }}</div>
                    <div class="step-description">{{ step.description }}</div>
                  </div>
                  <el-icon v-if="isStepCompleted(step)" class="step-success"><CircleCheck /></el-icon>
                </div>
              </div>
            </div>
          </el-card>
        </div>
        
        <!-- 生成结果 -->
        <div v-if="generatedVideo" class="result-section">
          <h3>生成结果：</h3>
          <div class="generated-video-item">
            <!-- 视频预览 -->
            <div class="video-preview">
              <video :src="generatedVideo" controls class="generated-video"></video>
            </div>
            <!-- 操作按钮 -->
            <div class="image-actions">
              <el-button type="primary" size="small" @click="copyVideoLink" class="ivory-button">
                <el-icon><DocumentCopy /></el-icon>
                复制链接
              </el-button>
              <el-button type="primary" size="small" @click="viewVideo" class="ivory-button">
                <el-icon><View /></el-icon>
                查看视频
              </el-button>
              <el-button type="primary" size="small" @click="downloadVideo" class="ivory-button">
                <el-icon><Download /></el-icon>
                下载视频
              </el-button>
            </div>
            <!-- 免责说明 -->
            <div class="disclaimer">
              <el-icon class="warning-icon"><Warning /></el-icon>
              <span>AI生成内容仅供参考，请勿用于非法用途，后果自负</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'AISupport',
  data() {
    return {
      inputMessage: '',
      messages: [
        {
          content: '您好！我是您的AI农业助手，有什么可以帮助您的吗？',
          role: 'assistant',
          time: '11:30'
        }
      ],
      sending: false,
      autoReply: true,
      // 用于滚动到底部
      chatContainer: null,
      // 已上传图片
      uploadedImages: [],
      // 正在加载中
      loading: false,
      // 控制图片上传面板显示/隐藏
      showImageUpload: false,
      // 豆包API配置
      doubaoApi: {
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        model: 'doubao-1-5-vision-pro-32k-250115',
        apiKey: 'e49d4768-d46b-4cd3-ae83-c38a92f1bebb',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer e49d4768-d46b-4cd3-ae83-c38a92f1bebb'
        }
      },
      // 图片生成相关
      showImageGenerationDialog: false,
      imageGenerationPrompt: '',
      generatedImages: [],
      imageGenerating: false,
      imageModel: 'doubao-seedream-4-5-251128',
      // 视频生成相关
      showVideoGenerationDialog: false,
      videoGenerationPrompt: '',
      generatedVideo: null,
      videoGenerating: false,
      videoModel: 'doubao-seedance-1-5-pro-251215',
      videoTaskId: null,
      videoTaskStatus: '',
      videoTaskPolling: null,
      // 视频生成任务步骤
      taskSteps: [
        { id: 'creating', title: '创建任务', description: '正在创建视频生成任务...', status: 'creating' },
        { id: 'pending', title: '等待处理', description: '任务已创建，正在等待处理...', status: 'pending' },
        { id: 'running', title: '正在生成', description: 'AI正在生成视频内容...', status: 'running' },
        { id: 'succeeded', title: '生成完成', description: '视频生成成功，正在准备下载...', status: 'succeeded' }
      ]
    }
  },
  methods: {
    // 打开AI聊天
    openAIChat() {
      this.$message.info('AI聊天已打开')
    },
    
    // 获取产品推荐
    getProductRecommendations() {
      this.$message.info('获取产品推荐')
    },
    
    // 识别病虫害
    identifyPests() {
      this.$message.info('识别病虫害')
    },
    
    // 获取种植建议
    getPlantingAdvice() {
      this.$message.info('获取种植建议')
    },
    
    // 清空聊天
    clearChat() {
      this.$confirm('确定要清空聊天记录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.messages = [
          {
            content: '您好！我是您的AI农业助手，有什么可以帮助您的吗？',
            role: 'assistant',
            time: '11:30'
          }
        ]
        this.uploadedImages = []
        this.$message.success('聊天记录已清空')
      }).catch(() => {
        // 取消清空
      })
    },
    
    // 处理图片上传
    handleImageUpload(options) {
      const file = options.file
      // 创建临时URL用于预览
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target.result
        this.uploadedImages.push({
          file: file,
          url: imageUrl,
          name: file.name
        })
      }
      reader.readAsDataURL(file)
    },
    
    // 处理超出上传限制
    handleExceed(files, fileList) {
      this.$message.warning(`只能上传${fileList.length}个文件`)
    },
    
    // 移除媒体
    removeMedia(type, index) {
      if (type === 'image') {
        this.uploadedImages.splice(index, 1)
      }
    },
    
    // 切换图片上传面板显示/隐藏
    toggleImageUpload() {
      this.showImageUpload = !this.showImageUpload
    },
    
    // 构建API请求数据
    buildApiRequestData() {
      const requestData = {
        messages: [],
        model: this.doubaoApi.model
      }
      
      // 构建包含图片和文本的消息
      const content = []
      
      // 添加图片内容
      this.uploadedImages.forEach(image => {
        // 确保图片URL是Base64格式
        if (image.url.startsWith('data:image/')) {
          content.push({
            type: 'image_url',
            image_url: {
              url: image.url
            }
          })
        }
      })
      
      // 添加文本内容
      if (this.inputMessage.trim()) {
        content.push({
          type: 'text',
          text: this.inputMessage.trim()
        })
      }
      
      // 构建消息
      requestData.messages.push({
        content: content,
        role: 'user'
      })
      
      return requestData
    },
    
    // 调用豆包对话API
    async callDoubaoChatAPI() {
      try {
        const requestData = this.buildApiRequestData()
        
        const response = await fetch(this.doubaoApi.endpoint, {
          method: 'POST',
          headers: this.doubaoApi.headers,
          body: JSON.stringify(requestData)
        })
        
        // 尝试获取响应数据，无论状态如何
        let responseData
        try {
          responseData = await response.json()
        } catch (parseError) {
          responseData = await response.text()
        }
        
        if (!response.ok) {
          // 详细显示API返回的错误信息
          const errorMsg = typeof responseData === 'string' ? responseData : 
                          responseData.error?.message || `API请求失败: ${response.status} ${response.statusText}`
          throw new Error(`API请求失败: ${errorMsg}`)
        }
        
        return responseData
      } catch (error) {
        console.error('调用豆包API失败:', error)
        this.$message.error(`调用AI服务失败: ${error.message}`)
        throw error
      }
    },
    
    // 简单的markdown处理函数
    processMarkdown(text) {
      if (!text) return ''
      
      // 处理标题
      text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>')
      text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>')
      text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>')
      
      // 处理粗体和斜体
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // 处理换行
      text = text.replace(/\n/g, '<br>')
      
      return text
    },
    
    // 发送消息
    async sendMessage() {
      // 检查是否有内容可发送
      if (!this.inputMessage.trim() && this.uploadedImages.length === 0) {
        this.$message.warning('请输入文本或上传图片后再发送')
        return
      }
      
      // 发送时立即关闭图片上传面板
      this.showImageUpload = false
      
      // 构建用户消息
      const userMessage = {
        content: this.inputMessage.trim(),
        images: this.uploadedImages.map(img => img.url),
        role: 'user',
        time: new Date().toLocaleTimeString()
      }
      
      this.messages.push(userMessage)
      this.loading = true
      
      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      
      try {
        // 调用豆包API
        const apiResult = await this.callDoubaoChatAPI()
        
        // 处理API返回结果
        const rawContent = apiResult.choices?.[0]?.message?.content || '未获取到有效回复'
        const processedContent = this.processMarkdown(rawContent)
        
        const aiMessage = {
          content: processedContent,
          role: 'assistant',
          usage: apiResult.usage,
          time: new Date().toLocaleTimeString()
        }
        
        this.messages.push(aiMessage)
        this.$message.success('AI回复完成')
      } catch (error) {
        // 处理错误
        const errorMessage = {
          content: `AI回复失败: ${error.message}`,
          role: 'assistant',
          time: new Date().toLocaleTimeString()
        }
        this.messages.push(errorMessage)
      } finally {
        // 重置状态
      this.inputMessage = ''
      this.uploadedImages = []
      this.loading = false
      this.showImageUpload = false // 发送消息后关闭上传面板
        
        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    // 滚动到底部
    scrollToBottom() {
      const chatMessages = this.$refs.chatMessages
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight
      }
    },
    
    // 打开图片生成对话框
    openImageGenerationDialog() {
      this.showImageGenerationDialog = true
      this.imageGenerationPrompt = ''
      this.generatedImages = []
    },
    
    // 调用图片生成API
    async generateImage() {
      if (!this.imageGenerationPrompt.trim()) {
        this.$message.warning('请输入图片生成提示词')
        return
      }
      
      this.imageGenerating = true
      
      try {
        const requestData = {
          model: this.imageModel,
          prompt: this.imageGenerationPrompt.trim(),
          sequential_image_generation: 'disabled',
          response_format: 'url',
          size: '2K',
          stream: false,
          watermark: true
        }
        
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer e49d4768-d46b-4cd3-ae83-c38a92f1bebb'
          },
          body: JSON.stringify(requestData)
        })
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
        }
        
        const responseData = await response.json()
        
        if (responseData.data && responseData.data.length > 0) {
          this.generatedImages = responseData.data.map(item => item.url)
        } else {
          this.$message.error('未生成图片，请重试')
        }
      } catch (error) {
        console.error('图片生成失败:', error)
        this.$message.error(`图片生成失败: ${error.message}`)
      } finally {
        this.imageGenerating = false
      }
    },
    
    // 关闭图片生成对话框
    closeImageGenerationDialog() {
      this.showImageGenerationDialog = false
    },
    
    // 复制图片链接
    copyImageLink(imageUrl) {
      navigator.clipboard.writeText(imageUrl)
        .then(() => {
          this.$message.success('图片链接已复制到剪贴板')
        })
        .catch(err => {
          console.error('复制失败:', err)
          this.$message.error('复制失败，请手动复制')
        })
    },
    
    // 查看原图
    viewOriginalImage(imageUrl) {
      window.open(imageUrl, '_blank')
    },
    
    // 下载图片
    downloadImage(imageUrl) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `ai-generated-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      this.$message.success('图片下载已开始')
    },
    
    // 复制消息内容
    copyMessageContent(htmlContent) {
      // 创建临时元素提取纯文本
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      const textContent = tempDiv.textContent || tempDiv.innerText
      
      navigator.clipboard.writeText(textContent)
        .then(() => {
          this.$message.success('消息内容已复制到剪贴板')
        })
        .catch(err => {
          console.error('复制失败:', err)
          this.$message.error('复制失败，请手动复制')
        })
    },
    
    // 打开视频生成对话框
    openVideoGenerationDialog() {
      this.showVideoGenerationDialog = true
      this.videoGenerationPrompt = ''
      this.generatedVideo = null
      this.videoGenerating = false
      this.videoTaskId = null
      this.videoTaskStatus = ''
      if (this.videoTaskPolling) {
        clearInterval(this.videoTaskPolling)
        this.videoTaskPolling = null
      }
    },
    
    // 创建视频生成任务
    async createVideoTask() {
      if (!this.videoGenerationPrompt.trim()) {
        this.$message.warning('请输入视频生成提示词')
        return
      }
      
      this.videoGenerating = true
      this.videoTaskStatus = 'creating'
      
      try {
        const requestData = {
          model: this.videoModel,
          content: [
            {
              type: 'text',
              text: this.videoGenerationPrompt.trim()
            }
          ]
        }

        if (import.meta.env.VITE_ARK_IMAGE_URL) {
          requestData.content.push({
            type: 'image_url',
            image_url: {
              url: import.meta.env.VITE_ARK_IMAGE_URL
            }
          })
        }
        
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer e49d4768-d46b-4cd3-ae83-c38a92f1bebb'
          },
          body: JSON.stringify(requestData)
        })
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
        }
        
        const responseData = await response.json()
        if (responseData.id) {
          this.videoTaskId = responseData.id
          this.videoTaskStatus = 'pending'
          this.startTaskPolling()
        } else {
          throw new Error('未获取到任务ID')
        }
      } catch (error) {
        console.error('创建视频任务失败:', error)
        this.$message.error(`创建视频任务失败: ${error.message}`)
        this.videoGenerating = false
        this.videoTaskStatus = 'failed'
      }
    },
    
    // 开始轮询任务状态
    startTaskPolling() {
      // 每秒查询一次任务状态
      this.videoTaskPolling = setInterval(() => {
        this.checkVideoTaskStatus()
      }, 1000)
    },
    
    // 查询视频任务状态
    async checkVideoTaskStatus() {
      if (!this.videoTaskId) return
      
      try {
        const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${this.videoTaskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer e49d4768-d46b-4cd3-ae83-c38a92f1bebb'
          }
        })
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
        }
        
        const responseData = await response.json()
        this.videoTaskStatus = responseData.status
        
        console.log('视频生成响应数据:', responseData)
        
        if (responseData.status === 'succeeded') {
          // 处理不同的响应结构，确保正确获取视频URL
          let videoUrl = ''
          
          // 尝试多种可能的响应结构
          if (responseData.output && responseData.output.length > 0) {
            videoUrl = responseData.output[0].url
          } else if (responseData.result && responseData.result.url) {
            videoUrl = responseData.result.url
          } else if (responseData.data && responseData.data.url) {
            videoUrl = responseData.data.url
          } else if (responseData.video_url) {
            videoUrl = responseData.video_url
          } else if (responseData.content && responseData.content.video_url) {
            videoUrl = responseData.content.video_url
          }
          
          if (videoUrl) {
            this.generatedVideo = videoUrl
            this.stopTaskPolling()
            this.videoGenerating = false
            this.$message.success('视频生成完成')
          } else {
            console.error('无法从响应中提取视频URL:', responseData)
            this.$message.warning('视频生成成功，但无法获取视频URL，请手动查看任务详情')
            this.stopTaskPolling()
            this.videoGenerating = false
          }
        } else if (responseData.status === 'failed') {
          // 任务失败
          this.stopTaskPolling()
          this.videoGenerating = false
          this.$message.error('视频生成失败: ' + (responseData.error?.message || '未知错误'))
        }
      } catch (error) {
        console.error('查询任务状态失败:', error)
        this.$message.error(`查询任务状态失败: ${error.message}`)
      }
    },
    
    // 停止任务轮询
    stopTaskPolling() {
      if (this.videoTaskPolling) {
        clearInterval(this.videoTaskPolling)
        this.videoTaskPolling = null
      }
    },
    
    // 复制视频链接
    copyVideoLink() {
      if (!this.generatedVideo) return
      
      navigator.clipboard.writeText(this.generatedVideo)
        .then(() => {
          this.$message.success('视频链接已复制到剪贴板')
        })
        .catch(err => {
          console.error('复制失败:', err)
          this.$message.error('复制失败，请手动复制')
        })
    },
    
    // 查看视频
    viewVideo() {
      if (!this.generatedVideo) return
      window.open(this.generatedVideo, '_blank')
    },
    
    // 下载视频
    downloadVideo() {
      if (!this.generatedVideo) return
      
      const link = document.createElement('a')
      link.href = this.generatedVideo
      link.download = `ai-generated-video-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      this.$message.success('视频下载已开始')
    },
    
    // 关闭视频生成对话框
    closeVideoGenerationDialog() {
      this.showVideoGenerationDialog = false
      this.stopTaskPolling()
    },
    
    // 获取任务状态文本
    getTaskStatusText() {
      const statusMap = {
        creating: '正在创建任务',
        pending: '任务待处理',
        running: '任务执行中',
        succeeded: '任务成功',
        failed: '任务失败',
        canceled: '任务已取消'
      }
      return statusMap[this.videoTaskStatus] || this.videoTaskStatus
    },
    
    // 获取任务状态类型
    getTaskStatusType() {
      const typeMap = {
        creating: 'info',
        pending: 'info',
        running: 'warning',
        succeeded: 'success',
        failed: 'error',
        canceled: 'warning'
      }
      return typeMap[this.videoTaskStatus] || 'info'
    },
    
    // 获取任务状态图标
    getTaskStatusIcon() {
      const iconMap = {
        creating: 'Loading',
        pending: 'Clock',
        running: 'VideoPlay',
        succeeded: 'CircleCheck',
        failed: 'CircleClose',
        canceled: 'Close'
      }
      return iconMap[this.videoTaskStatus] || 'HelpFilled'
    },
    
    // 复制任务ID
    copyTaskId() {
      navigator.clipboard.writeText(this.videoTaskId)
        .then(() => {
          this.$message.success('任务ID已复制到剪贴板')
        })
        .catch(err => {
          console.error('复制失败:', err)
          this.$message.error('复制失败，请手动复制')
        })
    },
    
    // 获取任务进度
    getTaskProgress() {
      const progressMap = {
        creating: 10,
        pending: 25,
        running: 50,
        succeeded: 100,
        failed: 0,
        canceled: 0
      }
      return progressMap[this.videoTaskStatus] || 0
    },
    
    // 获取任务进度状态
    getTaskProgressStatus() {
      if (this.videoTaskStatus === 'succeeded') {
        return 'success'
      } else if (this.videoTaskStatus === 'failed' || this.videoTaskStatus === 'canceled') {
        return 'exception'
      } else {
        return 'active'
      }
    },
    
    // 获取任务状态颜色
    getTaskStatusColor() {
      const colorMap = {
        creating: '#909399',
        pending: '#67C23A',
        running: '#E6A23C',
        succeeded: '#67C23A',
        failed: '#F56C6C',
        canceled: '#909399'
      }
      return colorMap[this.videoTaskStatus] || '#909399'
    },
    
    // 检查步骤是否为当前活跃步骤
    isStepActive(step) {
      return step.id === this.videoTaskStatus
    },
    
    // 检查步骤是否已完成
    isStepCompleted(step) {
      const stepOrder = ['creating', 'pending', 'running', 'succeeded']
      const currentIndex = stepOrder.indexOf(this.videoTaskStatus)
      const stepIndex = stepOrder.indexOf(step.id)
      return stepIndex < currentIndex
    }
  },
  mounted() {
    // 初始化聊天容器
    this.chatContainer = this.$refs.chatMessages
  }
}
</script>

<style scoped>
.page-container {
  padding: 20px;
}

/* AI功能卡片 */
.features-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.feature-card {
  border-radius: 12px;
  background: white;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  font-size: 1rem;
  color: #333;
}

.feature-icon {
  font-size: 1.5rem;
  color: #9CAD92;
}

.feature-content {
  padding: 15px 0;
}

.feature-content p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

/* 卡片按钮主题色 */
.feature-content .el-button--primary {
  background-color: #9CAD92 !important;
  border-color: #9CAD92 !important;
}

.feature-content .el-button--primary:hover,
.feature-content .el-button--primary:focus {
  background-color: #8a9d80 !important;
  border-color: #8a9d80 !important;
}

/* 内容卡片 */
.content-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: white;
}

.card-header {
  font-weight: bold;
  font-size: 1.2rem;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 内测标签样式 */
.beta-tag {
  font-size: 0.8rem;
  color: #909399;
  margin-left: 10px;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.card-content {
  padding: 20px;
}

/* 聊天容器 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
  min-height: 200px; /* 确保聊天区域有最小高度 */
}

/* 输入区域容器 */
.chat-input-area {
  margin-top: auto;
  flex-shrink: 0; /* 防止输入区域被压缩 */
}

/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 15px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bot-message {
  flex-direction: row;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #9CAD92;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 10px;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: #D4B5A0;
}

.message-content {
  max-width: 70%;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 5px;
  word-wrap: break-word;
}

.bot-message .message-text {
  border-bottom-left-radius: 8px;
}

.user-message .message-text {
  background: #9CAD92;
  color: white;
  border-bottom-right-radius: 8px;
}

.message-time {
  font-size: 0.75rem;
  color: #909399;
  text-align: right;
  padding: 0 10px;
}

.user-message .message-time {
  text-align: left;
}

/* 消息文本容器，用于定位复制按钮 */
.message-text-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

/* 复制消息按钮样式 */
.copy-message-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: 2px 6px;
  font-size: 0.75rem;
  height: auto;
}

/* 鼠标悬停时显示复制按钮 */
.message-text-container:hover .copy-message-btn {
  opacity: 1;
}

/* Token用量显示 */
.token-usage {
  font-size: 0.75rem;
  color: #67C23A;
  margin: 5px 0 0 10px;
  font-weight: 500;
}

/* 消息媒体内容 */
.message-media {
  display: flex;
  gap: 10px;
  margin: 10px 0;
  flex-wrap: wrap;
}

.message-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.message-video {
  width: 250px;
  height: 180px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 向量结果展示 */
.embedding-result {
  margin-top: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  font-size: 0.9rem;
}

.result-item {
  margin: 5px 0;
  padding: 5px;
  border-bottom: 1px solid #e4e7ed;
}

.vector-data {
  margin: 10px 0;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #9CAD92;
}

.vector-data h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #333;
}

.vector-info {
  margin: 5px 0;
  padding: 5px;
}

.usage-info {
  margin: 10px 0;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #67C23A;
}

.usage-info h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #333;
}

/* 聊天输入区域 */
.chat-input-area {
  margin-top: auto;
}

/* 输入容器 */
.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 10px;
}

/* 发送按钮 */
.send-btn {
  height: auto;
  min-width: 80px;
  background-color: #9CAD92;
  border-color: #9CAD92;
}

.send-btn:hover,
.send-btn:focus {
  background-color: #8a9d80;
  border-color: #8a9d80;
}

/* 加载中动画 */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 输入工具栏 - 紧凑布局 */
.input-toolbar-compact {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.upload-wrapper {
  position: relative;
  display: inline-block;
  z-index: 100;
}

.upload-btn {
  font-size: 0.9rem;
  padding: 6px 12px;
  background-color: #f0f2f5;
  border-color: #dcdfe6;
  margin-bottom: 0;
}

.upload-panel {
  position: absolute;
  bottom: calc(100% + 5px); /* 向上弹出 */
  left: 0;
  z-index: 101;
  background: white;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 -2px 12px 0 rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

/* 确保上传面板不会超出容器 */
.upload-panel {
  max-width: 300px;
}

.compact-upload .el-upload--picture-card {
  width: 80px;
  height: 80px;
  line-height: 80px;
}

/* 媒体预览 - 紧凑布局 */
.media-preview-compact {
  margin: 5px 0;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.preview-list-compact {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-item-small {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.preview-image-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn-small {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  z-index: 10;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
}

.remove-btn-small:hover {
  opacity: 1;
}

/* 输入工具栏 */
.input-toolbar {
  margin-bottom: 10px;
}

/* 媒体预览 */
.media-preview {
  margin: 10px 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.preview-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}

.preview-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  z-index: 10;
}

.remove-btn:hover {
  opacity: 1;
}

/* 多模态输入面板 */
.multimodal-panel {
  margin-top: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

/* 媒体预览 */
.media-preview {
  margin: 10px 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.preview-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}

.preview-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-item.video-preview {
  width: 200px;
  height: 150px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  z-index: 10;
}

.remove-btn:hover {
  opacity: 1;
}

.input-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 0.85rem;
  color: #909399;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-questions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* AI分析报告 */
.report-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.report-item {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #9CAD92;
  transition: all 0.3s ease;
}

.report-item:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.report-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 15px;
}

/* 模型信息样式 */
.model-info {
  margin: 10px 0;
  display: flex;
  align-items: center;
}

.model-info .el-tag {
  font-size: 0.85rem;
  padding: 4px 8px;
}

.report-summary p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.report-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* AI创作按钮主题色 */
.report-actions .el-button--primary {
  background-color: #9CAD92;
  border-color: #9CAD92;
}

.report-actions .el-button--primary:hover,
.report-actions .el-button--primary:focus {
  background-color: #8a9d80;
  border-color: #8a9d80;
}

/* 技术支持信息 */
.tech-support {
  margin-top: 20px;
  text-align: center;
}

.support-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  font-size: 0.9rem;
  color: #606266;
}

.model-info {
  margin-left: 20px;
}

/* 图片生成对话框样式 */
.image-generation-dialog {
  padding: 20px 0;
}

.prompt-section {
  margin-bottom: 20px;
}

.action-section {
  text-align: center;
  margin: 20px 0;
}

.result-section {
  margin-top: 30px;
}

.result-section h3 {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 15px;
  font-weight: bold;
}

.generated-images {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.generated-image-item {
  max-width: 100%;
  text-align: center;
}

.generated-image {
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.image-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.image-actions .el-button {
  min-width: 100px;
}

/* 象牙白按钮样式 */
.ivory-button {
  background-color: #F2EFEB !important;
  border-color: #F2EFEB !important;
  color: #333 !important;
}

.ivory-button:hover,
.ivory-button:focus {
  background-color: #E8E4DF !important;
  border-color: #E8E4DF !important;
  color: #333 !important;
}

/* 免责说明样式 */
.disclaimer {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 3px solid #E6A23C;
}

.warning-icon {
  color: #E6A23C;
  font-size: 1rem;
}

/* 视频生成对话框样式 */
.video-generation-dialog {
  padding: 20px 0;
}

/* 视频预览样式 */
.video-preview {
  text-align: center;
  margin: 20px 0;
}

.generated-video {
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 任务状态区域 */
.status-section {
  margin: 20px 0;
}

/* 任务状态卡片样式 */
.task-status-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.task-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.task-status-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
}

.task-status-title .el-icon {
  font-size: 1.2rem;
}

.task-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 0.95rem;
}

.task-info-label {
  color: #909399;
}

.task-info-value {
  color: #333;
  font-family: 'Courier New', Courier, monospace;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-task-id-btn {
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 任务进度条 */
.task-progress {
  margin-bottom: 25px;
}

.task-progress .el-progress {
  margin-bottom: 5px;
}

/* 任务步骤样式 */
.task-steps {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s ease;
  border-left: 3px solid #dcdfe6;
}

.task-step.active {
  background: #ecf5ff;
  border-left-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.task-step.completed {
  background: #f0f9eb;
  border-left-color: #67c23a;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dcdfe6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
  flex-shrink: 0;
  transition: all 0.3s ease;
  margin-top: 2px;
}

.task-step.active .step-number {
  background: #409eff;
}

.task-step.completed .step-number {
  background: #67c23a;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 3px;
  font-size: 0.95rem;
}

.step-description {
  color: #606266;
  font-size: 0.85rem;
  line-height: 1.4;
}

.step-success {
  color: #67c23a;
  font-size: 1.2rem;
  margin-top: 2px;
}

/* 生成视频项样式 */
.generated-video-item {
  text-align: center;
}

/* 视频预览容器 */
.video-preview {
  margin-bottom: 20px;
}
</style>
