# Agent 阶段 1 升级与联调排查记录

> 记录时间：2026-06-28
> 关联分支：`feat/agent-stage1-function-calling`
> 升级目标：把"代码硬编码调 AI"升级为"AI 自主决策调用工具"（Function Calling）

---

## 一、本次改动清单

### 1. AI 服务 - Agent 核心模块（新增）
- `04-AI-Service/ai-service/agent/tools.py`：JSON Schema 定义 3 个工具
  - `search_textbook`：搜索教材内容（阶段 1 用静态模拟数据）
  - `generate_lesson`：生成五段式备课内容（复用 tongyi_service）
  - `save_lesson_to_history`：把已生成内容保存到后端数据库
- `04-AI-Service/ai-service/agent/tool_executor.py`：工具执行器，支持 token 透传
- `04-AI-Service/ai-service/agent/agent_core.py`：Agent Loop 决策循环，最大 10 轮

### 2. AI 服务 - Agent 端点
- `04-AI-Service/ai-service/main.py`：新增 `POST /api/agent/demo`，接收 `Authorization` header

### 3. 后端 - Agent 入库接口
- `dto/LessonSaveRequest.java`：Agent 入库请求 DTO
- `service/LessonService.saveLessonPlan`：直接持久化 Agent 已生成内容，不重复调 AI
- `controller/LessonController.saveLessonPlan`：`POST /lessons/save` 端点

### 4. 前端 - Agent 测试页 + 备课历史删除
- `api/agent.ts`：独立 axios 实例直连 AI 服务 8001 端口
- `pages/Agent/AgentDemoPage.tsx`：自然语言输入 + Steps 决策过程可视化
- `App.tsx` / `MainLayout.tsx`：路由 + 菜单项
- `pages/Lesson/LessonHistoryPage.tsx`：操作列加 Popconfirm 删除按钮

---

## 二、遇到的问题与解决方案

### 问题 1：AgentDemoPage.tsx 语法错误

**现象**：两个 useState 合并成了一行
```tsx
// 错误代码
const [result, setResult] = useState<AgentResponse | null>(const [error, setError] = useState<string>('');
```

**根因**：手误把两个 useState 写到了一行

**解决**：拆分成两行
```tsx
const [result, setResult] = useState<AgentResponse | null>(null);
const [error, setError] = useState<string>('');
```

---

### 问题 2：PowerShell curl 引号转义问题

**现象**：用 curl 测试 Agent 端点时，JSON body 里的引号被 PowerShell 错误解析，返回 JSON decode error

**根因**：PowerShell 对单引号/双引号的处理与 bash 不同，curl 命令里的 JSON 无法原样传递

**解决**：把 JSON 写入文件，用 `-d @文件路径` 方式传参
```powershell
# 把 JSON 写入 test_agent.json
{"message": "帮我备一节静电场的物理课"}

# 用文件方式传参
curl -X POST http://localhost:8001/api/agent/demo -H "Content-Type: application/json" -d @test_agent.json
```

---

### 问题 3：8001 端口被占用

**现象**：重启 AI 服务时提示端口被占用

**根因**：旧 AI 服务进程没退出

**解决**：用 `netstat -ano | findstr :8001` 找到 PID，然后 `taskkill /PID <pid> /F`

```powershell
# 查找占用端口的进程
netstat -ano | findstr ":8001" | findstr "LISTENING"
# 输出：TCP    0.0.0.0:8001    ...    LISTENING    23480

# 杀掉进程
taskkill /PID 23480 /F
```

---

### 问题 4：save_lesson_to_history 返回"缺少用户身份凭证（token）"

**现象**：Agent 决策链跑到第 3 步 save_lesson_to_history 时报错
```
错误：缺少用户身份凭证（token），无法保存到备课历史。
```

**根因**：token 没从前端透传到 AI 服务。原因有二：
1. `agent.ts` 的 axios 实例没注入 JWT token（默认拦截器在 `client.ts` 里，agent.ts 是独立实例）
2. `main.py` 端点没接收 Authorization header
3. `run_agent` 函数没把 token 传给 `execute_tool`

**解决**：补全 token 透传链路
```typescript
// agent.ts - 加请求拦截器
agentClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

```python
# main.py - 端点接收 Authorization header
@app.post("/api/agent/demo")
def agent_demo(request: AgentRequest, authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    result = run_agent(request.message, token=token)
    return result
```

```python
# agent_core.py - 透传 token 给 execute_tool
result = execute_tool(func_name, func_args, token=token)

# tool_executor.py - save_lesson_to_history 调后端时带上 token
headers = {"Authorization": f"Bearer {_token}", ...}
resp = requests.post(f"{BACKEND_URL}/lessons/save", json=payload, headers=headers)
```

---

### 问题 5：前端 timeout of 120000ms exceeded

**现象**：浏览器测 Agent demo，2 分钟后报超时

**根因**：Agent 链路含 3 次工具调用 + 3-4 轮模型决策：
- search_textbook：1-2 秒（静态数据）
- generate_lesson：60-80 秒（通义千问生成 3000+ 字带 LaTeX 公式）
- save_lesson_to_history：1-2 秒
- 3-4 轮模型决策：每轮 5-10 秒
- **累计 100-150 秒**，超过前端 120 秒 timeout

**解决**：把 agent.ts 的 timeout 从 120 秒放宽到 300 秒
```typescript
const agentClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 300000,  // 从 120000 放宽到 300000
  headers: { 'Content-Type': 'application/json' },
});
```

---

### 问题 6：git push 报 "Empty reply from server" / "Connection reset"

**现象**：推送代码到 GitHub 时连续报错
```
fatal: unable to access 'https://github.com/ShaoJieYu/AI.git/': Empty reply from server
fatal: unable to access 'https://github.com/ShaoJieYu/AI.git/': Recv failure: Connection was reset
fatal: unable to access 'https://github.com/ShaoJieYu/AI.git/': Failed to connect to github.com port 443
```

**根因**：国内访问 GitHub 需要走代理，但 git 默认不走系统代理

**排查**：先确认代理端口
```powershell
netstat -ano | findstr ":7890 :1080 :10809 :7897" | findstr "LISTENING"
# 输出：TCP    127.0.0.1:7890    ...    LISTENING    25868  → Clash 默认端口
```

**解决**：给 git 全局配置代理
```powershell
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

**取消代理**（如果以后关了 Clash 又想推送）：
```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

### 问题 7：GitHub PR 报 "entirely different commit histories"

**现象**：推送 `feat/agent-stage1-function-calling` 分支后，在 GitHub 网页创建 PR 时提示
```
There isn't anything to compare.
main and feat/agent-stage1-function-calling are entirely different commit histories.
```

**根因**：本地 main 和 GitHub 远程 main 没有共同祖先
- GitHub 远程 main 的初始 commit 是 `ce5b532f 1`（早期网页直接提交的不规范历史）
- 本地分支的初始 commit 是 `fef36bd0 chore(repo): add .gitignore...`（重新 init 的规范历史）
- 两条历史线完全独立，GitHub 拒绝合并

**排查**：
```powershell
git fetch origin main
git log --oneline origin/main -5
# 输出：4b96e5e8 feat: Implement the initial... / 79dbf793 feat: Add new... / 371cce97 fix: 合并前端... / f5dfe534 完成 MVP 核心功能 / ce5b532f 1
```

**解决**：用本地规范历史强制覆盖远程 main（方案 A）
```powershell
# 1. 切到本地 main
git checkout main

# 2. 重置到规范分支的历史
git reset --hard feat/agent-stage1-function-calling

# 3. 强制推送覆盖远程 main
git push -u origin main --force
```

**权衡**：
- 方案 A（采用）：用本地规范历史覆盖，丢弃远程不规范的 5 个 commit（"1"、"完成 MVP 核心功能"这种）
- 方案 B（未采用）：`git merge origin/main --allow-unrelated-histories` 保留两边历史，但会保留不规范 commit 且产生 merge commit

---

### 问题 8：git reset --hard 报 "unable to unlink redis-server.exe"

**现象**：执行 `git reset --hard feat/agent-stage1-function-calling` 时报错
```
error: unable to unlink old '05-Infrastructure/redis/redis-server.exe': Invalid argument
fatal: Could not reset index file to revision 'feat/agent-stage1-function-calling'.
```

**根因**：redis-server.exe 正在运行，文件被进程占用，git 无法替换

**解决**：先杀掉 redis 进程再 reset
```powershell
# 查找 redis 进程
tasklist | findstr /I "redis"
# 输出：redis-server.exe    14988    Console    1    15,356 K

# 杀掉
taskkill /PID 14988 /F

# 重新 reset
git reset --hard feat/agent-stage1-function-calling

# reset 完成后重启 redis
Start-Process -FilePath "D:\AI\05-Infrastructure\redis\redis-server.exe" -WorkingDirectory "D:\AI\05-Infrastructure\redis" -WindowStyle Hidden
```

---

### 问题 9：PowerShell heredoc 语法问题

**现象**：用 `git commit -m "$(cat <<'EOF' ... EOF)"` 写多行 commit message 时报错
```
ParserError:
  15 |  … s\app\node_modules\@vscode\ripgrep\bin'; git commit -m "$(cat <<'EOF'
     |                                                                   ~
     | Missing file specification after redirection operator.
```

**根因**：PowerShell 不支持 bash 的 heredoc 语法（`<<'EOF'`）

**解决**：把 commit message 写入临时文件，用 `-F` 参数传给 git
```powershell
# 1. 把 commit message 写入 .git-commit-msg.txt
# 2. 用 -F 参数提交
git commit -F .git-commit-msg.txt
# 3. 提交后删除临时文件
```

---

## 三、最终验证结果

Agent 链路完整跑通：

```
用户输入："帮我备一节静电场的物理课，难度中等，45分钟"
    ↓
第 1 步：Agent 决策调用 search_textbook
    ↓ 返回教材片段（库仑定律、电场强度定义）
第 2 步：Agent 决策调用 generate_lesson
    ↓ 返回五段式完整内容（3000+ 字，含 LaTeX 公式）
第 3 步：Agent 决策调用 save_lesson_to_history
    ↓ 返回"保存成功！备课记录已入库，ID=xxx"
第 4 步：Agent 给出最终总结
    ↓
用户在备课历史页面看到新记录，可查看/删除/导出 PDF
```

总耗时约 145 秒，前端 timeout 放宽到 300 秒后不再超时。

---

## 四、Git 提交记录

按工程依赖顺序分 4 次提交（Conventional Commits 规范）：

| Commit | 类型 | 说明 |
|--------|------|------|
| `d1167f7` | feat(ai-service) | Agent 核心模块（tools/executor/core） |
| `bbbfc51` | feat(ai-service) | Agent demo 端点 + token 透传 |
| `ad7452a` | feat(backend) | /lessons/save 接口 |
| `0b0fb26` | feat(frontend) | Agent 测试页 + 备课历史删除按钮 |

最终通过 `git push -u origin main --force` 把规范历史覆盖到 GitHub 远程 main。

---

## 五、常用排查命令速查

### 端口占用
```powershell
netstat -ano | findstr ":8001 :8080 :3000" | findstr "LISTENING"
taskkill /PID <pid> /F
```

### 进程占用文件（无法删除/替换时）
```powershell
tasklist | findstr /I "redis python java node"
taskkill /PID <pid> /F
```

### GitHub 网络问题
```powershell
# 检查代理端口
netstat -ano | findstr ":7890 :1080" | findstr "LISTENING"
# 配置 git 代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### Git 历史不一致
```powershell
# 查看远程分支历史
git fetch origin main
git log --oneline origin/main -5
# 查看所有分支关系
git log --oneline --all --graph -10
```

### curl 测试 AI 服务（PowerShell 兼容）
```powershell
# 把 JSON 写入文件避免引号转义问题
'{"message": "帮我备一节静电场的物理课"}' | Out-File -Encoding utf8 test_agent.json
curl -X POST http://localhost:8001/api/agent/demo -H "Content-Type: application/json" -d @test_agent.json
```

---

## 六、下一步规划

阶段 1（Function Calling）已完成，下一阶段进入：

**阶段 2：RAG 检索增强 + 记忆**
- 把 `search_textbook` 工具的静态模拟数据替换为 Chroma 向量库真实检索
- 教材内容向量化（text-embedding-v2）+ 切分 + 入库
- 学生画像记忆（错题历史、薄弱点、备课历史）

详见 `project_memory.md` 中的"Agent 升级路线图"。
