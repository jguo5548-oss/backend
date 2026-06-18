const express = require('express');
const app = express();

app.use(express.json());

// 允許跨域請求，讓你的 Vercel 前端順利連線
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 健康檢查接口
app.get('/health', (req, res) => {
  res.send('服務正常！中轉大管家已就位！');
});

// 對話接口：改用 100% 相容中轉站的 OpenAI 標準格式
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    // 🚨 換成中轉站標準的 chat/completions 路徑
    const response = await fetch('https://shufulei.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHUFULEI_API_KEY}`, // 使用標準 Bearer 格式
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // 💡[糍粑]claude-opus-4-6-thinking
        model: '[糍粑]claude-opus-4-6-thinking', 
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    
    // 解析 OpenAI 格式返回的數據
    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      res.status(500).json({ error: '中轉站沒有返回有效內容', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: '伺服器出錯啦', details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`伺服器正在端口 ${PORT} 運行`);
});
