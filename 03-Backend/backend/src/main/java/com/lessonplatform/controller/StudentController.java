package com.lessonplatform.controller;

import com.lessonplatform.common.PageQuery;
import com.lessonplatform.common.PageResult;
import com.lessonplatform.common.Result;
import com.lessonplatform.dto.StudentFormDTO;
import com.lessonplatform.model.LessonPlan;
import com.lessonplatform.model.Student;
import com.lessonplatform.service.LessonService;
import com.lessonplatform.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 学生管理控制器
 */
@RestController
@RequestMapping("/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final LessonService lessonService;

    @GetMapping
    public Result<PageResult<Student>> getStudentList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {

        PageQuery query = new PageQuery();
        query.setPage(page);
        query.setPageSize(pageSize);

        PageResult<Student> result = studentService.getStudentList(query, keyword, status);
        return Result.success(result);
    }

    @GetMapping("/all")
    public Result<List<Student>> getAllStudents() {
        List<Student> students = studentService.getAllStudents();
        return Result.success(students);
    }

    @GetMapping("/{id}")
    public Result<Student> getStudentById(@PathVariable Long id) {
        Student student = studentService.getStudentById(id);
        return Result.success(student);
    }

    /**
     * 学生学情档案：由 student 表的 weak_subjects / learning_basics / personality 等字段映射构造。
     */
    @GetMapping("/{id}/profile")
    public Result<Map<String, Object>> getStudentProfile(@PathVariable Long id) {
        return Result.success(studentService.getStudentProfile(id));
    }

    /**
     * 学生教学目标列表。当前无 teaching_goal 表，返回空列表。
     */
    @GetMapping("/{id}/goals")
    public Result<List<Map<String, Object>>> getTeachingGoals(@PathVariable Long id) {
        return Result.success(studentService.getTeachingGoals(id));
    }

    /**
     * 学生名下所有备课记录（按创建时间倒序）。
     */
    @GetMapping("/{studentId}/lessons")
    public Result<List<LessonPlan>> getLessonsByStudent(@PathVariable Long studentId) {
        return Result.success(lessonService.getLessonsByStudent(studentId));
    }

    @PostMapping
    public Result<Student> createStudent(@Valid @RequestBody StudentFormDTO dto) {
        Student student = studentService.createStudent(dto);
        return Result.success("学生创建成功", student);
    }

    @PutMapping("/{id}")
    public Result<Student> updateStudent(@PathVariable Long id, @Valid @RequestBody StudentFormDTO dto) {
        Student student = studentService.updateStudent(id, dto);
        return Result.success("学生更新成功", student);
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return Result.success("学生删除成功", null);
    }

    @GetMapping("/dashboard-stats")
    public Result<java.util.Map<String, Object>> getDashboardStats() {
        java.util.Map<String, Object> stats = studentService.getTutorStudentStats();
        return Result.success(stats);
    }
}
