---
module: service
path: service/public_api.mjs
keywords: [api, request, response, validation]
tags: [module-service, api-http, api-intent]
sources:
  - service/public_api.mjs
  - service/public_server.mjs
  - service/motion_result.mjs
  - service/qwen_intent.mjs
---

# HTTP接口

## Endpoints

这些是本地页面的内部接口。访问约束为 Host/Origin 同源检查，没有用户账号登录机制。

| 方法 | 路径 | 成功返回 |
|---|---|---|
| GET | `/v13-api/status` | `{runtime, training:false}` |
| GET | `/v13-api/bootstrap`、`/v15-api/bootstrap` | 合并后的技能库、classes、sources |
| POST | `/v13-api/plan` | reply、operation、base、intents、timing 及耗时等 |
| POST | `/v15-api/proactive` | chat 计划与 presentation |
| POST | `/v13-api/warm` | `{runtime}` |
| POST | `/v13-api/stop`、`/v13-api/interrupt` | `{stopped: boolean}` |
| GET/HEAD | `/v15-api/resources` | timestamp、service_rss_bytes、language_rss_bytes、storage_bytes |
| GET/HEAD | `/configs/skeleton_profile.json` | 根据本地 VRM 动态生成的骨架 profile |
| GET/HEAD | `/semantic-api/source-filter` | 身体来源过滤记录 |

## Request / Response

### 计划请求

在服务启动后、同源浏览器控制台执行：

```javascript
const response = await fetch('/v13-api/plan', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({
    text: '挥挥左手',
    context: [],
    session: crypto.randomUUID(),
    generation: 'v15'
  })
});
console.log(response.status, await response.json());
```

该调用会进行真实推理，但不会自动把返回值装入页面轨道。与 UI 完整行为对照需使用消息表单。

以下仅为**响应结构示意**，不是本次真实模型输出：

```json
{
  "reply": "",
  "operation": "command",
  "base": {"change": false, "name": "保持", "motion": 0, "rest": true},
  "intents": [{"key": "left-挥手打招呼", "strength": 1, "speed": 1, "hold": 2, "delay": 0}],
  "timing": "同时"
}
```

### 输入限制

| 字段 / 条件 | 检查 |
|---|---|
| 请求类型 | POST body 必须是对象；Content-Type 必须恰为 `application/json` |
| Origin | 必须是 `http://` + 请求 Host |
| 大小 / 读取时间 | 不超过 12000 字节，读取计时 10 秒，可能销毁连接 |
| text | string，trim 后非空，原字符串 length ≤300 |
| generation | plan 必须为 `v15` |
| context | 至多 4 条；仅 role/content；role 仅 user/assistant；单条 ≤600，累计 ≤1200 |
| session | 缺省 `local-test`；否则要求代码中的 UUID 形状正则，未进一步验证 UUID 版本 |
| 额外字段 | plan / proactive / 控制请求分别按白名单拒绝 |

JavaScript 的 `length` 按 UTF-16 代码单元计数，不能将这些上限直接解释成用户感知的字素数量。

控制请求只接受 `{session}`；proactive 只接受 `{context, session}`。

## 返回计划的二次检查

`validateResult` 检查 operation 为 chat/command/release，reply 长度、base 范围，intents 至多 4 条，key 存在于合并类集合，speed 0.4–2、strength 0–1、hold 0–20、delay 0–30。command 必须含动作或修改底座；chat/release 不得含 intents。

> [!warning] 结构边界不等于语义证明
> 这些条件无法证明模型正确理解“左腿”或“慢一点”；实际语义还要检查模型槽位、编译 key 和角色执行。→ [[中文模型练习]]

## Error Cases

| 状态 / 现象 | 来源 | 正文 |
|---|---|---|
| 400 | 已识别 API 的输入、模型、编译或结果检查失败 | `{ "error": "..." }`；SyntaxError 有统一格式文案 |
| 403 | HTTP 外层 Host/Origin 不满足 | 文本“仅允许本机访问.” |
| 404 | 未映射文件、无效路径、外层资源异常 | 文本错误；异常资源常被归为不可用 |
| 405 | 非 API 静态路径收到非 GET/HEAD | 文本“接口不允许写入.” |
| 连接中断 | 请求体读取超时等 | 不保证收到完整 JSON 错误 |

## 资源数据如何理解

服务 RSS 来自 `process.memoryUsage().rss`，语言 RSS 来自拥有的子进程，采样失败可能为 null。storage 启动时扫描 models，并尝试加入语言权重与角色；不包含运行库或完整安装目录。前端可加浏览器 JS 堆，仍不等于显存。

## Related Notes

- [[本地服务]]
- [[中文意图与进程]]
- [[指令执行链路]]
- [[页面与对话]]
- [[服务端练习]]
