"""
schema.py 的单元测试

验证 4 个 pydantic 模型能正确解析合法数据、拒绝非法数据。
运行方式：python -m pytest test_schema.py -v
或直接运行：python test_schema.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pydantic import ValidationError
from multi_agent.schema import (
    TeachingDesign,
    Section,
    ContentDraft,
    QaResult,
    DimensionScore,
    ExportResult,
)


def test_section_valid():
    """测试 Section 合法数据"""
    s = Section(section="导入", method="情境引入", duration_min=5)
    assert s.section == "导入"
    assert s.duration_min == 5


def test_section_invalid_duration():
    """测试 duration_min 超出范围"""
    try:
        Section(section="导入", method="情境引入", duration_min=0)
        assert False, "应该抛出 ValidationError"
    except ValidationError:
        pass

    try:
        Section(section="导入", method="情境引入", duration_min=120)
        assert False, "应该抛出 ValidationError"
    except ValidationError:
        pass


def test_teaching_design_valid():
    """测试 TeachingDesign 合法数据（五段式）"""
    mock = {
        "topic": "静电场",
        "subject": "physics",
        "difficulty": "中等",
        "duration": 45,
        "objectives": ["理解电场强度概念", "掌握点电荷电场计算"],
        "key_points": ["电场强度定义", "点电荷电场公式"],
        "structure": [
            {"section": "导入", "method": "情境引入", "duration_min": 5},
            {"section": "新知讲解", "method": "讲授+演示", "duration_min": 15},
            {"section": "例题精讲", "method": "示范", "duration_min": 10},
            {"section": "练习巩固", "method": "学生练习", "duration_min": 10},
            {"section": "总结提升", "method": "归纳", "duration_min": 5},
        ],
    }
    design = TeachingDesign(**mock)
    assert design.topic == "静电场"
    assert design.duration == 45
    assert len(design.structure) == 5


def test_teaching_design_reject_wrong_section_count():
    """测试段落数不为 5 时被拒绝"""
    mock = {
        "topic": "静电场",
        "subject": "physics",
        "difficulty": "中等",
        "duration": 45,
        "objectives": ["理解电场强度"],
        "key_points": ["电场强度"],
        "structure": [
            {"section": "导入", "method": "情境引入", "duration_min": 5},
            {"section": "新知讲解", "method": "讲授", "duration_min": 40},
        ],  # 只有 2 段，应该被拒绝
    }
    try:
        TeachingDesign(**mock)
        assert False, "应该抛出 ValidationError（段落数应为 5）"
    except ValidationError as e:
        assert "5" in str(e)


def test_teaching_design_reject_invalid_difficulty():
    """测试难度等级不在枚举内时被拒绝"""
    mock = {
        "topic": "测试",
        "subject": "physics",
        "difficulty": "超难",  # 不在枚举内
        "duration": 45,
        "objectives": ["目标"],
        "key_points": ["重点"],
        "structure": [
            {"section": "导入", "method": "引入", "duration_min": 5},
            {"section": "新知", "method": "讲授", "duration_min": 15},
            {"section": "例题", "method": "示范", "duration_min": 10},
            {"section": "练习", "method": "练习", "duration_min": 10},
            {"section": "总结", "method": "归纳", "duration_min": 5},
        ],
    }
    try:
        TeachingDesign(**mock)
        assert False, "应该抛出 ValidationError（难度等级非法）"
    except ValidationError:
        pass


def test_content_draft_valid():
    """测试 ContentDraft 合法数据"""
    mock = {
        "topic": "静电场",
        "subject": "physics",
        "coreDefinition": "电场强度是描述电场强弱和方向的物理量...",
        "teachingAnalysis": "本节核心模型是电场概念...",
        "mistakeWarnings": "易错点1：电场强度方向判断错误...",
        "scoreBoosting": "解题套路1：先判断电荷正负...",
        "exampleDerivation": "例题1：已知点电荷 Q=1C...",
    }
    draft = ContentDraft(**mock)
    assert draft.topic == "静电场"
    assert len(draft.coreDefinition) > 0


def test_content_draft_reject_empty_section():
    """测试段落内容为空时被拒绝"""
    mock = {
        "topic": "静电场",
        "subject": "physics",
        "coreDefinition": "",  # 空
        "teachingAnalysis": "有内容",
        "mistakeWarnings": "有内容",
        "scoreBoosting": "有内容",
        "exampleDerivation": "有内容",
    }
    try:
        ContentDraft(**mock)
        assert False, "应该抛出 ValidationError（段落不能为空）"
    except ValidationError:
        pass


def test_qa_result_pass():
    """测试 QaResult 通过场景"""
    mock = {
        "dimensions": {
            "accuracy": {"score": 90, "threshold": 80, "issues": []},
            "format": {"score": 88, "threshold": 75, "issues": []},
            "formula": {"score": 85, "threshold": 80, "issues": []},
        },
        "overall_pass": True,
        "issue_type": "none",
        "retry_suggestion": "",
    }
    qa = QaResult(**mock)
    assert qa.overall_pass is True
    assert qa.issue_type == "none"


def test_qa_result_reject_with_content_issue():
    """测试 QaResult 不通过 + content 问题类型"""
    mock = {
        "dimensions": {
            "accuracy": {"score": 88, "threshold": 80, "issues": []},
            "format": {"score": 92, "threshold": 75, "issues": []},
            "formula": {"score": 65, "threshold": 80, "issues": ["公式错误"]},
        },
        "overall_pass": False,
        "issue_type": "content",
        "retry_suggestion": "修复公式",
    }
    qa = QaResult(**mock)
    assert qa.overall_pass is False
    assert qa.issue_type == "content"


def test_qa_result_reject_inconsistent_pass_and_issue_type():
    """测试 overall_pass=True 但 issue_type 不是 none 时被拒绝"""
    mock = {
        "dimensions": {
            "accuracy": {"score": 90, "threshold": 80, "issues": []},
            "format": {"score": 88, "threshold": 75, "issues": []},
            "formula": {"score": 85, "threshold": 80, "issues": []},
        },
        "overall_pass": True,
        "issue_type": "content",  # 矛盾：pass=True 时 issue_type 必须为 none
    }
    try:
        QaResult(**mock)
        assert False, "应该抛出 ValidationError（pass=True 时 issue_type 必须为 none）"
    except ValidationError:
        pass


def test_qa_result_reject_missing_dimension():
    """测试缺少维度时被拒绝"""
    mock = {
        "dimensions": {
            "accuracy": {"score": 90, "threshold": 80, "issues": []},
            "format": {"score": 88, "threshold": 75, "issues": []},
            # 缺 formula 维度
        },
        "overall_pass": True,
        "issue_type": "none",
    }
    try:
        QaResult(**mock)
        assert False, "应该抛出 ValidationError（必须包含三个维度）"
    except ValidationError:
        pass


def test_export_result_valid():
    """测试 ExportResult 合法数据"""
    mock = {
        "optimized_content": "# 静电场\n\n## 教材核心原文\n...",
        "pdf_url": "http://example.com/lesson.pdf",
        "export_status": "success",
        "forced_pass_note": None,
    }
    result = ExportResult(**mock)
    assert result.export_status == "success"
    assert result.pdf_url is not None


def test_export_result_forced_pass():
    """测试 ExportResult 强制通过场景"""
    mock = {
        "optimized_content": "# 静电场\n...",
        "pdf_url": None,
        "export_status": "success",
        "forced_pass_note": "质检未完全通过（重做 3 次后强制导出）",
    }
    result = ExportResult(**mock)
    assert result.forced_pass_note is not None
    assert "强制" in result.forced_pass_note


def run_all_tests():
    """运行所有测试"""
    tests = [
        ("test_section_valid", test_section_valid),
        ("test_section_invalid_duration", test_section_invalid_duration),
        ("test_teaching_design_valid", test_teaching_design_valid),
        ("test_teaching_design_reject_wrong_section_count", test_teaching_design_reject_wrong_section_count),
        ("test_teaching_design_reject_invalid_difficulty", test_teaching_design_reject_invalid_difficulty),
        ("test_content_draft_valid", test_content_draft_valid),
        ("test_content_draft_reject_empty_section", test_content_draft_reject_empty_section),
        ("test_qa_result_pass", test_qa_result_pass),
        ("test_qa_result_reject_with_content_issue", test_qa_result_reject_with_content_issue),
        ("test_qa_result_reject_inconsistent_pass_and_issue_type", test_qa_result_reject_inconsistent_pass_and_issue_type),
        ("test_qa_result_reject_missing_dimension", test_qa_result_reject_missing_dimension),
        ("test_export_result_valid", test_export_result_valid),
        ("test_export_result_forced_pass", test_export_result_forced_pass),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {str(e)}")
            failed += 1

    print(f"\n测试结果：{passed} 通过，{failed} 失败，共 {len(tests)} 个测试")
    return failed == 0


if __name__ == "__main__":
    print("=" * 60)
    print("运行 multi_agent/schema.py 的单元测试")
    print("=" * 60)
    success = run_all_tests()
    sys.exit(0 if success else 1)
