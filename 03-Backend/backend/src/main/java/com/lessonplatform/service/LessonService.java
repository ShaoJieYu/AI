package com.lessonplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lessonplatform.common.BusinessException;
import com.lessonplatform.common.PageQuery;
import com.lessonplatform.common.PageResult;
import com.lessonplatform.dto.LessonGenerateRequest;
import com.lessonplatform.dto.LessonSaveRequest;
import com.lessonplatform.model.LessonContent;
import com.lessonplatform.model.LessonPlan;
import com.lessonplatform.model.Student;
import com.lessonplatform.repository.LessonContentMapper;
import com.lessonplatform.repository.LessonPlanMapper;
import com.lessonplatform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 备课服务类
 */
@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonPlanMapper lessonPlanMapper;
    private final LessonContentMapper lessonContentMapper;
    private final StudentService studentService;
    private final AiService aiService;

    public PageResult<LessonPlan> getLessonPlanList(PageQuery query, String keyword, String status) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Page<LessonPlan> page = new Page<>(query.getPage(), query.getPageSize());

        LambdaQueryWrapper<LessonPlan> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LessonPlan::getTutorId, tutorId);

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(LessonPlan::getTitle, keyword)
                    .or().like(LessonPlan::getSubject, keyword));
        }

        if (StringUtils.hasText(status)) {
            wrapper.eq(LessonPlan::getStatus, status);
        }

        wrapper.orderByDesc(LessonPlan::getCreatedAt);

        Page<LessonPlan> result = lessonPlanMapper.selectPage(page, wrapper);

        return PageResult.of(result.getTotal(), result.getRecords(),
                (int) result.getCurrent(), (int) result.getSize());
    }

    public LessonPlan getLessonPlanById(Long id) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        LessonPlan lessonPlan = lessonPlanMapper.selectOne(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getId, id)
                .eq(LessonPlan::getTutorId, tutorId));

        if (lessonPlan == null) {
            throw new BusinessException("备课记录不存在");
        }

        return lessonPlan;
    }

    public List<LessonContent> getLessonContents(Long lessonPlanId) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        LessonPlan lessonPlan = lessonPlanMapper.selectOne(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getId, lessonPlanId)
                .eq(LessonPlan::getTutorId, tutorId));

        if (lessonPlan == null) {
            throw new BusinessException("备课记录不存在");
        }

        return lessonContentMapper.selectList(new LambdaQueryWrapper<LessonContent>()
                .eq(LessonContent::getLessonPlanId, lessonPlanId)
                .orderByAsc(LessonContent::getSortOrder));
    }

    /**
     * 查询某学生的所有备课记录（按创建时间倒序）。
     * 通过 tutorId 过滤确保只返回当前家教名下的备课，避免越权。
     */
    public List<LessonPlan> getLessonsByStudent(Long studentId) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        return lessonPlanMapper.selectList(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getStudentId, studentId)
                .eq(LessonPlan::getTutorId, tutorId)
                .orderByDesc(LessonPlan::getCreatedAt));
    }

    @Transactional
    public LessonPlan generateLessonPlan(LessonGenerateRequest request) {
        Long tutorId = SecurityUtils.getCurrentUserId();
        Long studentId = request.getStudentId();

        Student student = null;
        if (studentId != null) {
            student = studentService.getStudentById(studentId);
            if (student == null) {
                throw new BusinessException("学生不存在");
            }
        }

        // 难度等级映射：数字星级 → 文字描述
        String difficultyStr = mapDifficulty(request.getDifficulty());

        LessonPlan lessonPlan = new LessonPlan();
        lessonPlan.setTutorId(tutorId);
        lessonPlan.setStudentId(studentId);
        lessonPlan.setSubject(request.getSubject());
        lessonPlan.setTeachingGoal(request.getTopic());
        lessonPlan.setDifficulty(difficultyStr);
        lessonPlan.setEstimatedDuration(String.valueOf(request.getDuration()));
        lessonPlan.setStatus("generating");
        lessonPlan.setGenerateType(request.getMode() != null ? request.getMode() : "new_lesson");

        String title = student != null
                ? (student.getName() + " - " + request.getSubject() + "备课")
                : ("通用 - " + request.getSubject() + "备课");
        lessonPlan.setTitle(title);

        lessonPlanMapper.insert(lessonPlan);

        try {
            Map<String, Object> generateParams = new HashMap<>();
            generateParams.put("student", student);
            generateParams.put("subject", request.getSubject());
            generateParams.put("teachingGoal", request.getTopic());
            generateParams.put("difficulty", difficultyStr);
            generateParams.put("mode", request.getMode());
            generateParams.put("duration", request.getDuration());
            generateParams.put("customRequirements", request.getCustomRequirements());

            Map<String, String> generatedContent = aiService.generateLessonContent(generateParams);

            int sortOrder = 1;

            if (generatedContent.containsKey("coreDefinition")) {
                LessonContent content = new LessonContent();
                content.setLessonPlanId(lessonPlan.getId());
                content.setContentType("core_definition");
                content.setTitle("教材核心原文");
                content.setContent(generatedContent.get("coreDefinition"));
                content.setSortOrder(sortOrder++);
                lessonContentMapper.insert(content);
            }

            if (generatedContent.containsKey("teachingAnalysis")) {
                LessonContent content = new LessonContent();
                content.setLessonPlanId(lessonPlan.getId());
                content.setContentType("teaching_analysis");
                content.setTitle("教学深度剖析");
                content.setContent(generatedContent.get("teachingAnalysis"));
                content.setSortOrder(sortOrder++);
                lessonContentMapper.insert(content);
            }

            if (generatedContent.containsKey("mistakeWarnings")) {
                LessonContent content = new LessonContent();
                content.setLessonPlanId(lessonPlan.getId());
                content.setContentType("mistake_warnings");
                content.setTitle("易错点拨");
                content.setContent(generatedContent.get("mistakeWarnings"));
                content.setSortOrder(sortOrder++);
                lessonContentMapper.insert(content);
            }

            if (generatedContent.containsKey("scoreBoosting")) {
                LessonContent content = new LessonContent();
                content.setLessonPlanId(lessonPlan.getId());
                content.setContentType("score_boosting");
                content.setTitle("提分技巧");
                content.setContent(generatedContent.get("scoreBoosting"));
                content.setSortOrder(sortOrder++);
                lessonContentMapper.insert(content);
            }

            if (generatedContent.containsKey("exampleDerivation")) {
                LessonContent content = new LessonContent();
                content.setLessonPlanId(lessonPlan.getId());
                content.setContentType("example_derivation");
                content.setTitle("经典例题推导");
                content.setContent(generatedContent.get("exampleDerivation"));
                content.setSortOrder(sortOrder);
                lessonContentMapper.insert(content);
            }

            lessonPlan.setStatus("completed");
            lessonPlan.setAiModel("qwen-plus");
            lessonPlanMapper.updateById(lessonPlan);

        } catch (Exception e) {
            lessonPlan.setStatus("failed");
            lessonPlanMapper.updateById(lessonPlan);
            throw new BusinessException("AI生成失败：" + e.getMessage());
        }

        return lessonPlan;
    }

    /**
     * 难度星级映射为文字描述
     * 1-2 星：基础，3-4 星：中等，5 星：提高
     */
    private String mapDifficulty(Integer difficulty) {
        if (difficulty == null) return "中等";
        if (difficulty <= 2) return "基础";
        if (difficulty >= 5) return "提高";
        return "中等";
    }

    /**
     * 直接保存 Agent 已生成的五段式备课内容到数据库（不重复调 AI）。
     *
     * 场景：阶段 1 Agent 自主决策链路（search_textbook → generate_lesson → save_lesson_to_history）
     * 已通过 AI 服务生成完整五段式内容，调用此方法直接持久化，避免重复生成。
     *
     * tutorId 从 SecurityContext 的 JWT 中提取（由 Controller 层鉴权保证）。
     */
    @Transactional
    public LessonPlan saveLessonPlan(LessonSaveRequest request) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        LessonPlan lessonPlan = new LessonPlan();
        lessonPlan.setTutorId(tutorId);
        lessonPlan.setSubject(request.getSubject());
        lessonPlan.setTeachingGoal(request.getTeachingGoal());
        lessonPlan.setDifficulty(request.getDifficulty() != null ? request.getDifficulty() : "中等");
        lessonPlan.setEstimatedDuration(request.getDuration() != null ? String.valueOf(request.getDuration()) : "45");
        lessonPlan.setStatus("completed");
        lessonPlan.setGenerateType(request.getGenerateType() != null ? request.getGenerateType() : "new_lesson");
        lessonPlan.setAiModel("qwen-plus");
        lessonPlan.setTitle("Agent - " + request.getSubject() + "备课 - " + request.getTeachingGoal());

        lessonPlanMapper.insert(lessonPlan);

        int sortOrder = 1;

        if (StringUtils.hasText(request.getCoreDefinition())) {
            LessonContent content = new LessonContent();
            content.setLessonPlanId(lessonPlan.getId());
            content.setContentType("core_definition");
            content.setTitle("教材核心原文");
            content.setContent(request.getCoreDefinition());
            content.setSortOrder(sortOrder++);
            lessonContentMapper.insert(content);
        }

        if (StringUtils.hasText(request.getTeachingAnalysis())) {
            LessonContent content = new LessonContent();
            content.setLessonPlanId(lessonPlan.getId());
            content.setContentType("teaching_analysis");
            content.setTitle("教学深度剖析");
            content.setContent(request.getTeachingAnalysis());
            content.setSortOrder(sortOrder++);
            lessonContentMapper.insert(content);
        }

        if (StringUtils.hasText(request.getMistakeWarnings())) {
            LessonContent content = new LessonContent();
            content.setLessonPlanId(lessonPlan.getId());
            content.setContentType("mistake_warnings");
            content.setTitle("易错点拨");
            content.setContent(request.getMistakeWarnings());
            content.setSortOrder(sortOrder++);
            lessonContentMapper.insert(content);
        }

        if (StringUtils.hasText(request.getScoreBoosting())) {
            LessonContent content = new LessonContent();
            content.setLessonPlanId(lessonPlan.getId());
            content.setContentType("score_boosting");
            content.setTitle("提分技巧");
            content.setContent(request.getScoreBoosting());
            content.setSortOrder(sortOrder++);
            lessonContentMapper.insert(content);
        }

        if (StringUtils.hasText(request.getExampleDerivation())) {
            LessonContent content = new LessonContent();
            content.setLessonPlanId(lessonPlan.getId());
            content.setContentType("example_derivation");
            content.setTitle("经典例题推导");
            content.setContent(request.getExampleDerivation());
            content.setSortOrder(sortOrder);
            lessonContentMapper.insert(content);
        }

        return lessonPlan;
    }

    public void deleteLessonPlan(Long id) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        LessonPlan lessonPlan = lessonPlanMapper.selectOne(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getId, id)
                .eq(LessonPlan::getTutorId, tutorId));

        if (lessonPlan == null) {
            throw new BusinessException("备课记录不存在");
        }

        lessonContentMapper.delete(new LambdaQueryWrapper<LessonContent>()
                .eq(LessonContent::getLessonPlanId, id));

        lessonPlanMapper.deleteById(id);
    }

    public Map<String, Object> getLessonStatistics() {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Long totalPlans = lessonPlanMapper.selectCount(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getTutorId, tutorId));

        Long completedPlans = lessonPlanMapper.selectCount(new LambdaQueryWrapper<LessonPlan>()
                .eq(LessonPlan::getTutorId, tutorId)
                .eq(LessonPlan::getStatus, "completed"));

        Long studentCount = studentService.getAllStudents().stream().count();

        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalPlans", totalPlans);
        statistics.put("completedPlans", completedPlans);
        statistics.put("studentCount", studentCount);
        statistics.put("aiUsageCount", completedPlans);

        return statistics;
    }
}
