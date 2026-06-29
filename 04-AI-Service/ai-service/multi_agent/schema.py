"""
4 个 Agent 输出的 pydantic 校验模型

这是第 3 层保障（JSON Schema 校验）的核心。
LLM 输出 JSON 后，立即用 pydantic 模型校验，失败则进入第 4 层兜底修复。

每个模型对应一个 Agent 的输出格式：
- TeachingDesign: 教学设计 Agent 输出（五段式骨架）
- ContentDraft: 内容生成 Agent 输出（五段式完整内容）
- QaResult: 质检 Agent 输出（三维评分 + issue_type 路由字段）
- ExportResult: 导出 Agent 输出（优化后内容 + PDF URL）
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional, Dict, Any


# ============================================================
# 学科枚举（共用）
# ============================================================
Subject = Literal["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]
Difficulty = Literal["简单", "中等", "困难"]
IssueType = Literal["content", "structure", "none"]


# ============================================================
# 教学设计 Agent 输出模型
# ============================================================
class Section(BaseModel):
    """五段式中的单个段落设计"""
    section: str = Field(..., description="段落名称，如 导入")
    method: str = Field(..., description="教学方法，如 情境引入")
    duration_min: int = Field(..., ge=1, le=60, description="该段落预计时长（分钟）")


class TeachingDesign(BaseModel):
    """
    教学设计 Agent 的输出模型。

    包含课程主题、学科、难度、时长、教学目标、重难点、五段式结构。
    """
    topic: str = Field(..., description="课程主题")
    subject: Subject = Field(..., description="学科（中文）：物理/化学/生物/数学/英语/语文/历史/地理/政治")
    difficulty: Difficulty = Field("中等", description="难度等级")
    duration: int = Field(45, ge=20, le=90, description="课程总时长（分钟）")
    objectives: List[str] = Field(..., min_length=1, max_length=5, description="教学目标列表")
    key_points: List[str] = Field(..., min_length=1, max_length=5, description="重难点列表")
    structure: List[Section] = Field(..., description="五段式结构")

    @field_validator("structure")
    @classmethod
    def must_be_five_sections(cls, v):
        """强制五段式：段落数必须为 5"""
        if len(v) != 5:
            raise ValueError(f"段落数应为 5，实际 {len(v)}")
        return v


# ============================================================
# 内容生成 Agent 输出模型
# ============================================================
class ContentDraft(BaseModel):
    """
    内容生成 Agent 的输出模型。

    五段式完整内容，对应 tongyi_service 的五段式输出。
    """
    topic: str = Field(..., description="课程主题（与教学设计一致）")
    subject: Subject = Field(..., description="学科（中文），与教学设计一致")
    coreDefinition: str = Field(..., description="教材核心原文")
    teachingAnalysis: str = Field(..., description="教学深度剖析")
    mistakeWarnings: str = Field(..., description="易错点拨")
    scoreBoosting: str = Field(..., description="提分技巧")
    exampleDerivation: str = Field(..., description="经典例题推导")

    @field_validator("coreDefinition", "teachingAnalysis", "mistakeWarnings", "scoreBoosting", "exampleDerivation")
    @classmethod
    def sections_must_not_be_empty(cls, v):
        """五个段落都不能为空"""
        if not v or not v.strip():
            raise ValueError("段落内容不能为空")
        return v


# ============================================================
# 质检 Agent 输出模型
# ============================================================
class DimensionScore(BaseModel):
    """单个维度的评分"""
    score: int = Field(..., ge=0, le=100, description="0-100 分")
    threshold: int = Field(..., ge=0, le=100, description="达标阈值")
    issues: List[str] = Field(default_factory=list, description="该维度的问题清单")


class QaResult(BaseModel):
    """
    质检 Agent 的输出模型。

    三维评分（准确性/排版/公式）+ issue_type 路由字段。
    issue_type 是工作流条件路由的依据，必须从 [content, structure, none] 中选一个。
    """
    dimensions: Dict[str, DimensionScore] = Field(
        ...,
        description="三维评分：accuracy/format/formula"
    )
    overall_pass: bool = Field(..., description="是否整体通过")
    issue_type: IssueType = Field(..., description="问题类型，决定路由到哪个 Agent")
    retry_suggestion: str = Field("", description="重做建议（给内容生成 Agent 的修复指导）")
    forced_pass: bool = Field(False, description="是否强制通过（超过 max_retry 后）")

    @field_validator("dimensions")
    @classmethod
    def must_have_three_dimensions(cls, v):
        """必须包含 accuracy/format/formula 三个维度"""
        required = {"accuracy", "format", "formula"}
        actual = set(v.keys())
        if not required.issubset(actual):
            raise ValueError(f"dimensions 必须包含 {required}，实际 {actual}")
        return v

    @field_validator("issue_type")
    @classmethod
    def issue_type_consistent_with_pass(cls, v, info):
        """overall_pass=True 时 issue_type 必须为 none"""
        if info.data.get("overall_pass") is True and v != "none":
            raise ValueError("overall_pass=True 时 issue_type 必须为 none")
        return v


# ============================================================
# 导出 Agent 输出模型
# ============================================================
class ExportResult(BaseModel):
    """
    导出 Agent 的输出模型。

    排版优化后的完整内容 + PDF 下载 URL。
    """
    optimized_content: str = Field(..., description="排版优化后的完整 Markdown 内容")
    pdf_url: Optional[str] = Field(None, description="PDF 下载 URL（如果导出成功）")
    export_status: Literal["success", "failed"] = Field(..., description="导出状态")
    forced_pass_note: Optional[str] = Field(None, description="如果是强制通过，标注质检未完全通过")


# ============================================================
# ReAct 思考过程记录模型（agent_trace 中单条记录的格式）
# ============================================================
class ReactTraceStep(BaseModel):
    """ReAct 循环中的单步记录"""
    step: int = Field(..., description="步骤序号")
    type: Literal["thought", "action", "observation", "final_answer"] = Field(...)
    content: str = Field("", description="思考内容或观察结果")
    name: Optional[str] = Field(None, description="工具名（type=action 时）")
    input: Optional[Dict] = Field(None, description="工具输入（type=action 时）")


class AgentTraceRecord(BaseModel):
    """agent_trace 中的单条 Agent 执行记录"""
    agent: str = Field(..., description="Agent 名称")
    node: str = Field(..., description="工作流节点名")
    input_summary: str = Field("", description="输入摘要")
    output_summary: str = Field("", description="输出摘要")
    react_trace: List[Dict[str, Any]] = Field(default_factory=list, description="ReAct 思考过程")
    duration_ms: int = Field(0, description="执行耗时（毫秒）")
    timestamp: str = Field("", description="执行时间戳")
    retry_attempt: int = Field(0, description="第几次执行（0=首次，1=第1次重做）")
