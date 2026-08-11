-- Demo backup SẠCH cho math-exam-system / JinMath
-- Generated: 2026-08-06T20:19:20.379Z
-- Nguồn: schema.sql + seed.sql (không dump DB đang chạy)
-- Chỉ gồm 3 tài khoản demo; dat_lai_mat_khau rỗng; không có sessions data
-- Restore: mysql -u root -p < database/demo-backup.sql
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: web_kiem_tra_toan
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `web_kiem_tra_toan`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `web_kiem_tra_toan` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `web_kiem_tra_toan`;

--
-- Table structure for table `cau_hoi`
--

DROP TABLE IF EXISTS `cau_hoi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cau_hoi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `giao_vien_id` bigint unsigned NOT NULL,
  `chu_de_id` bigint unsigned DEFAULT NULL,
  `loai_cau_hoi` enum('MOT_DAP_AN','DUNG_SAI','TRA_LOI_NGAN','TU_LUAN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung_latex` longtext COLLATE utf8mb4_unicode_ci,
  `anh_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `muc_do` enum('NHAN_BIET','THONG_HIEU','VAN_DUNG') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NHAN_BIET',
  `diem_mac_dinh` decimal(5,2) NOT NULL DEFAULT '1.00',
  `dap_an_ngan_chuan` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D├╣ng ─æß╗â so khß╗øp tß╗▒ ─æß╗Öng cho c├óu TRA_LOI_NGAN',
  `loi_giai` longtext COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('HOAT_DONG','NGUNG_SU_DUNG') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HOAT_DONG',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cau_hoi_gv` (`giao_vien_id`),
  KEY `idx_cau_hoi_chu_de` (`chu_de_id`),
  CONSTRAINT `fk_cau_hoi_chu_de` FOREIGN KEY (`chu_de_id`) REFERENCES `chu_de` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cau_hoi_gv` FOREIGN KEY (`giao_vien_id`) REFERENCES `nguoi_dung` (`id`),
  CONSTRAINT `chk_cau_hoi_diem_mac_dinh` CHECK ((`diem_mac_dinh` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hoi`
--

LOCK TABLES `cau_hoi` WRITE;
/*!40000 ALTER TABLE `cau_hoi` DISABLE KEYS */;
INSERT INTO `cau_hoi` VALUES (1,1,1,'MOT_DAP_AN','Phương trình $x^2 - 5x + 6 = 0$ có nghiệm là:',NULL,NULL,'THONG_HIEU',1.00,NULL,'Delta = 25 - 24 = 1 > 0, x = (5±1)/2 => x = 2 hoặc x = 3','HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20'),(2,1,1,'DUNG_SAI','Xét phương trình bậc hai $x^2 - 5x + 6 = 0$. Phát biểu nào sau đây đúng/sai?',NULL,NULL,'NHAN_BIET',1.00,NULL,'Delta = 1 > 0 nên có 2 nghiệm thực phân biệt x=2, x=3. Tổng nghiệm = 5, tích = 6.','HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20'),(3,1,1,'TRA_LOI_NGAN','Tổng hai nghiệm của phương trình $x^2 - 5x + 6 = 0$ là bao nhiêu?',NULL,NULL,'THONG_HIEU',1.00,'5','Theo Vi-et: tổng hai nghiệm = -b/a = 5','HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20'),(4,1,1,'TU_LUAN','Giải phương trình $x^2 - 5x + 6 = 0$ và trình bày đầy đủ các bước.',NULL,NULL,'VAN_DUNG',2.00,NULL,'Ta có $x^2 - 5x + 6 = (x-2)(x-3)$. Vậy $x=2$ hoặc $x=3$.','HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20');
/*!40000 ALTER TABLE `cau_hoi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cau_hoi_de_thi`
--

DROP TABLE IF EXISTS `cau_hoi_de_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cau_hoi_de_thi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `de_thi_id` bigint unsigned NOT NULL,
  `cau_hoi_id` bigint unsigned NOT NULL,
  `thu_tu_goc` int unsigned NOT NULL,
  `diem` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_de_cau_hoi` (`de_thi_id`,`cau_hoi_id`),
  UNIQUE KEY `uk_de_thu_tu` (`de_thi_id`,`thu_tu_goc`),
  KEY `idx_chdt_cau_hoi` (`cau_hoi_id`),
  CONSTRAINT `fk_chdt_cau_hoi` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`),
  CONSTRAINT `fk_chdt_de` FOREIGN KEY (`de_thi_id`) REFERENCES `de_thi` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_chdt_diem` CHECK ((`diem` > 0)),
  CONSTRAINT `chk_chdt_thu_tu` CHECK ((`thu_tu_goc` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hoi_de_thi`
--

LOCK TABLES `cau_hoi_de_thi` WRITE;
/*!40000 ALTER TABLE `cau_hoi_de_thi` DISABLE KEYS */;
INSERT INTO `cau_hoi_de_thi` VALUES (1,1,1,1,1.00),(2,1,2,2,1.00),(3,1,3,3,1.00),(4,1,4,4,2.00);
/*!40000 ALTER TABLE `cau_hoi_de_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cau_hoi_luot_lam`
--

DROP TABLE IF EXISTS `cau_hoi_luot_lam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cau_hoi_luot_lam` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `luot_lam_bai_id` bigint unsigned NOT NULL,
  `cau_hoi_id` bigint unsigned NOT NULL,
  `thu_tu_hien_thi` int unsigned NOT NULL COMMENT 'Thß╗® tß╗▒ sau khi trß╗Ön (Fisher-Yates ß╗ƒ Node.js), ghi cß╗æ ─æß╗ïnh, kh├┤ng trß╗Ön lß║íi khi refresh',
  `diem` decimal(5,2) NOT NULL COMMENT '─Éiß╗âm "─æ├│ng b─âng" tß║íi thß╗Øi ─æiß╗âm bß║»t ─æß║ºu l├ám, kh├┤ng ─æß╗òi d├╣ gi├ío vi├¬n sß╗¡a ─æiß╗âm c├óu hß╗Åi sau ─æ├│',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_llb_thu_tu` (`luot_lam_bai_id`,`thu_tu_hien_thi`),
  UNIQUE KEY `uk_llb_cau_hoi` (`luot_lam_bai_id`,`cau_hoi_id`),
  KEY `fk_chll_cau_hoi` (`cau_hoi_id`),
  CONSTRAINT `fk_chll_cau_hoi` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`),
  CONSTRAINT `fk_chll_llb` FOREIGN KEY (`luot_lam_bai_id`) REFERENCES `luot_lam_bai` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_chll_diem` CHECK ((`diem` > 0)),
  CONSTRAINT `chk_chll_thu_tu` CHECK ((`thu_tu_hien_thi` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hoi_luot_lam`
--

LOCK TABLES `cau_hoi_luot_lam` WRITE;
/*!40000 ALTER TABLE `cau_hoi_luot_lam` DISABLE KEYS */;
/*!40000 ALTER TABLE `cau_hoi_luot_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_tiet_bai_lam`
--

DROP TABLE IF EXISTS `chi_tiet_bai_lam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chi_tiet_bai_lam` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `luot_lam_bai_id` bigint unsigned NOT NULL,
  `cau_hoi_id` bigint unsigned NOT NULL,
  `dap_an_da_chon_id` bigint unsigned DEFAULT NULL COMMENT 'Chß╗ë d├╣ng cho MOT_DAP_AN/DUNG_SAI; quan hß╗ç ─æ├íp ├ín thuß╗Öc ─æ├║ng c├óu hß╗Åi ─æã░ß╗úc bß║úo ─æß║úm bß╗ƒi FK gh├®p fk_ctbl_dap_an',
  `noi_dung_tra_loi` longtext COLLATE utf8mb4_unicode_ci COMMENT 'TRA_LOI_NGAN/TU_LUAN: v─ân bß║ún; DUNG_SAI: JSON {selections:{dapAnId:true|false}}',
  `da_danh_dau` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Bookmark "c├óu cß║ºn xem lß║íi"',
  `answer_version` int unsigned NOT NULL DEFAULT '0' COMMENT 'T─âng dß║ºn mß╗ùi lß║ºn client gß╗¡i lã░u; d├╣ng ─æß╗â chß╗æng request c┼® ghi ─æ├¿ request mß╗øi (xem service-rules.md mß╗Ñc 5)',
  `client_request_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Chß╗ë ─æß╗â theo d├Ái/debug request gß║ºn nhß║Ñt, KH├öNG unique to├án hß╗ç thß╗æng',
  `la_dung` tinyint(1) DEFAULT NULL,
  `diem_dat_duoc` decimal(5,2) NOT NULL DEFAULT '0.00',
  `nhan_xet` text COLLATE utf8mb4_unicode_ci COMMENT 'Nhß║¡n x├®t cß╗ºa gi├ío vi├¬n khi chß║Ñm tß╗▒ luß║¡n',
  `saved_at_server` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_llb_cau_hoi_answer` (`luot_lam_bai_id`,`cau_hoi_id`),
  KEY `idx_ctbl_dap_an_cau_hoi` (`cau_hoi_id`,`dap_an_da_chon_id`),
  KEY `idx_ctbl_client_request` (`client_request_id`),
  CONSTRAINT `fk_ctbl_cau_hoi_luot_lam` FOREIGN KEY (`luot_lam_bai_id`, `cau_hoi_id`) REFERENCES `cau_hoi_luot_lam` (`luot_lam_bai_id`, `cau_hoi_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctbl_dap_an` FOREIGN KEY (`cau_hoi_id`, `dap_an_da_chon_id`) REFERENCES `dap_an` (`cau_hoi_id`, `id`),
  CONSTRAINT `chk_ctbl_diem` CHECK ((`diem_dat_duoc` >= 0)),
  CONSTRAINT `chk_ctbl_mot_kieu_tra_loi` CHECK (((`dap_an_da_chon_id` is null) or (`noi_dung_tra_loi` is null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_tiet_bai_lam`
--

LOCK TABLES `chi_tiet_bai_lam` WRITE;
/*!40000 ALTER TABLE `chi_tiet_bai_lam` DISABLE KEYS */;
/*!40000 ALTER TABLE `chi_tiet_bai_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chu_de`
--

DROP TABLE IF EXISTS `chu_de`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chu_de` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `giao_vien_id` bigint unsigned NOT NULL,
  `ten_chu_de` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `khoi_lop` tinyint unsigned DEFAULT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_chu_de_gv` (`giao_vien_id`),
  CONSTRAINT `fk_chu_de_gv` FOREIGN KEY (`giao_vien_id`) REFERENCES `nguoi_dung` (`id`),
  CONSTRAINT `chk_chu_de_khoi_lop` CHECK (((`khoi_lop` is null) or (`khoi_lop` between 1 and 12)))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chu_de`
--

LOCK TABLES `chu_de` WRITE;
/*!40000 ALTER TABLE `chu_de` DISABLE KEYS */;
INSERT INTO `chu_de` VALUES (1,1,'Phương trình bậc hai',10,'Chương phương trình - bất phương trình','2026-08-07 03:19:20','2026-08-07 03:19:20');
/*!40000 ALTER TABLE `chu_de` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dap_an`
--

DROP TABLE IF EXISTS `dap_an`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dap_an` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cau_hoi_id` bigint unsigned NOT NULL,
  `noi_dung` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung_latex` longtext COLLATE utf8mb4_unicode_ci,
  `la_dap_an_dung` tinyint(1) NOT NULL DEFAULT '0',
  `thu_tu` tinyint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dap_an_thu_tu` (`cau_hoi_id`,`thu_tu`),
  UNIQUE KEY `uk_dap_an_cau_hoi_id` (`cau_hoi_id`,`id`) COMMENT 'Cho ph├®p chi_tiet_bai_lam tham chiß║┐u FK gh├®p (cau_hoi_id, dap_an_id) ─æß╗â ─æß║úm bß║úo ─æ├íp ├ín chß╗ìn ─æ├║ng thuß╗Öc c├óu hß╗Åi',
  CONSTRAINT `fk_dap_an_cau_hoi` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_dap_an_thu_tu` CHECK ((`thu_tu` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dap_an`
--

LOCK TABLES `dap_an` WRITE;
/*!40000 ALTER TABLE `dap_an` DISABLE KEYS */;
INSERT INTO `dap_an` VALUES (1,1,'x = 2 hoặc x = 3',NULL,1,1,'2026-08-07 03:19:20'),(2,1,'x = -2 hoặc x = -3',NULL,0,2,'2026-08-07 03:19:20'),(3,1,'x = 1 hoặc x = 6',NULL,0,3,'2026-08-07 03:19:20'),(4,1,'Vô nghiệm',NULL,0,4,'2026-08-07 03:19:20'),(5,2,'Phương trình có hai nghiệm thực phân biệt.',NULL,1,1,'2026-08-07 03:19:20'),(6,2,'Tổng hai nghiệm bằng 5.',NULL,1,2,'2026-08-07 03:19:20'),(7,2,'Tích hai nghiệm bằng $-6$.',NULL,0,3,'2026-08-07 03:19:20'),(8,2,'Phương trình vô nghiệm thực.',NULL,0,4,'2026-08-07 03:19:20');
/*!40000 ALTER TABLE `dap_an` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dat_lai_mat_khau`
--

DROP TABLE IF EXISTS `dat_lai_mat_khau`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dat_lai_mat_khau` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nguoi_dung_id` bigint unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `het_han_luc` datetime NOT NULL,
  `da_su_dung` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dlmk_token_hash` (`token_hash`),
  KEY `idx_dlmk_user` (`nguoi_dung_id`),
  KEY `idx_dlmk_expiry` (`het_han_luc`),
  CONSTRAINT `fk_dlmk_nguoi_dung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dat_lai_mat_khau`
--

LOCK TABLES `dat_lai_mat_khau` WRITE;
/*!40000 ALTER TABLE `dat_lai_mat_khau` DISABLE KEYS */;
/*!40000 ALTER TABLE `dat_lai_mat_khau` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `de_thi`
--

DROP TABLE IF EXISTS `de_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `de_thi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `giao_vien_id` bigint unsigned NOT NULL,
  `ten_de` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `thoi_luong_phut` int unsigned NOT NULL,
  `tong_diem` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '─Éß╗ông bß╗Ö tß╗½ SUM(cau_hoi_de_thi.diem); nh├íp chã░a c├│ c├óu = 0',
  `thoi_gian_bat_dau` datetime NOT NULL COMMENT 'Giß╗Ø mß╗ƒ ─æß╗ü',
  `thoi_gian_ket_thuc` datetime NOT NULL COMMENT 'Giß╗Ø ─æ├│ng ─æß╗ü chung cho cß║ú lß╗øp',
  `so_lan_duoc_lam` tinyint unsigned NOT NULL DEFAULT '1',
  `tron_cau_hoi` tinyint(1) NOT NULL DEFAULT '0',
  `cho_xem_dap_an` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Chß╗ë c├│ t├íc dß╗Ñng khi da_cong_bo_ket_qua = TRUE (xem service-rules.md mß╗Ñc 13)',
  `da_cong_bo_ket_qua` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'TRUE khi gi├ío vi├¬n ─æ├ú c├┤ng bß╗æ ─æiß╗âm; hß╗ìc sinh chß╗ë xem ─æã░ß╗úc ─æiß╗âm ch├¡nh thß╗®c khi cß╗Öt n├áy TRUE',
  `thoi_gian_cong_bo_ket_qua` datetime DEFAULT NULL,
  `trang_thai` enum('NHAP','DA_CONG_BO','DA_HUY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NHAP',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_de_thi_gv` (`giao_vien_id`),
  CONSTRAINT `fk_de_thi_gv` FOREIGN KEY (`giao_vien_id`) REFERENCES `nguoi_dung` (`id`),
  CONSTRAINT `chk_cong_bo_ket_qua` CHECK ((((`da_cong_bo_ket_qua` = false) and (`thoi_gian_cong_bo_ket_qua` is null)) or ((`da_cong_bo_ket_qua` = true) and (`thoi_gian_cong_bo_ket_qua` is not null)))),
  CONSTRAINT `chk_de_thi_so_lan` CHECK ((`so_lan_duoc_lam` > 0)),
  CONSTRAINT `chk_de_thi_thoi_gian` CHECK ((`thoi_gian_ket_thuc` > `thoi_gian_bat_dau`)),
  CONSTRAINT `chk_de_thi_thoi_luong` CHECK ((`thoi_luong_phut` > 0)),
  CONSTRAINT `chk_de_thi_tong_diem` CHECK ((`tong_diem` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `de_thi`
--

LOCK TABLES `de_thi` WRITE;
/*!40000 ALTER TABLE `de_thi` DISABLE KEYS */;
INSERT INTO `de_thi` VALUES (1,1,'Kiểm tra 15 phút - Phương trình bậc hai','Đề demo dùng để kiểm thử luồng thi',15,5.00,'2026-08-07 03:19:20','2027-02-03 03:19:20',1,1,1,0,NULL,'NHAP','2026-08-07 03:19:20','2026-08-07 03:19:20');
/*!40000 ALTER TABLE `de_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lop_hoc`
--

DROP TABLE IF EXISTS `lop_hoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lop_hoc` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `giao_vien_id` bigint unsigned NOT NULL,
  `ten_lop` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_lop` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('HOAT_DONG','LUU_TRU') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HOAT_DONG',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lop_ma_lop` (`ma_lop`),
  KEY `idx_lop_giao_vien` (`giao_vien_id`),
  CONSTRAINT `fk_lop_giao_vien` FOREIGN KEY (`giao_vien_id`) REFERENCES `nguoi_dung` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lop_hoc`
--

LOCK TABLES `lop_hoc` WRITE;
/*!40000 ALTER TABLE `lop_hoc` DISABLE KEYS */;
INSERT INTO `lop_hoc` VALUES (1,1,'Toán 10A1','TOAN10A1','Lớp demo dùng để kiểm thử hệ thống','HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20');
/*!40000 ALTER TABLE `lop_hoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `luot_lam_bai`
--

DROP TABLE IF EXISTS `luot_lam_bai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `luot_lam_bai` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `de_thi_id` bigint unsigned NOT NULL,
  `hoc_sinh_id` bigint unsigned NOT NULL,
  `lop_hoc_id` bigint unsigned NOT NULL COMMENT 'Lß╗øp m├á hß╗ìc sinh sß╗¡ dß╗Ñng ─æß╗â thß╗▒c hiß╗çn lã░ß╗út l├ám; phß║úi thuß╗Öc ph├ón c├┤ng cß╗ºa ─æß╗ü thi (─æß║úm bß║úo bß║▒ng FK gh├®p fk_llb_phan_cong)',
  `lan_thu` tinyint unsigned NOT NULL DEFAULT '1',
  `thoi_gian_bat_dau` datetime NOT NULL,
  `han_nop` datetime NOT NULL,
  `thoi_gian_nop` datetime DEFAULT NULL,
  `thoi_gian_bo_sung_giay` int unsigned NOT NULL DEFAULT '0' COMMENT 'Tß╗òng sß╗æ gi├óy ─æã░ß╗úc b├╣ do sß╗▒ cß╗æ ─æ├ú duyß╗çt; han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay',
  `diem_tu_dong` decimal(6,2) NOT NULL DEFAULT '0.00',
  `diem_tu_luan` decimal(6,2) NOT NULL DEFAULT '0.00',
  `tong_diem` decimal(6,2) NOT NULL DEFAULT '0.00',
  `trang_thai` enum('DANG_LAM','DA_NOP','TU_DONG_NOP','DA_CHAM') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DANG_LAM',
  `last_seen_at` datetime DEFAULT NULL COMMENT 'Cß║¡p nhß║¡t mß╗ùi lß║ºn nhß║¡n heartbeat tß╗½ client',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attempt` (`de_thi_id`,`hoc_sinh_id`,`lan_thu`),
  KEY `idx_llb_phan_cong` (`de_thi_id`,`lop_hoc_id`) COMMENT 'Phß╗Ñc vß╗Ñ FK gh├®p fk_llb_phan_cong v├á truy vß║Ñn theo cß║Àp ─æß╗ü-lß╗øp',
  KEY `idx_llb_hs` (`hoc_sinh_id`),
  KEY `idx_llb_lop` (`lop_hoc_id`),
  CONSTRAINT `fk_llb_hs` FOREIGN KEY (`hoc_sinh_id`) REFERENCES `nguoi_dung` (`id`),
  CONSTRAINT `fk_llb_phan_cong` FOREIGN KEY (`de_thi_id`, `lop_hoc_id`) REFERENCES `phan_cong_de` (`de_thi_id`, `lop_hoc_id`),
  CONSTRAINT `chk_llb_diem` CHECK (((`diem_tu_dong` >= 0) and (`diem_tu_luan` >= 0) and (`tong_diem` >= 0))),
  CONSTRAINT `chk_llb_han_nop` CHECK ((`han_nop` > `thoi_gian_bat_dau`)),
  CONSTRAINT `chk_llb_lan_thu` CHECK ((`lan_thu` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `luot_lam_bai`
--

LOCK TABLES `luot_lam_bai` WRITE;
/*!40000 ALTER TABLE `luot_lam_bai` DISABLE KEYS */;
/*!40000 ALTER TABLE `luot_lam_bai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoi_dung`
--

DROP TABLE IF EXISTS `nguoi_dung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoi_dung` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ho_ten` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mat_khau_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vai_tro` enum('GIAO_VIEN','HOC_SINH') COLLATE utf8mb4_unicode_ci NOT NULL,
  `anh_dai_dien` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trang_thai` enum('HOAT_DONG','TAM_KHOA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HOAT_DONG',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_nguoi_dung_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoi_dung`
--

LOCK TABLES `nguoi_dung` WRITE;
/*!40000 ALTER TABLE `nguoi_dung` DISABLE KEYS */;
INSERT INTO `nguoi_dung` VALUES (1,'Giáo viên demo','teacher@example.com','$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe','GIAO_VIEN',NULL,'HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20'),(2,'Học sinh demo A','studenta@example.com','$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe','HOC_SINH',NULL,'HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20'),(3,'Học sinh demo B','studentb@example.com','$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe','HOC_SINH',NULL,'HOAT_DONG','2026-08-07 03:19:20','2026-08-07 03:19:20');
/*!40000 ALTER TABLE `nguoi_dung` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nhat_ky_thi`
--

DROP TABLE IF EXISTS `nhat_ky_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhat_ky_thi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `luot_lam_bai_id` bigint unsigned NOT NULL,
  `loai_su_kien` enum('BAT_DAU','LUU_DAP_AN','HEARTBEAT','MAT_KET_NOI','KHOI_PHUC','CHUYEN_TAB','NOP_BAI','TU_DONG_NOP','MO_LAI_SAU_SU_CO','LOI_HE_THONG') COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` text COLLATE utf8mb4_unicode_ci,
  `du_lieu_json` json DEFAULT NULL,
  `thoi_gian` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nkt_llb_time` (`luot_lam_bai_id`,`thoi_gian`),
  CONSTRAINT `fk_nkt_llb` FOREIGN KEY (`luot_lam_bai_id`) REFERENCES `luot_lam_bai` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhat_ky_thi`
--

LOCK TABLES `nhat_ky_thi` WRITE;
/*!40000 ALTER TABLE `nhat_ky_thi` DISABLE KEYS */;
/*!40000 ALTER TABLE `nhat_ky_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phan_cong_de`
--

DROP TABLE IF EXISTS `phan_cong_de`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phan_cong_de` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `de_thi_id` bigint unsigned NOT NULL,
  `lop_hoc_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_de_lop` (`de_thi_id`,`lop_hoc_id`),
  KEY `idx_pcd_lop` (`lop_hoc_id`),
  CONSTRAINT `fk_pcd_de` FOREIGN KEY (`de_thi_id`) REFERENCES `de_thi` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pcd_lop` FOREIGN KEY (`lop_hoc_id`) REFERENCES `lop_hoc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phan_cong_de`
--

LOCK TABLES `phan_cong_de` WRITE;
/*!40000 ALTER TABLE `phan_cong_de` DISABLE KEYS */;
INSERT INTO `phan_cong_de` VALUES (1,1,1,'2026-08-07 03:19:20');
/*!40000 ALTER TABLE `phan_cong_de` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `su_co_bai_thi`
--

DROP TABLE IF EXISTS `su_co_bai_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `su_co_bai_thi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `luot_lam_bai_id` bigint unsigned NOT NULL,
  `loai_su_co` enum('MAT_DIEN','MAT_MANG','LOI_TRINH_DUYET','LOI_HE_THONG','KHAC') COLLATE utf8mb4_unicode_ci NOT NULL,
  `bat_dau_luc` datetime DEFAULT NULL,
  `ket_thuc_luc` datetime DEFAULT NULL,
  `tu_dong_phat_hien` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'TRUE = hß╗ç thß╗æng tß╗▒ tß║ío do vã░ß╗út ngã░ß╗íng heartbeat; FALSE = hß╗ìc sinh chß╗º ─æß╗Öng b├ío',
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('CHO_XAC_NHAN','DA_CHAP_NHAN','TU_CHOI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CHO_XAC_NHAN',
  `so_giay_bu_gio` int unsigned NOT NULL DEFAULT '0',
  `ly_do_xu_ly` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_su_co_llb` (`luot_lam_bai_id`),
  KEY `idx_su_co_trang_thai` (`trang_thai`),
  CONSTRAINT `fk_su_co_llb` FOREIGN KEY (`luot_lam_bai_id`) REFERENCES `luot_lam_bai` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_su_co_thoi_gian` CHECK (((`ket_thuc_luc` is null) or (`bat_dau_luc` is null) or (`ket_thuc_luc` >= `bat_dau_luc`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `su_co_bai_thi`
--

LOCK TABLES `su_co_bai_thi` WRITE;
/*!40000 ALTER TABLE `su_co_bai_thi` DISABLE KEYS */;
/*!40000 ALTER TABLE `su_co_bai_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thanh_vien_lop`
--

DROP TABLE IF EXISTS `thanh_vien_lop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanh_vien_lop` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lop_hoc_id` bigint unsigned NOT NULL,
  `hoc_sinh_id` bigint unsigned NOT NULL,
  `ngay_tham_gia` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('DANG_HOC','DA_ROI_LOP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DANG_HOC',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_thanh_vien_lop` (`lop_hoc_id`,`hoc_sinh_id`),
  KEY `idx_tvl_hoc_sinh` (`hoc_sinh_id`),
  CONSTRAINT `fk_tvl_hoc_sinh` FOREIGN KEY (`hoc_sinh_id`) REFERENCES `nguoi_dung` (`id`),
  CONSTRAINT `fk_tvl_lop` FOREIGN KEY (`lop_hoc_id`) REFERENCES `lop_hoc` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thanh_vien_lop`
--

LOCK TABLES `thanh_vien_lop` WRITE;
/*!40000 ALTER TABLE `thanh_vien_lop` DISABLE KEYS */;
INSERT INTO `thanh_vien_lop` VALUES (1,1,2,'2026-08-07 03:19:20','DANG_HOC'),(2,1,3,'2026-08-07 03:19:20','DANG_HOC');
/*!40000 ALTER TABLE `thanh_vien_lop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'web_kiem_tra_toan'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-07  3:19:20
