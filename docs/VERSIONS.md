# OpenEvolant 版本目标 | Version Goals

每个版本做什么。

---

## v0.1

- 在自有 Web GUI 里起一个任务意图（不接 Telegram、Discord 等外部 Bot）。
- 任务意图对应一个新的skill或者已经安装的skill(开始生成.genes)
- 选择对应的评估配置，给与时间，金钱，循环次数 以及 评估分中断条件（太好中断之类的)之后开始循环执行agent

- 在自有 Web GUI 里做进化管理：看/管基因池（`.genes`）、评估配置（`.evaluator`），触发或观察进化运行，看简单统计与可视化。
- Genes Agent Runner 每个session有历史记录，有memory能够执行tools和skills等，定时，定量执行;genes保存每次迭代的信息,skills
- 评估系统，evaalutor提供了ai评估，钱，时间等简单多维度评估每次结果
- llm api能接入和配置不同的大模型，首先支持kimi k2


---

## v0.2（待定）

- 接入外部 Bot（如 Telegram、Discord 等）。提供自然语言使用界面来实操我们的skills
- 多通道适配、多端会话等（具体待定）。
- genes平台(包含不同版本skill)

- 定时出一个任务结果
- 夜晚才进化



---

## 后续版本

视需求再补充。
