# Trip Rescue · 行程中断救援助手

错过车次、遇到延误或接驳失败后，在预算和到达期限内比较下一步：**Plan A 最快抵达、Plan B 最低费用、Plan C 更低操作风险**。

参赛方向：2026 飞猪 AI 旅行创新大赛。作者：[@Licecert](https://github.com/Licecert)。

## 两种体验

| 入口 | 数据 | 如何体验及调用边界 |
| --- | --- | --- |
| [在线界面演示](https://trip-rescue-weld.vercel.app/) | 明确标注的固定样例；价格、时刻和可靠性仅为演示 | 调整预算和到达期限，点击按钮比较三方案。页面正常交互不调用飞猪、百炼模型或阿里云 FC，不消耗飞猪 API 额度；仍使用 Vercel 托管与决策接口 |
| 百炼真实智能体 | 正式 FlyAI 查询的实际车票数据，保留查询时间、警告及供应商链接 | 由百炼 Managed Agent + 飞猪旅行 Skill 查询，并调用鉴权 MCP 决策工具。会消耗查询额度、模型 Token，可能产生 FC/沙箱费用；运行在作者的百炼账号中，后台会话不是免登录公共入口 |

公开网站展示固定样例，不代表当前余票、实际票价或真实车票查询。真实智能体效果材料应与界面演示明确区分。

![实际运行界面：固定样例三方案比较](assets/demo.jpg)

## 工作方式

1. 百炼 Qwen 智能体理解中断事件及地点、时间、每人预算等条件；未知旅客身份不推断。
2. 飞猪旅行 Skill 使用正式凭据查询交通。具体车站应作为起终站约束逐条核对，未经同意不把换站方案视为同站方案。
3. 将原始结果或完整、准确的归一化候选交给 `buildRescueDecision`。决策服务验证输入，按出发/到达时间、预算与候选参数筛选排序，返回结构化结果。
4. 百炼用用户语言解释方案。英文解释及收紧预算可复用已有查询；无符合条件的方案返回 `no_feasible_plan`。

比较范围是供应商本次实际返回且通过约束检查的候选。搜索排序、返回数量和库存变化会影响候选覆盖，不保证全网最优；不同目标可以选中同一方案。可靠性缺失时的中性值不是成功率。推荐或预订链接不代表购票、付款、改签成功；库存和票价须在交易页面再次确认。

## 本地运行

需要 Node.js 22 与 npm：

```sh
npm ci
npm run dev
```

打开 http://localhost:3000 。固定样例界面不需要飞猪或模型 Key。

生产构建：

```sh
npm run build
npm start
```

## 决策接口

| 接口 | 用途 |
| --- | --- |
| `GET /api/health` | 服务状态 |
| `POST /api/rescue` | 固定样例界面的结构化决策 |
| `POST /api/bailian/rescue` | 带鉴权的结构化 HTTPS 决策 |
| `POST /api/mcp` | 带鉴权的 MCP，工具名 `buildRescueDecision` |

鉴权接口在部署环境设置 `TRIP_RESCUE_PLUGIN_TOKEN`，客户端使用 `Authorization: Bearer <token>`；不依赖 Vercel 浏览器登录 Cookie。真实 Token 只保存在服务配置中。

工具输入：`incidentType`、`userMessage`、`constraints`，以及 `candidates` 或 `providerResults` 二者之一。约束中票价预算按每人计算；实际结果应保留 `providerGeneratedAt` 与 `providerWarnings`。真实票价必须是数字，不猜测体验模式中的遮挡价格。

`/api/rescue` 是面向样例界面的公开结构化决策接口，不会替调用者发起供应商搜索。本仓库不提供公开自然语言查票或自动交易接口。

## 百炼工具接入

```sh
npm run build:hosted-mcp
```

生成目录 `.rescue-mcp/` 包含 stdio 工具配置、完整性校验加载器及基础模式 FC 启动命令。stdio 工具可通过支持该方式的 MCP 网关运行；上传 `loader.cjs` 到支持的 FC 运行环境时，使用生成的 `fc-startup-command.txt`，并配置私有访问与 Bearer 鉴权。该目录是本地构建产物。

在自己的百炼账号创建 Managed Agent，选择支持工具调用的 Qwen 模型，添加“飞猪旅行” Skill 和决策 MCP。新会话选择项目环境，单独配置 `FLYAI_API_KEY`；不假定新会话会继承旧会话的凭据。额度与用完即停应在自己的账号检查。

当前产品会话使用 Qwen3.7-Max。模型承担理解、编排及解释；三方案排序使用本仓库的确定性决策服务。没有在网站中保存 FlyAI Key 或直接调用模型。

## 参赛说明

参赛介绍与两个入口的说明见 [SUBMISSION.md](SUBMISSION.md)。公开效果图只展示产品界面。
