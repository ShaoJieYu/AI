package com.lessonplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lessonplatform.common.BusinessException;
import com.lessonplatform.model.StudentWeakPoint;
import com.lessonplatform.repository.StudentWeakPointMapper;
import com.lessonplatform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

/**
 * 学生薄弱知识点服务
 */
@Service
@RequiredArgsConstructor
public class StudentWeakPointService {

    private final StudentWeakPointMapper mapper;
    private final StudentService studentService;

    public List<StudentWeakPoint> getWeakPointsByStudent(Long studentId) {
        // 归属校验
        studentService.getStudentById(studentId);

        return mapper.selectList(new LambdaQueryWrapper<StudentWeakPoint>()
                .eq(StudentWeakPoint::getStudentId, studentId)
                .orderByDesc(StudentWeakPoint::getCreatedAt));
    }

    public StudentWeakPoint createWeakPoint(StudentWeakPoint weakPoint) {
        studentService.getStudentById(weakPoint.getStudentId());

        weakPoint.setId(null);
        mapper.insert(weakPoint);
        return weakPoint;
    }

    public StudentWeakPoint updateWeakPoint(Long id, StudentWeakPoint weakPoint) {
        StudentWeakPoint existing = mapper.selectById(id);
        if (existing == null) {
            throw new BusinessException("薄弱点记录不存在");
        }

        studentService.getStudentById(existing.getStudentId());

        existing.setKnowledgePoint(weakPoint.getKnowledgePoint());
        existing.setSubject(weakPoint.getSubject());
        existing.setMasteryLevel(weakPoint.getMasteryLevel());
        existing.setNotes(weakPoint.getNotes());

        mapper.updateById(existing);
        return existing;
    }

    public void deleteWeakPoint(Long id) {
        StudentWeakPoint existing = mapper.selectById(id);
        if (existing == null) {
            throw new BusinessException("薄弱点记录不存在");
        }

        studentService.getStudentById(existing.getStudentId());
        mapper.deleteById(id);
    }

    /**
     * 从错题分析的 knowledgePoints 文本中提取知识点并批量创建薄弱点记录。
     * 按 "、" "；" "\n" 切分，每条创建一个 WEAK 级别的记录。
     */
    public void autoCreateFromErrorAnalysis(Long studentId, String knowledgePointsText, Long sourceId) {
        if (!StringUtils.hasText(knowledgePointsText) || studentId == null) {
            return;
        }

        // 尝试按常见分隔符切分
        String[] parts = knowledgePointsText.split("[、；;\\n]+");
        for (String part : parts) {
            String kp = part.replaceAll("[#*\\s]", "").trim();
            if (kp.length() > 2 && kp.length() <= 200) {
                // 去重检查：已有相同知识点则不再创建
                long exists = mapper.selectCount(new LambdaQueryWrapper<StudentWeakPoint>()
                        .eq(StudentWeakPoint::getStudentId, studentId)
                        .eq(StudentWeakPoint::getKnowledgePoint, kp)
                        .eq(StudentWeakPoint::getSource, "ERROR_ANALYSIS"));
                if (exists > 0) {
                    continue;
                }

                StudentWeakPoint wp = new StudentWeakPoint();
                wp.setStudentId(studentId);
                wp.setKnowledgePoint(kp);
                wp.setMasteryLevel("WEAK");
                wp.setSource("ERROR_ANALYSIS");
                wp.setSourceId(sourceId);
                mapper.insert(wp);
            }
        }
    }
}