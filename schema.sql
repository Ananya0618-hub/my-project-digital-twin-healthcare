CREATE TABLE `digital_twin_interaction` (
  `interaction_id` bigint NOT NULL AUTO_INCREMENT,
  `doctor_reg_id` varchar(50) DEFAULT NULL,
  `aadhaar_id` varchar(12) DEFAULT NULL,
  `prompt_text` text,
  `ai_response` text,
  `timestamp` datetime DEFAULT NULL,
  PRIMARY KEY (`interaction_id`),
  KEY `doctor_reg_id` (`doctor_reg_id`),
  KEY `aadhaar_id` (`aadhaar_id`),
  CONSTRAINT `digital_twin_interaction_ibfk_1` FOREIGN KEY (`doctor_reg_id`) REFERENCES `doctor` (`doctor_reg_id`),
  CONSTRAINT `digital_twin_interaction_ibfk_2` FOREIGN KEY (`aadhaar_id`) REFERENCES `patient` (`aadhaar_id`)
)

CREATE TABLE `digital_twin_patient` (
  `aadhaar_id` varchar(12) NOT NULL,
  `lifetime_summary` text,
  `chronic_conditions` text,
  `risk_assessment` varchar(20) DEFAULT NULL,
  `ai_recommendations` text,
  `last_updated` datetime DEFAULT NULL,
  PRIMARY KEY (`aadhaar_id`),
  CONSTRAINT `fk_dtp_patient` FOREIGN KEY (`aadhaar_id`) REFERENCES `patient` (`aadhaar_id`)
) 

CREATE TABLE `doctor` (
  `doctor_reg_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `speciality` varchar(150) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`doctor_reg_id`)
)

CREATE TABLE `doctor_hospital` (
  `doctor_reg_id` varchar(50) NOT NULL,
  `hospital_id` varchar(50) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`doctor_reg_id`,`hospital_id`),
  KEY `fk_dh_hospital` (`hospital_id`),
  CONSTRAINT `fk_dh_doctor` FOREIGN KEY (`doctor_reg_id`) REFERENCES `doctor` (`doctor_reg_id`),
  CONSTRAINT `fk_dh_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospital` (`hospital_id`)
) 
CREATE TABLE `hospital` (
  `hospital_id` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `address` varchar(300) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hospital_id`)
)
CREATE TABLE `lab_result` (
  `lab_result_id` bigint NOT NULL AUTO_INCREMENT,
  `treatment_id` bigint NOT NULL,
  `test_name` varchar(200) NOT NULL,
  `result_value` varchar(100) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `reference_range` varchar(100) DEFAULT NULL,
  `test_date` datetime DEFAULT NULL,
  PRIMARY KEY (`lab_result_id`),
  KEY `idx_lr_treatment` (`treatment_id`),
  CONSTRAINT `fk_lr_treatment` FOREIGN KEY (`treatment_id`) REFERENCES `treatment_record` (`treatment_id`)
)

CREATE TABLE `patient` (
  `aadhaar_id` varchar(12) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`aadhaar_id`)
)
CREATE TABLE `patient_hospital_visit` (
  `visit_id` bigint NOT NULL AUTO_INCREMENT,
  `aadhaar_id` varchar(12) DEFAULT NULL,
  `hospital_id` varchar(50) DEFAULT NULL,
  `visit_date` datetime DEFAULT NULL,
  `reason_for_visit` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`visit_id`)
)
CREATE TABLE `treatment_record` (
  `treatment_id` bigint NOT NULL AUTO_INCREMENT,
  `visit_id` bigint NOT NULL,
  `doctor_reg_id` varchar(50) DEFAULT NULL,
  `diagnosis` text,
  `treatment_summary` text,
  `medications` text,
  `procedures` text,
  `treatment_date` datetime NOT NULL,
  PRIMARY KEY (`treatment_id`),
  KEY `idx_tr_visit` (`visit_id`),
  KEY `idx_tr_doctor` (`doctor_reg_id`),
  CONSTRAINT `fk_tr_doctor` FOREIGN KEY (`doctor_reg_id`) REFERENCES `doctor` (`doctor_reg_id`),
  CONSTRAINT `fk_tr_visit` FOREIGN KEY (`visit_id`) REFERENCES `patient_hospital_visit` (`visit_id`)
) 