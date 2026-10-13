---
license: other
license_name: hast-sec-noncommercial-0.1
license_link: LICENSE
language:
  - zh
tags:
  - motion-control
  - vrm
  - text-to-motion
  - research
---

# HAST-SEC v0.1

混合自适应语义时序骨骼控制与估计系统. 面向非商业学习和研究的本地交互演示, 支持中文聊天、已支持动作的语义控制、连续角色运动和实时曲线观察.

系统使用约0.8B的文本模型及小型运动模型. 本版只提供运行所需代码和资源, 不包含训练流程或原始训练视频.

## 启动

推荐Windows 10或11、Node.js 22以上和支持WebGL的现代浏览器. 初次安装需要网络和约2GB可用磁盘空间; 显卡加速安装需要更多空间. CPU可运行, 实际响应时间与硬件有关.

```powershell
npm ci
npm run setup
npm start
```

打开终端打印的本地地址. 页面默认暂停, 点击开始后输入中文消息. 暂停会释放本程序启动的语言推理进程; 退出服务按Ctrl+C.

有兼容NVIDIA显卡时, 可以使用以下安装方式:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup.ps1 -Cuda
```

## 角色与使用

默认使用pixiv公开示例角色, 许可和出处见THIRD_PARTY_NOTICES.txt. 视频中的角色文件不随本项目分发. 可用合法取得的兼容VRM角色导入本机:

```powershell
npm run avatar -- "D:\角色\自己的角色.vrm"
```

角色需包含完整人形、眼睛和手指骨骼. 表情按角色实际支持的通道显示, 不同角色的形态和动作幅度可能不同. 自有角色不会加入发布清单.

可以尝试: 你好、讲一个简短的故事、挥挥左手、把右手举高、抬起右腿. 更复杂的动作仍可能执行不准确. 本版不是任意动作生成器, 不用于机器人实体控制或其他安全关键场景.

实时图表只保留最近15秒. 资源仪表区分本机内存和文件占用, 不把运行内存当作显存. CPU运行、首次加载和不同显卡的耗时可能明显不同.

安装失败时可重复运行安装命令, 已校验的资源会跳过. 网络无法访问资源站点时, 按assets/resources.json中的地址手动下载到指定位置. 不需要API密钥, 中文推理在本机完成.

## 许可

仅供非商业学习、教学和研究. 商用需联系项目维护者获得书面授权. 第三方资源仍遵守其原始许可, 项目授权不能替代第三方授权. 本版本为公开源码研究版. 具体条款见LICENSE.

源码与问题反馈: https://github.com/sola1039/HAST-SEC

商用授权请通过该仓库的议题联系维护者.
