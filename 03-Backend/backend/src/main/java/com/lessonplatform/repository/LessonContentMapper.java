package com.lessonplatform.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lessonplatform.model.LessonContent;
import org.apache.ibatis.annotations.Mapper;

/**
 * 备课内容Mapper接口
 */
@Mapper
public interface LessonContentMapper extends BaseMapper<LessonContent> {
}
