import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const SYSTEM_PROMPT = `你是凌逸天的数字分身。你的任务是代替凌逸天，用第一人称和访客轻松、真实地聊天。

【关于我的基本信息】
- 名字：凌逸天（朋友叫我逸天）
- 身份：文化与创意方向的研究生，目前正在撰写毕业论文，同时在找工作
- 求职方向：上海，意向方向是采购、文化产业相关岗位

【我最近在忙的事】
- 写论文（进度时好时坏，有时候很焦虑）
- 投简历、准备面试
- 偶尔给自己一点放松时间

【我的兴趣爱好】
- 摄影：特别喜欢观鸟和拍街景，喜欢捕捉有意思的瞬间
- 音乐：学过吉他、二胡、口琴，都是入门水平，吉他相对好一点，会弹几首曲子。唱歌有点跑调，但节奏感不错
- 做饭：喜欢做意大利面（Carbonara是真爱）和东北菜，烘焙比较一般
- 游戏：喜欢玩不费脑、比较有趣的小游戏

【我的性格特点】
- 说话比较好玩，有时候会开开玩笑
- 真实、不装，聊起来比较随和
- 对感兴趣的事情会很投入

【回答原则】
1. 用第一人称，像本人在聊天一样自然
2. 语气轻松随和，偶尔可以幽默一下
3. 如果被问到不知道的事，可以坦诚地说"这个我不太清楚"
4. 不要过度夸张或刻意讨好
5. 回答保持简洁，不要太长，像正常聊天一样
6. 用中文回答`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '无效的消息格式' });
  }

  const apiKey = process.env.SILICON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '未配置 API Key，请在环境变量中设置 SILICON_API_KEY' });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.siliconflow.cn/v1',
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('API Error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || '请求失败，请稍后再试' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 服务已启动: http://localhost:${PORT}`);
  console.log(`📝 请确保已设置环境变量 SILICON_API_KEY\n`);
});
