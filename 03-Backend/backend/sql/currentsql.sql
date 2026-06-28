-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: lesson_platform
-- ------------------------------------------------------
-- Server version	5.7.44-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `lesson_content`
--

DROP TABLE IF EXISTS `lesson_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesson_content` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `lesson_plan_id` bigint(20) NOT NULL,
  `content_type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` longtext NOT NULL,
  `sort_order` int(11) DEFAULT '0',
  `metadata` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_lesson_plan_id` (`lesson_plan_id`),
  KEY `idx_content_type` (`content_type`),
  KEY `idx_deleted` (`deleted`),
  CONSTRAINT `lesson_content_ibfk_1` FOREIGN KEY (`lesson_plan_id`) REFERENCES `lesson_plan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_content`
--

LOCK TABLES `lesson_content` WRITE;
/*!40000 ALTER TABLE `lesson_content` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_plan`
--

DROP TABLE IF EXISTS `lesson_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesson_plan` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tutor_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `grade` varchar(20) DEFAULT NULL,
  `teaching_goal` text NOT NULL,
  `difficulty` varchar(20) DEFAULT '中等',
  `estimated_duration` varchar(20) DEFAULT '60',
  `status` varchar(20) DEFAULT 'generating',
  `generate_type` varchar(20) DEFAULT 'ai',
  `ai_model` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_tutor_id` (`tutor_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`),
  CONSTRAINT `lesson_plan_ibfk_1` FOREIGN KEY (`tutor_id`) REFERENCES `sys_user` (`id`),
  CONSTRAINT `lesson_plan_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_plan`
--

LOCK TABLES `lesson_plan` WRITE;
/*!40000 ALTER TABLE `lesson_plan` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tutor_id` bigint(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `grade` varchar(20) NOT NULL,
  `school` varchar(100) DEFAULT NULL,
  `current_subject` varchar(100) DEFAULT NULL,
  `weak_subjects` varchar(255) DEFAULT NULL,
  `learning_basics` text,
  `study_habits` text,
  `personality` text,
  `parent_name` varchar(50) DEFAULT NULL,
  `parent_contact` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `tags` varchar(255) DEFAULT NULL,
  `remark` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_tutor_id` (`tutor_id`),
  KEY `idx_deleted` (`deleted`),
  CONSTRAINT `student_ibfk_1` FOREIGN KEY (`tutor_id`) REFERENCES `sys_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` VALUES (1,1,'李明','男',15,'初三','实验中学',NULL,'几何,函数','基础较好，理解能力强，但几何证明题较弱',NULL,NULL,NULL,NULL,'active',NULL,NULL,'2026-03-25 00:11:12','2026-03-25 00:11:12',0),(2,1,'王芳','女',14,'初二','第一中学',NULL,'语法,写作','词汇量中等，阅读理解不错',NULL,NULL,NULL,NULL,'active',NULL,NULL,'2026-03-25 00:11:12','2026-03-25 00:11:12',0),(3,1,'余少杰',NULL,NULL,'初二','陕西师范大学','数学',NULL,NULL,NULL,NULL,NULL,NULL,'active',NULL,NULL,'2026-03-30 21:03:56','2026-03-30 21:03:56',0);
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user`
--

DROP TABLE IF EXISTS `sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` int(11) DEFAULT '1',
  `role` int(11) DEFAULT '2',
  `subjects` varchar(255) DEFAULT NULL,
  `teaching_years` varchar(20) DEFAULT NULL,
  `education_background` varchar(100) DEFAULT NULL,
  `self_intro` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user`
--

LOCK TABLES `sys_user` WRITE;
/*!40000 ALTER TABLE `sys_user` DISABLE KEYS */;
INSERT INTO `sys_user` VALUES (1,'teacher1','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKzDO8we','张老师','zhang@test.com',NULL,NULL,1,2,'数学,物理',NULL,NULL,NULL,'2026-03-25 00:11:12','2026-03-30 21:28:19',0),(2,'testuser','$2a$10$tSa9Z7ol1nBGNjYy1iH6FeFqtNZ9lUtA84qX2FVskL0RHi3KmCyXC','Tester',NULL,'15017938529',NULL,1,2,NULL,NULL,NULL,NULL,'2026-03-25 10:56:00','2026-03-25 10:56:00',0),(3,'apitest','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','API Test User',NULL,NULL,NULL,1,2,NULL,NULL,NULL,NULL,'2026-03-30 21:27:56','2026-03-30 21:27:56',0);
/*!40000 ALTER TABLE `sys_user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-30 22:17:57
