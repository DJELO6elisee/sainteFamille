-- Migration : Frais annexes et zones car par année scolaire
-- Base : trayeber_primaire
-- Chaque frais annexe a un nom et un montant, payable une seule fois par élève et par année.
-- Le car se paye par zone ; chaque zone a son montant (payable plusieurs fois par élève et par année).

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Table `annexe_fees` (frais annexes - payables une fois par élève et par année)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `annexe_fees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nom du frais annexe',
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Montant en FCFA',
  `school_year` varchar(9) NOT NULL COMMENT 'Année scolaire (ex: 2025-2026)',
  `is_active` tinyint(1) DEFAULT 1,
  `order_index` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_annexe_fees_school_year` (`school_year`),
  KEY `idx_annexe_fees_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Frais annexes par année scolaire (payables une fois par élève)';

-- --------------------------------------------------------
-- Table `car_zones` (zones pour le car - chaque zone a un montant)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `car_zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nom de la zone',
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Montant en FCFA par zone',
  `school_year` varchar(9) NOT NULL COMMENT 'Année scolaire',
  `is_active` tinyint(1) DEFAULT 1,
  `order_index` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_car_zones_school_year` (`school_year`),
  KEY `idx_car_zones_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Zones car par année scolaire (payables plusieurs fois par élève)';

-- --------------------------------------------------------
-- Table `annexe_fee_payments` (paiements des frais annexes et du car)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `annexe_fee_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `school_year` varchar(9) NOT NULL,
  `annexe_fee_id` int(11) DEFAULT NULL COMMENT 'Rempli pour un frais annexe classique (payable une fois)',
  `car_zone_id` int(11) DEFAULT NULL COMMENT 'Rempli pour un paiement car (zone)',
  `amount` decimal(10,2) NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `payment_method` enum('Espèces','Chèque','Virement','Mobile Money') NOT NULL DEFAULT 'Espèces',
  `receipt_number` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_annexe_fee_payments_student` (`student_id`),
  KEY `idx_annexe_fee_payments_school_year` (`school_year`),
  KEY `fk_annexe_fee_payments_annexe_fee` (`annexe_fee_id`),
  KEY `fk_annexe_fee_payments_car_zone` (`car_zone_id`),
  CONSTRAINT `fk_annexe_fee_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_annexe_fee_payments_annexe_fee` FOREIGN KEY (`annexe_fee_id`) REFERENCES `annexe_fees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_annexe_fee_payments_car_zone` FOREIGN KEY (`car_zone_id`) REFERENCES `car_zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Paiements frais annexes ou car. Règle : exactement un de annexe_fee_id ou car_zone_id (vérifié en application).';
