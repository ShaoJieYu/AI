package com.lessonplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lessonplatform.common.BusinessException;
import com.lessonplatform.common.PageQuery;
import com.lessonplatform.common.PageResult;
import com.lessonplatform.dto.StudentFormDTO;
import com.lessonplatform.model.Student;
import com.lessonplatform.repository.StudentMapper;
import com.lessonplatform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;

/**
 * 学生服务类
 */
@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentMapper studentMapper;

    public PageResult<Student> getStudentList(PageQuery query, String keyword, String status) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Page<Student> page = new Page<>(query.getPage(), query.getPageSize());

        LambdaQueryWrapper<Student> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Student::getTutorId, tutorId);

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Student::getName, keyword)
                    .or().like(Student::getSchool, keyword)
                    .or().like(Student::getParentName, keyword));
        }

        if (StringUtils.hasText(status)) {
            wrapper.eq(Student::getStatus, status);
        }

        wrapper.orderByDesc(Student::getCreatedAt);

        Page<Student> result = studentMapper.selectPage(page, wrapper);

        return PageResult.of(result.getTotal(), result.getRecords(),
                (int) result.getCurrent(), (int) result.getSize());
    }

    public Student getStudentById(Long id) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Student student = studentMapper.selectOne(new LambdaQueryWrapper<Student>()
                .eq(Student::getId, id)
                .eq(Student::getTutorId, tutorId));

        if (student == null) {
            throw new BusinessException("学生不存在");
        }

        return student;
    }

    public Student createStudent(StudentFormDTO dto) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Student student = new Student();
        student.setTutorId(tutorId);
        student.setName(dto.getName());
        student.setGender(dto.getGender());
        student.setAge(dto.getAge());
        student.setGrade(dto.getGrade());
        student.setSchool(dto.getSchool());
        student.setCurrentSubject(dto.getCurrentSubject());
        student.setWeakSubjects(dto.getWeakSubjects());
        student.setLearningBasics(dto.getLearningBasics());
        student.setStudyHabits(dto.getStudyHabits());
        student.setPersonality(dto.getPersonality());
        student.setParentName(dto.getParentName());
        student.setParentContact(dto.getParentContact());
        student.setStatus(dto.getStatus() != null ? dto.getStatus() : "active");
        student.setTags(dto.getTags());
        student.setRemark(dto.getRemark());
        student.setMidtermTarget(dto.getMidtermTarget() != null ? dto.getMidtermTarget() : 75);
        student.setKnowledgeMastery(dto.getKnowledgeMastery() != null ? dto.getKnowledgeMastery() : 60);
        student.setHomeworkCompletion(dto.getHomeworkCompletion() != null ? dto.getHomeworkCompletion() : 85);

        studentMapper.insert(student);
        return student;
    }

    public Student updateStudent(Long id, StudentFormDTO dto) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Student student = studentMapper.selectOne(new LambdaQueryWrapper<Student>()
                .eq(Student::getId, id)
                .eq(Student::getTutorId, tutorId));

        if (student == null) {
            throw new BusinessException("学生不存在");
        }

        student.setName(dto.getName());
        student.setGender(dto.getGender());
        student.setAge(dto.getAge());
        student.setGrade(dto.getGrade());
        student.setSchool(dto.getSchool());
        student.setCurrentSubject(dto.getCurrentSubject());
        student.setWeakSubjects(dto.getWeakSubjects());
        student.setLearningBasics(dto.getLearningBasics());
        student.setStudyHabits(dto.getStudyHabits());
        student.setPersonality(dto.getPersonality());
        student.setParentName(dto.getParentName());
        student.setParentContact(dto.getParentContact());
        student.setStatus(dto.getStatus());
        student.setTags(dto.getTags());
        student.setRemark(dto.getRemark());
        student.setMidtermTarget(dto.getMidtermTarget());
        student.setKnowledgeMastery(dto.getKnowledgeMastery());
        student.setHomeworkCompletion(dto.getHomeworkCompletion());

        studentMapper.updateById(student);
        return student;
    }

    public void deleteStudent(Long id) {
        Long tutorId = SecurityUtils.getCurrentUserId();

        Student student = studentMapper.selectOne(new LambdaQueryWrapper<Student>()
                .eq(Student::getId, id)
                .eq(Student::getTutorId, tutorId));

        if (student == null) {
            throw new BusinessException("学生不存在");
        }

        studentMapper.deleteById(id);
    }

    public List<Student> getAllStudents() {
        Long tutorId = SecurityUtils.getCurrentUserId();

        return studentMapper.selectList(new LambdaQueryWrapper<Student>()
                .eq(Student::getTutorId, tutorId)
                .eq(Student::getStatus, "active")
                .orderByDesc(Student::getCreatedAt));
    }

    /**
     * 获取学生学情档案。
     * 当前 student 表已包含 weak_subjects / learning_basics / study_habits / personality 等文本字段，
     * 这里将其映射为前端 StudentProfile 结构。后续若新增独立 profile 表可替换此实现。
     */
    public Map<String, Object> getStudentProfile(Long id) {
        Student student = getStudentById(id);

        Map<String, Object> profile = new HashMap<>();
        profile.put("studentId", id);

        // academicLevel 由 knowledgeMastery 推导：>=85 优秀 / >=70 良好 / >=60 中等 / 其他 薄弱
        Integer km = student.getKnowledgeMastery();
        if (km != null) {
            if (km >= 85) {
                profile.put("academicLevel", "excellent");
            } else if (km >= 70) {
                profile.put("academicLevel", "good");
            } else if (km >= 60) {
                profile.put("academicLevel", "medium");
            } else {
                profile.put("academicLevel", "weak");
            }
        }

        // weakSubjects: 逗号分隔字符串 → 数组
        if (StringUtils.hasText(student.getWeakSubjects())) {
            profile.put("weakSubjects", Arrays.asList(student.getWeakSubjects().split("[,，]")));
        } else {
            profile.put("weakSubjects", Collections.emptyList());
        }

        // weakKnowledge: 暂无独立字段
        profile.put("weakKnowledge", Collections.emptyList());

        // personality: 文本 → description
        Map<String, Object> personality = new HashMap<>();
        if (StringUtils.hasText(student.getPersonality())) {
            personality.put("description", student.getPersonality());
        }
        profile.put("personality", personality);

        // specialNeeds: 来自 learningBasics
        profile.put("specialNeeds", student.getLearningBasics());

        return profile;
    }

    /**
     * 获取学生教学目标列表。
     * 当前无 teaching_goal 表，返回空列表；前端会优雅地不渲染目标卡片。
     */
    public List<Map<String, Object>> getTeachingGoals(Long id) {
        // 复用 getStudentById 做归属校验（不存在或非本人学生时抛 BusinessException）
        getStudentById(id);
        return Collections.emptyList();
    }

    public java.util.Map<String, Object> getTutorStudentStats() {
        Long tutorId = SecurityUtils.getCurrentUserId();
        List<Student> students = studentMapper.selectList(new LambdaQueryWrapper<Student>()
                .eq(Student::getTutorId, tutorId)
                .eq(Student::getStatus, "active"));

        double totalMidtermTarget = 0;
        double totalKnowledgeMastery = 0;
        double totalHomeworkCompletion = 0;
        int count = 0;

        for (Student student : students) {
            if (student.getMidtermTarget() != null || student.getKnowledgeMastery() != null || student.getHomeworkCompletion() != null) {
                totalMidtermTarget += student.getMidtermTarget() != null ? student.getMidtermTarget() : 0;
                totalKnowledgeMastery += student.getKnowledgeMastery() != null ? student.getKnowledgeMastery() : 0;
                totalHomeworkCompletion += student.getHomeworkCompletion() != null ? student.getHomeworkCompletion() : 0;
                count++;
            }
        }

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        if (count > 0) {
            stats.put("midtermTarget", Math.round(totalMidtermTarget / count));
            stats.put("knowledgeMastery", Math.round(totalKnowledgeMastery / count));
            stats.put("homeworkCompletion", Math.round(totalHomeworkCompletion / count));
        } else {
            stats.put("midtermTarget", 75);
            stats.put("knowledgeMastery", 60);
            stats.put("homeworkCompletion", 85);
        }
        return stats;
    }
}
