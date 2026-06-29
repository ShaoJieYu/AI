-- ============================================================
-- 阶段 2b-1 迁移脚本：学生薄弱知识点系统
-- 日期：2026-06-28
-- ============================================================

-- 1. 新建 student_weak_point 表
DROP TABLE IF EXISTS `student_weak_point`;
CREATE TABLE `student_weak_point` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) NOT NULL COMMENT '学生ID',
  `subject` varchar(50) NOT NULL COMMENT '学科',
  `knowledge_point` varchar(200) NOT NULL COMMENT '知识点名称',
  `mastery_level` varchar(20) DEFAULT 'WEAK' COMMENT '掌握程度：WEAK/MEDIUM/STRONG',
  `source` varchar(30) NOT NULL COMMENT '来源：ERROR_ANALYSIS/MANUAL',
  `source_id` bigint(20) DEFAULT NULL COMMENT '来源记录ID（如错题分析ID）',
  `notes` text COMMENT '备注',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_subject` (`subject`),
  KEY `idx_deleted` (`deleted`),
  CONSTRAINT `swp_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生薄弱知识点';

-- 2. homework_analysis_record 加 student_id 字段
ALTER TABLE `homework_analysis_record`
  ADD COLUMN `student_id` bigint(20) DEFAULT NULL COMMENT '关联学生ID' AFTER `id`,
  ADD KEY `idx_student_id` (`student_id`);