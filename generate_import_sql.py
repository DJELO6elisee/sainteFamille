#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les INSERT SQL pour l'import des élèves Sainte Famille 2025-2026.
- Lit le CSV, déduplique par CODE ECOLE (une seule ligne par élève).
- NOM ET PRENOM → premier mot = last_name, le reste = first_name.
- CLASSE normalisée (TRIM).
- DATE d'inscription extraite du CSV.
- Ignore les lignes sans CODE ECOLE valide ou sans CLASSE.
"""
import csv
import os
import re

CSV_PATH = os.path.join(os.path.dirname(__file__) or ".", "LISTE-DES-ELEVES-SAINTE-FAMILLE-2025-2026-_1_.csv")
SQL_OUT_PATH = os.path.join(os.path.dirname(__file__) or ".", "import_eleves_sainte_famille_complet.sql")

# Colonnes du CSV (index 0-based): N° D'ORDRE=0, DATE=1, ENVELOPPE=2, CODE ECOLE=3, NOM ET PRENOM=4, N° RECU=5, CLASSE=6, ...
IDX_CODE_ECOLE = 3
IDX_DATE = 1
IDX_NOM_PRENOM = 4
IDX_CLASSE = 6

CLASSES_VALIDES = {"PS", "MS", "GS", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2"}


def escape_sql(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def normaliser_classe(classe):
    if not classe:
        return ""
    c = classe.strip().upper()
    c = re.sub(r"\s+", "", c)
    if c in CLASSES_VALIDES:
        return c
    return ""


def nom_prenom_from_champ(nom_et_prenom):
    if not nom_et_prenom or not nom_et_prenom.strip():
        return "", ""
    parts = nom_et_prenom.strip().split(None, 1)
    last_name = parts[0].strip() if parts else ""
    first_name = parts[1].strip() if len(parts) > 1 else ""
    return last_name, first_name


def parse_date_csv(date_str):
    """Convertit la date du CSV (M/D/YYYY) en YYYY-MM-DD pour SQL."""
    if not date_str or not date_str.strip():
        return None
    date_str = date_str.strip()
    parts = re.split(r"[/\-.]", date_str)
    if len(parts) != 3:
        return None
    try:
        a, b, c = int(parts[0]), int(parts[1]), int(parts[2])
        if c > 31:
            year = c
            if a > 12:
                month, day = b, a
            else:
                month, day = a, b
        elif a > 31:
            year = a
            month, day = b, c
        else:
            year = c
            month, day = a, b
        if 1 <= month <= 12 and 1 <= day <= 31 and 2020 <= year <= 2030:
            return "{:04d}-{:02d}-{:02d}".format(year, month, day)
    except (ValueError, TypeError):
        pass
    return None


def main():
    seen_codes = set()
    rows = []

    with open(CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if len(row) <= max(IDX_CODE_ECOLE, IDX_CLASSE):
                continue
            code_ecole = (row[IDX_CODE_ECOLE] or "").strip()
            if not code_ecole or code_ecole == "CODE ECOLE" or code_ecole == "2026/":
                continue
            classe = normaliser_classe(row[IDX_CLASSE] if len(row) > IDX_CLASSE else "")
            if not classe:
                continue
            if code_ecole in seen_codes:
                continue
            seen_codes.add(code_ecole)
            date_inscription = parse_date_csv(row[IDX_DATE] if len(row) > IDX_DATE else "")
            nom_prenom = (row[IDX_NOM_PRENOM] or "").strip()
            last_name, first_name = nom_prenom_from_champ(nom_prenom)
            if not last_name and not first_name:
                continue
            rows.append((code_ecole, last_name, first_name, classe, date_inscription))

    # Construire le SQL complet
    sql_lines = []
    
    # En-tête
    sql_lines.append("-- =============================================================================")
    sql_lines.append("-- Import des élèves Sainte Famille 2025-2026")
    sql_lines.append("-- Base: trayeber_primaire")
    sql_lines.append("-- Unicité: un seul élève par CODE ECOLE (dédupliqué depuis le CSV)")
    sql_lines.append("-- =============================================================================")
    sql_lines.append("")
    sql_lines.append("SET NAMES utf8mb4;")
    sql_lines.append("SET FOREIGN_KEY_CHECKS = 0;")
    sql_lines.append("")
    
    # Niveaux d'éducation : Maternelle (PS, MS, GS) + Primaire (CP1–CM2)
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 1. Niveaux d'éducation (Maternelle regroupe PS, MS, GS)")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("INSERT IGNORE INTO `education_levels` (`id`, `name`, `description`, `tuition_amount`, `registration_fee`, `cantine_amount`, `is_active`, `order_index`) VALUES")
    sql_lines.append("(1, 'Maternelle', 'PS, MS, GS (Petite, Moyenne, Grande Section)', 0.00, 0.00, 0.00, 1, 1),")
    sql_lines.append("(2, 'CP1', 'Cours Préparatoire 1ère année', 0.00, 0.00, 0.00, 1, 2),")
    sql_lines.append("(3, 'CP2', 'Cours Préparatoire 2ème année', 0.00, 0.00, 0.00, 1, 3),")
    sql_lines.append("(4, 'CE1', 'Cours Élémentaire 1ère année', 0.00, 0.00, 0.00, 1, 4),")
    sql_lines.append("(5, 'CE2', 'Cours Élémentaire 2ème année', 0.00, 0.00, 0.00, 1, 5),")
    sql_lines.append("(6, 'CM1', 'Cours Moyen 1ère année', 0.00, 0.00, 0.00, 1, 6),")
    sql_lines.append("(7, 'CM2', 'Cours Moyen 2ème année', 0.00, 0.00, 0.00, 1, 7);")
    sql_lines.append("")
    
    # Classes : PS, MS, GS → Maternelle (id 1) ; CP1–CM2 → niveaux 2–7
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 2. Classes pour l'année 2025-2026 (PS/MS/GS = Maternelle)")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("INSERT IGNORE INTO `classes` (`name`, `education_level_id`, `academic_year`, `school_year`, `main_teacher_id`, `timetable_published`) VALUES")
    sql_lines.append("('PS', 1, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('MS', 1, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('GS', 1, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CP1', 2, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CP2', 3, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CE1', 4, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CE2', 5, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CM1', 6, '2025-2026', '2025-2026', NULL, 0),")
    sql_lines.append("('CM2', 7, '2025-2026', '2025-2026', NULL, 0);")
    sql_lines.append("")
    
    # Contrainte unicité
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 3. Contrainte d'unicité sur le code élève")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- À exécuter une seule fois. Si l'index existe déjà, ignorer l'erreur.")
    sql_lines.append("ALTER TABLE `students` ADD UNIQUE KEY `unique_student_code` (`student_code`);")
    sql_lines.append("")
    
    # Table de staging AVEC enrollment_date
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 4. Table temporaire de staging (CODE ECOLE unique + DATE d'inscription)")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("CREATE TEMPORARY TABLE IF NOT EXISTS _staging_import (")
    sql_lines.append("  student_code VARCHAR(20) NOT NULL,")
    sql_lines.append("  last_name VARCHAR(100) NOT NULL,")
    sql_lines.append("  first_name VARCHAR(255) NOT NULL,")
    sql_lines.append("  class_name VARCHAR(10) NOT NULL,")
    sql_lines.append("  enrollment_date DATE DEFAULT NULL")
    sql_lines.append(");")
    sql_lines.append("")
    
    # INSERT staging avec 5 colonnes
    sql_lines.append("INSERT INTO _staging_import (student_code, last_name, first_name, class_name, enrollment_date) VALUES")
    values = []
    for code, ln, fn, cl, enrollment_date in rows:
        date_sql = escape_sql(enrollment_date) if enrollment_date else "NULL"
        values.append("  ({}, {}, {}, {}, {})".format(
            escape_sql(code), escape_sql(ln), escape_sql(fn or " "), escape_sql(cl), date_sql
        ))
    sql_lines.append(",\n".join(values) + ";")
    sql_lines.append("")
    
    # Insertion élèves
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 5. Insertion des élèves (un par code école)")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("INSERT INTO students (first_name, last_name, student_code, registration_number, registration_mode)")
    sql_lines.append("SELECT first_name, last_name, student_code, student_code, 'onsite' FROM _staging_import")
    sql_lines.append("ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name);")
    sql_lines.append("")
    
    # Inscriptions avec date du CSV
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("-- 6. Inscriptions (lien élève – classe pour 2025-2026) avec DATE du CSV")
    sql_lines.append("-- -----------------------------------------------------------------------------")
    sql_lines.append("INSERT IGNORE INTO enrollments (student_id, class_id, enrollment_date, status, school_year)")
    sql_lines.append("SELECT s.id, c.id, COALESCE(e.enrollment_date, CURDATE()), 'active', '2025-2026'")
    sql_lines.append("FROM _staging_import e")
    sql_lines.append("JOIN students s ON s.student_code = e.student_code")
    sql_lines.append("JOIN classes c ON c.name = e.class_name AND c.school_year = '2025-2026';")
    sql_lines.append("")
    sql_lines.append("DROP TEMPORARY TABLE IF EXISTS _staging_import;")
    sql_lines.append("")
    sql_lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    
    # Écrire le fichier
    with open(SQL_OUT_PATH, "w", encoding="utf-8") as out:
        out.write("\n".join(sql_lines))
    
    print("Élèves uniques (par CODE ECOLE):", len(rows))
    print("Fichier généré:", SQL_OUT_PATH)


if __name__ == "__main__":
    main()
