package com.lessonplatform.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lessonplatform.model.LessonPlan;
import org.apache.ibatis.annotations.Mapper;

/**
 * 备课计划Mapper接口
 */
@Mapper
public interface LessonPlanMapper extends BaseMapper<LessonPlan> {
}
