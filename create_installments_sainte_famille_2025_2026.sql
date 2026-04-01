-- =============================================================================
-- Création des échéances (level_installments), versements (installments)
-- et soldes (student_installment_balances) pour les élèves Sainte Famille 2025-2026
-- Base: trayeber_primaire
-- À exécuter APRÈS import_eleves_sainte_famille_complet.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. level_installments : configuration par niveau (échéances 5 oct, 5 nov, etc.)
-- -----------------------------------------------------------------------------
-- Maternelle (id=1) : 30000, 30000, 30000, 15000, 15000 (total 120000)
-- CP1/CP2 (id=2,3)  : 35000, 35000, 35000, 15000, 10000 (total 130000)
-- CE1/CE2 (id=4,5)  : 40000, 40000, 30000, 15000, 15000 (total 140000)
-- CM1/CM2 (id=6,7)  : 45000, 45000, 40000, 10000, 10000 (total 150000)
-- -----------------------------------------------------------------------------

INSERT INTO `level_installments` (`education_level_id`, `installment_number`, `percentage`, `amount`, `due_date`, `is_active`) VALUES
-- Maternelle (1)
(1, 1, 25.00, 30000, '2025-10-05', 1),
(1, 2, 25.00, 30000, '2025-11-05', 1),
(1, 3, 25.00, 30000, '2025-12-05', 1),
(1, 4, 12.50, 15000, '2026-01-05', 1),
(1, 5, 12.50, 15000, '2026-02-05', 1),
-- CP1 (2)
(2, 1, 26.92, 35000, '2025-10-05', 1),
(2, 2, 26.92, 35000, '2025-11-05', 1),
(2, 3, 26.92, 35000, '2025-12-05', 1),
(2, 4, 11.54, 15000, '2026-01-05', 1),
(2, 5,  7.69, 10000, '2026-02-05', 1),
-- CP2 (3)
(3, 1, 26.92, 35000, '2025-10-05', 1),
(3, 2, 26.92, 35000, '2025-11-05', 1),
(3, 3, 26.92, 35000, '2025-12-05', 1),
(3, 4, 11.54, 15000, '2026-01-05', 1),
(3, 5,  7.69, 10000, '2026-02-05', 1),
-- CE1 (4)
(4, 1, 28.57, 40000, '2025-10-05', 1),
(4, 2, 28.57, 40000, '2025-11-05', 1),
(4, 3, 21.43, 30000, '2025-12-05', 1),
(4, 4, 10.71, 15000, '2026-01-05', 1),
(4, 5, 10.71, 15000, '2026-02-05', 1),
-- CE2 (5)
(5, 1, 28.57, 40000, '2025-10-05', 1),
(5, 2, 28.57, 40000, '2025-11-05', 1),
(5, 3, 21.43, 30000, '2025-12-05', 1),
(5, 4, 10.71, 15000, '2026-01-05', 1),
(5, 5, 10.71, 15000, '2026-02-05', 1),
-- CM1 (6)
(6, 1, 30.00, 45000, '2025-10-05', 1),
(6, 2, 30.00, 45000, '2025-11-05', 1),
(6, 3, 26.67, 40000, '2025-12-05', 1),
(6, 4,  6.67, 10000, '2026-01-05', 1),
(6, 5,  6.67, 10000, '2026-02-05', 1),
-- CM2 (7)
(7, 1, 30.00, 45000, '2025-10-05', 1),
(7, 2, 30.00, 45000, '2025-11-05', 1),
(7, 3, 26.67, 40000, '2025-12-05', 1),
(7, 4,  6.67, 10000, '2026-01-05', 1),
(7, 5,  6.67, 10000, '2026-02-05', 1)
ON DUPLICATE KEY UPDATE
  `amount` = VALUES(`amount`),
  `due_date` = VALUES(`due_date`),
  `percentage` = VALUES(`percentage`),
  `is_active` = VALUES(`is_active`);

-- -----------------------------------------------------------------------------
-- 2. installments : un versement par élève inscrit 2025-2026 × 5 échéances
-- -----------------------------------------------------------------------------
INSERT INTO `installments` (
  `student_id`, `level_installment_id`, `installment_number`, `amount`, `due_date`,
  `percentage`, `status`, `school_year`, `class_id`, `education_level_id`
)
SELECT
  e.student_id,
  li.id,
  li.installment_number,
  li.amount,
  li.due_date,
  li.percentage,
  'pending',
  '2025-2026',
  e.class_id,
  c.education_level_id
FROM enrollments e
JOIN classes c ON c.id = e.class_id
JOIN level_installments li ON li.education_level_id = c.education_level_id AND li.is_active = 1
WHERE e.school_year = '2025-2026' AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM installments i2
    WHERE i2.student_id = e.student_id
      AND i2.school_year = '2025-2026'
      AND i2.installment_number = li.installment_number
  );

-- -----------------------------------------------------------------------------
-- 3. student_installment_balances : solde initial (total = montant, payé = 0)
-- -----------------------------------------------------------------------------
INSERT INTO `student_installment_balances` (
  `student_id`, `installment_id`, `level_installment_id`, `total_amount`,
  `amount_paid`, `balance`, `is_overdue`, `school_year`
)
SELECT
  i.student_id,
  i.id,
  i.level_installment_id,
  i.amount,
  0.00,
  i.amount,
  0,
  '2025-2026'
FROM installments i
WHERE i.school_year = '2025-2026' AND i.level_installment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_installment_balances sib
    WHERE sib.installment_id = i.id AND sib.school_year = '2025-2026'
  );

SET FOREIGN_KEY_CHECKS = 1;

-- Fin du script
