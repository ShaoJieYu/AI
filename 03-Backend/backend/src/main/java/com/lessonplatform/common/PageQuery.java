package com.lessonplatform.common;

import lombok.Data;

/**
 * 分页请求参数
 */
@Data
public class PageQuery {

    private Integer page = 1;

    private Integer pageSize = 10;

    public Integer getOffset() {
        return (page - 1) * pageSize;
    }
}
