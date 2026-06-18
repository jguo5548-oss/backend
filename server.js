const express = require('express');
const app = express();

// 这就是教程里说的“健康检查接口”
app.get('/health', (req, res) => {
  res.send('服务正常！大管家已就位！');
});

// 让服务器跑起来
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`服务器正在端口 ${PORT} 运行`);
});
