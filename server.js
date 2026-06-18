const express = require('express');
const app = express();

app.use(express.json());

// 允許跨域請求，讓你的 Vercel 前端能順利連線
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key, anthropic-version');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 健康檢查接口
app.get('/health', (req, res) => {
  res.send('服務正常！舒芙蕾大管家已就位！');
});

// 對話接口：負責把訊息轉發給舒芙蕾中轉的 Claude
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    // 🚨 已成功替換為舒芙蕾官方提供的中轉接口地址
    const response = await fetch('https://shufulei.net/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SHUFULEI_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // 使用 Claude 3.5 Sonnet 模型
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    
    // 解析返回的數據
    if (data.content && data.content[0]) {
      res.json({ reply: data.content[0].text });
    } else {
      res.status(500).json({ error: '舒芙蕾沒有返回有效內容', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: '伺服器出錯啦', details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`伺服器正在端口 ${PORT} 運行`);
});
