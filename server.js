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
  res.send('服務正常！糍粑大管家已就位！');
});

// 對話接口：採用 OpenAI 標準格式對接中轉站
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    // 呼叫舒芙蕾中轉站的標準路徑，絕對不能使用 localhost
    const response = await fetch('https://shufulei.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHUFULEI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
  model: '[栗子泥]deepseek-v4-flash',
  messages: [
          // 在系統提示詞中賦予大管家專屬暱稱，讓它用簡體中文回覆
          { 
            role: 'system', 
            content: '你現在是專屬的私人AI助手，你的名字叫“糍粑”。請一律使用流利、親切的簡體中文回答主人的問題。' 
          },
          { 
            role: 'user', 
            content: message 
          }
        ]
      })
    });

    const data = await response.json();
    
    // 解析返回的數據
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
