-- =============================================================================
-- Import des élèves Sainte Famille 2025-2026
-- Base: trayeber_primaire
-- Unicité: un seul élève par CODE ECOLE (dédupliqué depuis le CSV)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Niveaux d'éducation (Maternelle = PS/MS/GS ; Primaire = CP1–CM2)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `education_levels` (`id`, `name`, `description`, `tuition_amount`, `registration_fee`, `cantine_amount`, `is_active`, `order_index`) VALUES
(1, 'Maternelle', 'PS, MS, GS (Petite, Moyenne, Grande Section)', 0.00, 0.00, 0.00, 1, 1),
(2, 'CP1', 'Cours Préparatoire 1ère année', 0.00, 0.00, 0.00, 1, 2),
(3, 'CP2', 'Cours Préparatoire 2ème année', 0.00, 0.00, 0.00, 1, 3),
(4, 'CE1', 'Cours Élémentaire 1ère année', 0.00, 0.00, 0.00, 1, 4),
(5, 'CE2', 'Cours Élémentaire 2ème année', 0.00, 0.00, 0.00, 1, 5),
(6, 'CM1', 'Cours Moyen 1ère année', 0.00, 0.00, 0.00, 1, 6),
(7, 'CM2', 'Cours Moyen 2ème année', 0.00, 0.00, 0.00, 1, 7);

-- -----------------------------------------------------------------------------
-- 2. Classes 2025-2026 (PS, MS, GS → Maternelle ; CP1–CM2 → niveaux 2–7)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `classes` (`name`, `education_level_id`, `academic_year`, `school_year`, `main_teacher_id`, `timetable_published`) VALUES
('PS', 1, '2025-2026', '2025-2026', NULL, 0),
('MS', 1, '2025-2026', '2025-2026', NULL, 0),
('GS', 1, '2025-2026', '2025-2026', NULL, 0),
('CP1', 2, '2025-2026', '2025-2026', NULL, 0),
('CP2', 3, '2025-2026', '2025-2026', NULL, 0),
('CE1', 4, '2025-2026', '2025-2026', NULL, 0),
('CE2', 5, '2025-2026', '2025-2026', NULL, 0),
('CM1', 6, '2025-2026', '2025-2026', NULL, 0),
('CM2', 7, '2025-2026', '2025-2026', NULL, 0);

-- -----------------------------------------------------------------------------
-- 3. Contrainte d'unicité sur le code élève (éviter doublons)
-- -----------------------------------------------------------------------------
-- À exécuter une seule fois. Si l'index existe déjà, ignorer l'erreur.
ALTER TABLE `students` ADD UNIQUE KEY `unique_student_code` (`student_code`);

-- -----------------------------------------------------------------------------
-- 4. Élèves et inscriptions (générés par le script Python)
-- Exécutez: python generate_import_sql.py
-- Cela crée import_eleves_sainte_famille_complet.sql avec les INSERT.
-- -----------------------------------------------------------------------------
