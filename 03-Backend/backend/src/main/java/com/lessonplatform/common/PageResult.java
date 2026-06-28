package com.lessonplatform.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * 分页响应结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long total;
    private List<T> items;
    private Integer page;
    private Integer pageSize;
    private Integer totalPages;

    public static <T> PageResult<T> of(Long total, List<T> items, Integer page, Integer pageSize) {
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return new PageResult<>(total, items, page, pageSize, totalPages);
    }
}
