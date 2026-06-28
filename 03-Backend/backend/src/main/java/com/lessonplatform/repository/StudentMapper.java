package com.lessonplatform.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lessonplatform.model.Student;
import org.apache.ibatis.annotations.Mapper;

/**
 * 学生Mapper接口
 */
@Mapper
public interface StudentMapper extends BaseMapper<Student> {
}
