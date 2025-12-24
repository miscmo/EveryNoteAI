import { SimpleStore } from './simple-store'

interface AIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class AIService {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(store: SimpleStore) {
    this.apiKey = store.get('openai.apiKey', '') as string
    this.baseUrl = store.get('openai.baseUrl', 'https://api.openai.com/v1') as string
    this.model = store.get('openai.model', 'gpt-3.5-turbo') as string
  }

  private async callAPI(systemPrompt: string, userContent: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('请先设置 OpenAI API Key')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API 请求失败: ${error}`)
    }

    const data = await response.json() as AIResponse
    return data.choices[0]?.message?.content || ''
  }

  async summarize(content: string): Promise<string> {
    const systemPrompt = `你是一个专业的文本摘要助手。请为用户提供的内容生成一个简洁、准确的摘要。
要求：
1. 摘要应该控制在100-200字以内
2. 保留关键信息和核心观点
3. 使用清晰、简洁的语言
4. 直接输出摘要内容，不要添加任何前缀说明`

    return this.callAPI(systemPrompt, content)
  }

  async generateTags(content: string): Promise<string[]> {
    const systemPrompt = `你是一个专业的内容分析助手。请分析用户提供的内容，生成3-5个相关的标签。
要求：
1. 标签应该简短（1-4个词）
2. 标签应该准确反映内容的主题和关键概念
3. 以JSON数组格式返回，例如：["标签1", "标签2", "标签3"]
4. 只返回JSON数组，不要添加任何其他说明`

    const result = await this.callAPI(systemPrompt, content)
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed)) {
        return parsed.map(tag => String(tag).trim()).filter(tag => tag.length > 0)
      }
    } catch {
      // If parsing fails, try to extract tags from the response
      const matches = result.match(/["']([^"']+)["']/g)
      if (matches) {
        return matches.map(m => m.replace(/["']/g, '').trim()).filter(tag => tag.length > 0)
      }
    }
    return []
  }

  async polish(content: string): Promise<string> {
    const systemPrompt = `你是一个专业的文本润色助手。请对用户提供的内容进行润色和优化。
要求：
1. 保持原文的核心意思不变
2. 改善语言表达，使其更加流畅、专业
3. 修正语法错误和不当用词
4. 优化段落结构和逻辑
5. 直接输出润色后的内容，不要添加任何说明`

    return this.callAPI(systemPrompt, content)
  }

  async expand(content: string): Promise<string> {
    const systemPrompt = `你是一个专业的内容扩展助手。请基于用户提供的内容进行扩展和续写。
要求：
1. 保持与原文一致的风格和语气
2. 扩展内容应该逻辑连贯，与原文自然衔接
3. 添加相关的细节、例子或解释
4. 扩展后的内容应该是原文的1.5-2倍长度
5. 直接输出扩展后的完整内容（包含原文），不要添加任何说明`

    return this.callAPI(systemPrompt, content)
  }

  async translate(content: string, targetLang: string): Promise<string> {
    const langMap: Record<string, string> = {
      'en': '英文',
      'zh': '中文',
      'ja': '日文',
      'ko': '韩文',
      'fr': '法文',
      'de': '德文',
      'es': '西班牙文'
    }

    const targetLanguage = langMap[targetLang] || targetLang

    const systemPrompt = `你是一个专业的翻译助手。请将用户提供的内容翻译成${targetLanguage}。
要求：
1. 翻译应该准确、流畅
2. 保持原文的语气和风格
3. 专业术语应该使用恰当的翻译
4. 直接输出翻译结果，不要添加任何说明`

    return this.callAPI(systemPrompt, content)
  }
}
