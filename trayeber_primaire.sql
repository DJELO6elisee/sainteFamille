-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : mar. 16 déc. 2025 à 12:27
-- Version du serveur : 10.11.14-MariaDB
-- Version de PHP : 8.4.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `trayeber_primaire`
--

-- --------------------------------------------------------

--
-- Structure de la table `absences`
--

CREATE TABLE `absences` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `date` date DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('excused','unexcused') DEFAULT 'unexcused',
  `duration_hours` decimal(4,2) NOT NULL DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `school_year` varchar(20) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#1976d2',
  `is_active` tinyint(1) DEFAULT 1,
  `order_index` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `activity_images`
--

CREATE TABLE `activity_images` (
  `id` int(11) NOT NULL,
  `activity_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `order_index` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `bulletin_subjects`
--

CREATE TABLE `bulletin_subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `level_group` enum('cp','ce_cm') NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `cantine_payments`
--

CREATE TABLE `cantine_payments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL COMMENT 'ID from either students table or garderie_inscriptions table based on student_type',
  `student_type` enum('student','garderie') NOT NULL DEFAULT 'student' COMMENT 'Type of student: student (from students table) or garderie (from garderie_inscriptions table)',
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Espèces','Chèque','Virement','Mobile Money') NOT NULL DEFAULT 'Espèces',
  `trimester` int(11) DEFAULT NULL COMMENT 'Trimestre (pour compatibilité avec ancien système)',
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `school_year` varchar(9) NOT NULL DEFAULT '2024-2025',
  `receipt_number` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `month_number` int(11) DEFAULT NULL COMMENT 'Numéro du mois (1-12)',
  `year` int(11) DEFAULT NULL COMMENT 'Année du paiement',
  `base_amount` decimal(10,2) DEFAULT NULL,
  `reduction_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Paiements de cantine - Système mensuel (15,000 FCFA/mois)';

-- --------------------------------------------------------

--
-- Structure de la table `cantine_payments_backup`
--

CREATE TABLE `cantine_payments_backup` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL COMMENT 'ID from either students table or garderie_inscriptions table based on student_type',
  `student_type` enum('student','garderie') NOT NULL DEFAULT 'student' COMMENT 'Type of student: student (from students table) or garderie (from garderie_inscriptions table)',
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Espèces','Chèque','Virement','Mobile Money') NOT NULL DEFAULT 'Espèces',
  `trimester` int(11) DEFAULT NULL COMMENT 'Trimestre (pour compatibilité avec ancien système)',
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `school_year` varchar(9) NOT NULL DEFAULT '2024-2025',
  `receipt_number` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `month_number` int(11) DEFAULT NULL COMMENT 'Numéro du mois (1-12)',
  `year` int(11) DEFAULT NULL COMMENT 'Année du paiement',
  `base_amount` decimal(10,2) DEFAULT NULL,
  `reduction_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `education_level_id` int(11) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `main_teacher_id` int(11) DEFAULT NULL,
  `timetable_published` tinyint(1) DEFAULT 0,
  `school_year` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `class_subjects`
--

CREATE TABLE `class_subjects` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `coefficient` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `class_subject_groups`
--

CREATE TABLE `class_subject_groups` (
  `id` int(11) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject_group` varchar(50) NOT NULL,
  `education_level_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `compositions`
--

CREATE TABLE `compositions` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `composition_date` date NOT NULL DEFAULT '2025-10-01',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `school_year` varchar(9) NOT NULL DEFAULT '2025-2026',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `compositions_temp`
--

CREATE TABLE `compositions_temp` (
  `id` int(11) NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `composition_date` date NOT NULL DEFAULT '2025-10-01',
  `school_year` varchar(9) NOT NULL DEFAULT '2025-2026',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `composition_classes`
--

CREATE TABLE `composition_classes` (
  `id` int(11) NOT NULL,
  `composition_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `discount_types`
--

CREATE TABLE `discount_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT 0.00,
  `fixed_amount` decimal(10,2) DEFAULT 0.00,
  `is_percentage` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `education_levels`
--

CREATE TABLE `education_levels` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'Nom du niveau (ex: Petite Section, CP, CE1, etc.)',
  `description` text DEFAULT NULL COMMENT 'Description du niveau',
  `tuition_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Montant de la scolarité annuelle (inclut les frais d''inscription)',
  `registration_fee` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Frais d''inscription (payés en un bloc à l''inscription)',
  `cantine_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Montant cantine par trimestre',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Niveau actif ou non',
  `order_index` int(11) DEFAULT 0 COMMENT 'Ordre d''affichage',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `enrollment_date` date DEFAULT NULL,
  `status` enum('active','completed','dropped') DEFAULT 'active',
  `school_year` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `garderie_inscriptions`
--

CREATE TABLE `garderie_inscriptions` (
  `id` int(11) NOT NULL,
  `child_first_name` varchar(100) NOT NULL,
  `child_last_name` varchar(100) NOT NULL,
  `civility` varchar(10) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `child_age` int(11) DEFAULT NULL,
  `child_photo` varchar(255) DEFAULT NULL,
  `cantine` tinyint(1) DEFAULT 0,
  `eats_at_cantine` tinyint(1) DEFAULT NULL,
  `allergy` text DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `payment_period` varchar(100) DEFAULT NULL,
  `unique_code` varchar(50) DEFAULT NULL,
  `parent_first_name` varchar(100) NOT NULL,
  `parent_last_name` varchar(100) NOT NULL,
  `parent_phone` varchar(20) NOT NULL,
  `parent_email` varchar(255) NOT NULL,
  `emergency_contact` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `original_child_id` int(11) DEFAULT NULL,
  `cantine_amount` decimal(10,2) DEFAULT NULL COMMENT 'Montant total de cantine calculé',
  `duration_days` int(11) DEFAULT NULL COMMENT 'Durée en jours calculée',
  `daily_cantine_rate` decimal(10,2) DEFAULT NULL COMMENT 'Taux journalier de cantine en FCFA',
  `daily_schooling_rate` decimal(10,2) DEFAULT NULL COMMENT 'Taux journalier de scolarité en FCFA',
  `total_schooling_amount` decimal(10,2) DEFAULT NULL COMMENT 'Montant total de scolarité calculé',
  `initial_payment` decimal(10,2) DEFAULT NULL COMMENT 'Versement initial effectué',
  `school_year` varchar(9) DEFAULT '2024-2025' COMMENT 'Année scolaire (format: YYYY-YYYY)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `grades`
--

CREATE TABLE `grades` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `grade` decimal(5,2) NOT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `composition_id` int(11) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `coefficient` int(11) NOT NULL DEFAULT 1,
  `bulletin_subject_id` int(11) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `school_year` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `history`
--

CREATE TABLE `history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `action_description` text NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `student_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `homepage_content`
--

CREATE TABLE `homepage_content` (
  `id` int(11) NOT NULL,
  `welcome_message` text DEFAULT NULL,
  `school_description` text DEFAULT NULL,
  `contact_address` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `installments`
--

CREATE TABLE `installments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `level_installment_id` int(11) DEFAULT NULL COMMENT 'Référence à la configuration du niveau (peut être NULL pour versements supplémentaires)',
  `installment_number` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL COMMENT 'Montant du versement',
  `due_date` date NOT NULL COMMENT 'Date d''échéance',
  `percentage` decimal(5,2) NOT NULL COMMENT 'Pourcentage du montant total',
  `status` enum('pending','paid','overdue','cancelled') DEFAULT 'pending',
  `school_year` varchar(20) DEFAULT NULL COMMENT 'Année scolaire',
  `class_id` int(11) DEFAULT NULL COMMENT 'Classe de l''élève',
  `education_level_id` int(11) DEFAULT NULL COMMENT 'Niveau d''études de l''élève',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `installment_payments`
--

CREATE TABLE `installment_payments` (
  `id` int(11) NOT NULL,
  `installment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_method` varchar(50) DEFAULT NULL,
  `status` enum('completed','pending','failed') DEFAULT 'completed',
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `school_year` varchar(20) DEFAULT NULL,
  `balance_carried_forward` decimal(10,2) DEFAULT 0.00,
  `carried_to_installment_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `level_installments`
--

CREATE TABLE `level_installments` (
  `id` int(11) NOT NULL,
  `education_level_id` int(11) NOT NULL,
  `installment_number` int(11) NOT NULL COMMENT 'Numéro du versement (1, 2, 3, etc.)',
  `percentage` decimal(5,2) NOT NULL COMMENT 'Pourcentage du montant total',
  `due_date_offset_days` int(11) DEFAULT 0 COMMENT 'Délai en jours après l''inscription',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Montant du versement en FCFA',
  `due_date` date DEFAULT NULL COMMENT 'Date d''échéance du versement'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('public','class','private') NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `event_date` datetime DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `original_amount` decimal(10,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_type` enum('tuition','registration','other') DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `description` text DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `school_year` varchar(20) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `payment_discounts`
--

CREATE TABLE `payment_discounts` (
  `id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `student_discount_id` int(11) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `report_card_publications`
--

CREATE TABLE `report_card_publications` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `composition_id` int(11) NOT NULL,
  `school_year` varchar(20) NOT NULL DEFAULT '2025-2026',
  `published` tinyint(1) NOT NULL DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `published_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `schedules`
--

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL,
  `class_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `school_year` varchar(9) DEFAULT '2024-2025',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_weekly_schedule` tinyint(1) DEFAULT 0,
  `is_published` tinyint(1) DEFAULT 0,
  `course_description` text DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `domain` varchar(50) DEFAULT NULL,
  `time_of_day` enum('morning','afternoon','evening') DEFAULT 'morning'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `slider_images`
--

CREATE TABLE `slider_images` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `order_index` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('M','F','Other') DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `registration_number` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `previous_school` varchar(255) DEFAULT NULL,
  `previous_class` varchar(100) DEFAULT NULL,
  `special_needs` text DEFAULT NULL,
  `additional_info` text DEFAULT NULL,
  `registration_mode` enum('online','onsite') NOT NULL DEFAULT 'onsite',
  `student_code` varchar(20) DEFAULT NULL,
  `parent_code` varchar(20) DEFAULT NULL,
  `parent_first_name` varchar(100) DEFAULT NULL,
  `parent_last_name` varchar(100) DEFAULT NULL,
  `parent_phone` varchar(30) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `parent_contact` varchar(100) DEFAULT NULL,
  `child_photo` varchar(255) DEFAULT NULL,
  `cantine` tinyint(1) DEFAULT 0,
  `eats_at_cantine` tinyint(1) DEFAULT NULL,
  `allergy` varchar(255) DEFAULT NULL,
  `father_contact` varchar(100) DEFAULT NULL,
  `mother_contact` varchar(100) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `student_discounts`
--

CREATE TABLE `student_discounts` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `discount_type_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `percentage` decimal(5,2) DEFAULT 0.00,
  `reason` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_year` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `student_installment_balances`
--

CREATE TABLE `student_installment_balances` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `installment_id` int(11) DEFAULT NULL,
  `level_installment_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_overdue` tinyint(1) NOT NULL DEFAULT 0,
  `last_payment_date` timestamp NULL DEFAULT NULL,
  `school_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `student_media`
--

CREATE TABLE `student_media` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `level_groups` varchar(100) DEFAULT 'all' COMMENT 'Groupes de niveaux compatibles: cp1_cp2, ce1_cm2, all'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `subject_bulletin_mappings`
--

CREATE TABLE `subject_bulletin_mappings` (
  `id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `bulletin_subject_id` int(11) NOT NULL,
  `level_group` enum('cp','ce_cm') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `code` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `qualification` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `main_class_id` int(11) DEFAULT NULL,
  `aide_first_name` varchar(100) DEFAULT NULL,
  `aide_last_name` varchar(100) DEFAULT NULL,
  `aide_contact` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teacher_absences`
--

CREATE TABLE `teacher_absences` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('excused','unexcused') DEFAULT 'unexcused',
  `duration_hours` decimal(4,2) NOT NULL DEFAULT 1.00,
  `class_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `school_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teacher_classes`
--

CREATE TABLE `teacher_classes` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teacher_class_assignments`
--

CREATE TABLE `teacher_class_assignments` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `school_year` varchar(9) NOT NULL DEFAULT '2025-2026',
  `is_main_teacher` tinyint(1) DEFAULT 1,
  `assigned_date` date DEFAULT curdate(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teacher_subjects`
--

CREATE TABLE `teacher_subjects` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `contact` varchar(20) DEFAULT NULL,
  `civilité` enum('M.','Mme.','Mlle.') DEFAULT 'M.',
  `fonction` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','secretary','directrice','teacher','student','parent','educateur','comptable','comunicateur','informaticien') NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `email`, `first_name`, `last_name`, `contact`, `civilité`, `fonction`, `password`, `role`, `created_at`, `updated_at`) VALUES
(687, 'admin@trayebernard-primaire.com', 'Admin', 'Fondateur', '+2250708022424', 'M.', 'Directeur', '$2b$10$CiRxrSqF4piy7hjUJwstg.S/Pynv9tdPO6JH1R4FEUXlUP7BrKzDK', 'admin', '2025-12-12 00:59:18', '2025-12-12 00:59:18');

-- --------------------------------------------------------

--
-- Structure de la table `user_notifications`
--

CREATE TABLE `user_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_bulletin_subjects_with_subject_id`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_bulletin_subjects_with_subject_id` (
`bulletin_subject_id` int(11)
,`name` varchar(100)
,`level_group` enum('cp','ce_cm')
,`display_order` int(11)
,`subject_id` int(11)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_compositions_active`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_compositions_active` (
`id` int(11)
,`name` varchar(255)
,`description` text
,`composition_date` date
,`start_date` date
,`end_date` date
,`school_year` varchar(9)
,`is_active` tinyint(1)
,`status` varchar(11)
,`days_until_composition` int(8)
);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `absences`
--
ALTER TABLE `absences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `fk_absences_class` (`class_id`),
  ADD KEY `fk_absences_subject` (`subject_id`),
  ADD KEY `fk_absences_teacher` (`teacher_id`);

--
-- Index pour la table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `activity_images`
--
ALTER TABLE `activity_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `activity_id` (`activity_id`);

--
-- Index pour la table `bulletin_subjects`
--
ALTER TABLE `bulletin_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_bulletin_subject` (`name`,`level_group`);

--
-- Index pour la table `cantine_payments`
--
ALTER TABLE `cantine_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `school_year` (`school_year`),
  ADD KEY `receipt_number` (`receipt_number`),
  ADD KEY `idx_student_type_id` (`student_type`,`student_id`),
  ADD KEY `idx_cantine_payments_month_year` (`student_id`,`student_type`,`month_number`,`year`),
  ADD KEY `idx_cantine_payments_school_year_month` (`school_year`,`month_number`,`year`);

--
-- Index pour la table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_classes_education_level` (`education_level_id`),
  ADD KEY `fk_classes_main_teacher` (`main_teacher_id`);

--
-- Index pour la table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_class_subject` (`class_id`,`subject_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Index pour la table `class_subject_groups`
--
ALTER TABLE `class_subject_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_class_group` (`class_name`,`subject_group`),
  ADD KEY `fk_class_subject_groups_education_level` (`education_level_id`);

--
-- Index pour la table `compositions`
--
ALTER TABLE `compositions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school_year` (`school_year`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `fk_compositions_created_by` (`created_by`);

--
-- Index pour la table `composition_classes`
--
ALTER TABLE `composition_classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_composition_class` (`composition_id`,`class_id`),
  ADD KEY `idx_composition` (`composition_id`),
  ADD KEY `idx_class` (`class_id`);

--
-- Index pour la table `discount_types`
--
ALTER TABLE `discount_types`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `education_levels`
--
ALTER TABLE `education_levels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_education_levels_active` (`is_active`),
  ADD KEY `idx_education_levels_order` (`order_index`);

--
-- Index pour la table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `class_id` (`class_id`);

--
-- Index pour la table `garderie_inscriptions`
--
ALTER TABLE `garderie_inscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_garderie_school_year` (`school_year`);

--
-- Index pour la table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `idx_composition_id` (`composition_id`),
  ADD KEY `fk_grades_bulletin_subject` (`bulletin_subject_id`);

--
-- Index pour la table `history`
--
ALTER TABLE `history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Index pour la table `homepage_content`
--
ALTER TABLE `homepage_content`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `installments`
--
ALTER TABLE `installments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_installments_student` (`student_id`),
  ADD KEY `idx_installments_level_installment` (`level_installment_id`),
  ADD KEY `idx_installments_due_date` (`due_date`),
  ADD KEY `idx_installments_status` (`status`),
  ADD KEY `idx_installments_school_year` (`school_year`),
  ADD KEY `idx_installments_class` (`class_id`),
  ADD KEY `idx_installments_education_level` (`education_level_id`);

--
-- Index pour la table `installment_payments`
--
ALTER TABLE `installment_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_installment_payments_installment` (`installment_id`),
  ADD KEY `idx_installment_payments_student` (`student_id`),
  ADD KEY `idx_installment_payments_created_by` (`created_by`),
  ADD KEY `idx_installment_payments_school_year` (`school_year`);

--
-- Index pour la table `level_installments`
--
ALTER TABLE `level_installments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_level_installment` (`education_level_id`,`installment_number`),
  ADD KEY `idx_level_installments_level` (`education_level_id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `fk_notifications_student` (`student_id`),
  ADD KEY `fk_notifications_sender` (`sender_id`),
  ADD KEY `fk_notifications_subject` (`subject_id`);

--
-- Index pour la table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `payment_discounts`
--
ALTER TABLE `payment_discounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_payment_discounts_payment` (`payment_id`),
  ADD KEY `fk_payment_discounts_student_discount` (`student_discount_id`);

--
-- Index pour la table `report_card_publications`
--
ALTER TABLE `report_card_publications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_publication` (`class_id`,`composition_id`,`school_year`),
  ADD KEY `idx_class_id` (`class_id`),
  ADD KEY `idx_composition_id` (`composition_id`),
  ADD KEY `idx_published` (`published`),
  ADD KEY `fk_report_card_publications_published_by` (`published_by`);

--
-- Index pour la table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_schedules_class` (`class_id`),
  ADD KEY `fk_schedules_subject` (`subject_id`),
  ADD KEY `fk_schedules_teacher` (`teacher_id`);

--
-- Index pour la table `slider_images`
--
ALTER TABLE `slider_images`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_students_user` (`user_id`);

--
-- Index pour la table `student_discounts`
--
ALTER TABLE `student_discounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_student_discounts_student` (`student_id`),
  ADD KEY `fk_student_discounts_discount_type` (`discount_type_id`),
  ADD KEY `fk_student_discounts_approved_by` (`approved_by`);

--
-- Index pour la table `student_installment_balances`
--
ALTER TABLE `student_installment_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_installment` (`student_id`,`installment_id`,`school_year`),
  ADD KEY `idx_student_balances_student` (`student_id`),
  ADD KEY `idx_student_balances_installment` (`installment_id`),
  ADD KEY `idx_student_balances_level_installment` (`level_installment_id`),
  ADD KEY `idx_student_balances_school_year` (`school_year`),
  ADD KEY `idx_student_balances_overdue` (`is_overdue`);

--
-- Index pour la table `student_media`
--
ALTER TABLE `student_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_student_media_student` (`student_id`);

--
-- Index pour la table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `subject_bulletin_mappings`
--
ALTER TABLE `subject_bulletin_mappings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_subject_bulletin_level` (`subject_id`,`bulletin_subject_id`,`level_group`),
  ADD KEY `fk_sbm_bulletin_subject` (`bulletin_subject_id`);

--
-- Index pour la table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_teachers_user` (`user_id`),
  ADD KEY `fk_teachers_main_class` (`main_class_id`);

--
-- Index pour la table `teacher_absences`
--
ALTER TABLE `teacher_absences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_teacher_absences_teacher` (`teacher_id`),
  ADD KEY `fk_teacher_absences_class` (`class_id`),
  ADD KEY `fk_teacher_absences_subject` (`subject_id`);

--
-- Index pour la table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_teacher_classes_teacher` (`teacher_id`),
  ADD KEY `fk_teacher_classes_class` (`class_id`);

--
-- Index pour la table `teacher_class_assignments`
--
ALTER TABLE `teacher_class_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_teacher_year` (`teacher_id`,`school_year`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `idx_school_year` (`school_year`),
  ADD KEY `idx_teacher_class` (`teacher_id`,`class_id`);

--
-- Index pour la table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_teacher_subjects_teacher` (`teacher_id`),
  ADD KEY `fk_teacher_subjects_subject` (`subject_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_users_email` (`email`);

--
-- Index pour la table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user_notifications_user` (`user_id`),
  ADD KEY `fk_user_notifications_notification` (`notification_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `absences`
--
ALTER TABLE `absences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `activity_images`
--
ALTER TABLE `activity_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `bulletin_subjects`
--
ALTER TABLE `bulletin_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `cantine_payments`
--
ALTER TABLE `cantine_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT pour la table `class_subjects`
--
ALTER TABLE `class_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT pour la table `class_subject_groups`
--
ALTER TABLE `class_subject_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `compositions`
--
ALTER TABLE `compositions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `composition_classes`
--
ALTER TABLE `composition_classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT pour la table `discount_types`
--
ALTER TABLE `discount_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `education_levels`
--
ALTER TABLE `education_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=642;

--
-- AUTO_INCREMENT pour la table `garderie_inscriptions`
--
ALTER TABLE `garderie_inscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `grades`
--
ALTER TABLE `grades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1115;

--
-- AUTO_INCREMENT pour la table `history`
--
ALTER TABLE `history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2172;

--
-- AUTO_INCREMENT pour la table `installments`
--
ALTER TABLE `installments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3320;

--
-- AUTO_INCREMENT pour la table `installment_payments`
--
ALTER TABLE `installment_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1961;

--
-- AUTO_INCREMENT pour la table `level_installments`
--
ALTER TABLE `level_installments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1543;

--
-- AUTO_INCREMENT pour la table `payment_discounts`
--
ALTER TABLE `payment_discounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `report_card_publications`
--
ALTER TABLE `report_card_publications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT pour la table `slider_images`
--
ALTER TABLE `slider_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=630;

--
-- AUTO_INCREMENT pour la table `student_discounts`
--
ALTER TABLE `student_discounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `student_installment_balances`
--
ALTER TABLE `student_installment_balances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3320;

--
-- AUTO_INCREMENT pour la table `student_media`
--
ALTER TABLE `student_media`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT pour la table `subject_bulletin_mappings`
--
ALTER TABLE `subject_bulletin_mappings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `teacher_absences`
--
ALTER TABLE `teacher_absences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `teacher_class_assignments`
--
ALTER TABLE `teacher_class_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=688;

--
-- AUTO_INCREMENT pour la table `user_notifications`
--
ALTER TABLE `user_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

-- --------------------------------------------------------

--
-- Structure de la vue `v_bulletin_subjects_with_subject_id`
--
DROP TABLE IF EXISTS `v_bulletin_subjects_with_subject_id`;

CREATE ALGORITHM=UNDEFINED DEFINER=`trayeber`@`localhost` SQL SECURITY DEFINER VIEW `v_bulletin_subjects_with_subject_id`  AS SELECT `bs`.`id` AS `bulletin_subject_id`, `bs`.`name` AS `name`, `bs`.`level_group` AS `level_group`, `bs`.`display_order` AS `display_order`, `s`.`id` AS `subject_id` FROM (`bulletin_subjects` `bs` left join `subjects` `s` on(`s`.`name` = `bs`.`name`)) ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_compositions_active`
--
DROP TABLE IF EXISTS `v_compositions_active`;

CREATE ALGORITHM=UNDEFINED DEFINER=`trayeber`@`localhost` SQL SECURITY DEFINER VIEW `v_compositions_active`  AS SELECT `c`.`id` AS `id`, `c`.`name` AS `name`, `c`.`description` AS `description`, `c`.`composition_date` AS `composition_date`, `c`.`start_date` AS `start_date`, `c`.`end_date` AS `end_date`, `c`.`school_year` AS `school_year`, `c`.`is_active` AS `is_active`, CASE WHEN curdate() < `c`.`composition_date` THEN 'À venir' WHEN curdate() = `c`.`composition_date` THEN 'Aujourd\'hui' WHEN curdate() > `c`.`composition_date` THEN 'Terminée' ELSE 'Non défini' END AS `status`, to_days(`c`.`composition_date`) - to_days(curdate()) AS `days_until_composition` FROM `compositions` AS `c` WHERE `c`.`is_active` = 1 ORDER BY `c`.`composition_date` ASC ;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `absences`
--
ALTER TABLE `absences`
  ADD CONSTRAINT `fk_absences_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_absences_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_absences_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_absences_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `activity_images`
--
ALTER TABLE `activity_images`
  ADD CONSTRAINT `fk_activity_images_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `cantine_payments`
--
ALTER TABLE `cantine_payments`
  ADD CONSTRAINT `fk_cantine_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `fk_classes_education_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_classes_main_teacher` FOREIGN KEY (`main_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD CONSTRAINT `fk_class_subjects_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_class_subjects_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `class_subject_groups`
--
ALTER TABLE `class_subject_groups`
  ADD CONSTRAINT `fk_class_subject_groups_education_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `compositions`
--
ALTER TABLE `compositions`
  ADD CONSTRAINT `fk_compositions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `composition_classes`
--
ALTER TABLE `composition_classes`
  ADD CONSTRAINT `composition_classes_ibfk_1` FOREIGN KEY (`composition_id`) REFERENCES `compositions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `composition_classes_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `fk_grades_bulletin_subject` FOREIGN KEY (`bulletin_subject_id`) REFERENCES `bulletin_subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_grades_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_grades_composition` FOREIGN KEY (`composition_id`) REFERENCES `compositions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_grades_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `history`
--
ALTER TABLE `history`
  ADD CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `installments`
--
ALTER TABLE `installments`
  ADD CONSTRAINT `fk_installments_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_installments_education_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_installments_level_installment` FOREIGN KEY (`level_installment_id`) REFERENCES `level_installments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_installments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `installment_payments`
--
ALTER TABLE `installment_payments`
  ADD CONSTRAINT `fk_installment_payments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_installment_payments_installment` FOREIGN KEY (`installment_id`) REFERENCES `installments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_installment_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `level_installments`
--
ALTER TABLE `level_installments`
  ADD CONSTRAINT `fk_level_installments_education_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `payment_discounts`
--
ALTER TABLE `payment_discounts`
  ADD CONSTRAINT `fk_payment_discounts_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payment_discounts_student_discount` FOREIGN KEY (`student_discount_id`) REFERENCES `student_discounts` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `report_card_publications`
--
ALTER TABLE `report_card_publications`
  ADD CONSTRAINT `fk_report_card_publications_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_report_card_publications_composition` FOREIGN KEY (`composition_id`) REFERENCES `compositions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_report_card_publications_published_by` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_schedules_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_schedules_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_schedules_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `student_discounts`
--
ALTER TABLE `student_discounts`
  ADD CONSTRAINT `fk_student_discounts_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_student_discounts_discount_type` FOREIGN KEY (`discount_type_id`) REFERENCES `discount_types` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_student_discounts_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `student_installment_balances`
--
ALTER TABLE `student_installment_balances`
  ADD CONSTRAINT `fk_student_installment_balances_installment` FOREIGN KEY (`installment_id`) REFERENCES `installments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_student_installment_balances_level_installment` FOREIGN KEY (`level_installment_id`) REFERENCES `level_installments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_student_installment_balances_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `student_media`
--
ALTER TABLE `student_media`
  ADD CONSTRAINT `fk_student_media_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `subject_bulletin_mappings`
--
ALTER TABLE `subject_bulletin_mappings`
  ADD CONSTRAINT `fk_sbm_bulletin_subject` FOREIGN KEY (`bulletin_subject_id`) REFERENCES `bulletin_subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sbm_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `fk_teachers_main_class` FOREIGN KEY (`main_class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_teachers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `teacher_absences`
--
ALTER TABLE `teacher_absences`
  ADD CONSTRAINT `fk_teacher_absences_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_teacher_absences_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_teacher_absences_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  ADD CONSTRAINT `fk_teacher_classes_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_teacher_classes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `teacher_class_assignments`
--
ALTER TABLE `teacher_class_assignments`
  ADD CONSTRAINT `teacher_class_assignments_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_class_assignments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  ADD CONSTRAINT `fk_teacher_subjects_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_teacher_subjects_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD CONSTRAINT `fk_user_notifications_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
