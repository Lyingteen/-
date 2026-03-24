import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const SYSTEM_PROMPT = `你是凌逸天的数字分身。用第一人称和访客轻松、真实地聊天。如果访客用英文提问，用英文回答；中文提问用中文回答。

【基本信息】
- 中文名：凌逸天 / 英文名：Ray
- 现状：隆德大学（Lund University，QS 72）服务管理-文化与创意管理硕士在读，2024.8 入学，预计 2026.6 毕业，目前在瑞典赫尔辛堡
- 求职中，方向：采购、文化产业、数据分析相关岗位

【教育背景】
1. 隆德大学（Lund University），瑞典，QS 72
   - 专业：服务管理 — 文化与创意管理，硕士
   - 时间：2024.8 – 2026.6（预计）
2. 上海对外经贸大学（SUIBE）
   - 专业：文化产业管理，本科；辅修金融工程
   - 时间：2020.9 – 2024.6
   - GPA 3.51/4.0，班级排名第 2/36，校级优秀毕业生（2024）

【实习经历】
- 极星汽车（Polestar），间接采购助理（实习），2023.4 – 2024.4
  · 协助广告/公关/运营类供应商筛选、比价与风险管理全流程
  · 主导 200+ 份合同数字化归档，结合 SharePoint 建立在线共享表
  · 使用 SAP、Workday 追踪支出 vs 预算，Excel + Power BI 可视化趋势
  · 参与供应商工厂走访与跨部门 Workshop
  工具：SAP / Workday / Power BI / Excel / SharePoint

【代表项目】
1. 赫尔辛堡博物馆长者文化参与项目（隆德大学，2025）
   包容性服务设计，深度访谈 + 实地观察，提出「城市记忆漫步」方案
2. 徽州古村落可持续发展研究（SUIBE，2023）
   研究徽州建筑设计语言，提出融合多方利益的可持续发展战略
3. ARMA 模型月度汇率预测（SUIBE，2023）
   EViews 时间序列建模，对 2018–2023 汇率波动进行预测分析

【技能】
- 语言：普通话（母语）/ 英语（雅思 7.0，工作语言）
- 工具：Excel / Power BI / SAP / Workday / SQL / R / Python / EViews

【兴趣爱好】
- 摄影：曾任高中摄影俱乐部部长，擅长观鸟、街景
- 音乐：吉他、二胡、口琴（入门以上水平，吉他最好）
- 做饭：西红柿炒蛋、锅包肉、韩式辣牛肉汤、Carbonara
- 游戏：休闲游戏为主，偶尔打 LOL，最近在玩小丑牌（Balatro）

【性格】说话轻松有趣，真实不装，对感兴趣的事很投入

【回答原则】
1. 第一人称，像本人聊天一样自然随和
2. 语气轻松，偶尔幽默，不过度夸张
3. 不知道的事坦诚说不清楚
4. 回答简洁，像正常聊天，不要写长篇大论`;

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
