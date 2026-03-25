INSERT INTO digital_twin_interaction
(doctor_reg_id, aadhaar_id, prompt_text, ai_response, timestamp) VALUES
('DOC1001','900000000000','What lifestyle changes should I make?','Maintain a balanced diet and regular exercise.','2024-05-01 10:00:00'),
('DOC1002','900000000001','How to manage recurring fever?','Stay hydrated and monitor body temperature.','2024-05-02 10:00:00'),
('DOC1003','900000000002','Diet recommendations for diabetes?','Follow a low sugar diet and regular checkups.','2024-05-03 10:00:00'),
('DOC1004','900000000003','Is my thyroid condition serious?','Regular medication and follow-ups help manage it.','2024-05-04 10:00:00'),
('DOC1005','900000000004','How can I reduce knee pain?','Physiotherapy and weight management are beneficial.','2024-05-05 10:00:00'),
('DOC1006','900000000005','What triggers skin allergies?','Avoid allergens and use prescribed medication.','2024-05-06 10:00:00'),
('DOC1007','900000000006','How to prevent migraines?','Ensure adequate sleep and stress control.','2024-05-07 10:00:00'),
('DOC1008','900000000007','How to control blood pressure?','Monitor BP and reduce salt intake.','2024-05-08 10:00:00'),
('DOC1009','900000000008','Foods to avoid for gastritis?','Avoid spicy foods and eat small meals.','2024-05-09 10:00:00'),
('DOC1010','900000000009','How to improve hemoglobin levels?','Consume iron-rich foods and supplements.','2024-05-10 10:00:00'),
('DOC1011','900000000010','How much Vitamin D is required?','Sun exposure and supplements help.','2024-05-11 10:00:00'),
('DOC1012','900000000011','Exercises for lower back pain?','Stretching and posture correction advised.','2024-05-12 10:00:00'),
('DOC1013','900000000012','How to manage asthma symptoms?','Use inhaler and avoid triggers.','2024-05-13 10:00:00'),
('DOC1014','900000000013','How to avoid urinary infections?','Maintain hygiene and adequate hydration.','2024-05-14 10:00:00'),
('DOC1015','900000000014','PCOS lifestyle management tips?','Balanced diet and hormonal monitoring needed.','2024-05-15 10:00:00'),
('DOC1016','900000000015','How to treat sinus issues?','Steam inhalation and medication help.','2024-05-16 10:00:00'),
('DOC1017','900000000016','Bronchitis recovery guidance?','Complete medication course and rest.','2024-05-17 10:00:00'),
('DOC1018','900000000017','How to reduce heart disease risk?','Regular exercise and heart checkups advised.','2024-05-18 10:00:00'),
('DOC1019','900000000018','Joint inflammation care tips?','Joint exercises and anti-inflammatory care.','2024-05-19 10:00:00'),
('DOC1020','900000000019','How to manage acid reflux?','Avoid late meals and acidic foods.','2024-05-20 10:00:00'),
('DOC1021','900000000020','Tips to reduce eye strain?','Follow 20-20-20 eye rule.','2024-05-21 10:00:00'),
('DOC1022','900000000021','How to maintain dental health?','Brush regularly and dental visits advised.','2024-05-22 10:00:00'),
('DOC1023','900000000022','How to reduce stress naturally?','Practice relaxation and mindfulness.','2024-05-23 10:00:00'),
('DOC1024','900000000023','Recovery time for minor fractures?','Rest and follow rehabilitation guidance.','2024-05-24 10:00:00'),
('DOC1025','900000000024','General health improvement tips?','Annual checkups and healthy habits advised.','2024-05-25 10:00:00');


INSERT INTO digital_twin_patient
(aadhaar_id, lifetime_summary, chronic_conditions, risk_assessment, ai_recommendations, last_updated) VALUES
('900000000000','Generally healthy with minor illnesses','None','Low','Maintain healthy lifestyle','2024-04-01 12:00:00'),
('900000000001','Seasonal infections reported','None','Low','Seasonal vaccination advised','2024-04-02 12:00:00'),
('900000000002','Type 2 diabetes under control','Diabetes','Medium','Monitor blood glucose regularly','2024-04-03 12:00:00'),
('900000000003','Thyroid disorder managed','Hypothyroidism','Medium','Regular thyroid tests required','2024-04-04 12:00:00'),
('900000000004','Chronic knee joint pain','Osteoarthritis','Medium','Physiotherapy recommended','2024-04-05 12:00:00'),
('900000000005','Skin allergy history','Allergy','Low','Avoid known allergens','2024-04-06 12:00:00'),
('900000000006','Recurrent migraines','Migraine','Medium','Stress management advised','2024-04-07 12:00:00'),
('900000000007','Hypertension monitored','Hypertension','High','Monitor blood pressure','2024-04-08 12:00:00'),
('900000000008','Digestive issues occasionally','Gastritis','Low','Dietary changes recommended','2024-04-09 12:00:00'),
('900000000009','History of anemia','Anemia','Medium','Iron rich diet advised','2024-04-10 12:00:00'),
('900000000010','Vitamin deficiency treated','Vitamin deficiency','Low','Continue vitamin supplements','2024-04-11 12:00:00'),
('900000000011','Lower back pain episodes','Back pain','Low','Posture correction exercises','2024-04-12 12:00:00'),
('900000000012','Mild asthma condition','Asthma','Medium','Carry inhaler regularly','2024-04-13 12:00:00'),
('900000000013','Urinary infections history','UTI','Medium','Maintain hygiene and hydration','2024-04-14 12:00:00'),
('900000000014','PCOS under treatment','PCOS','Medium','Hormonal follow up required','2024-04-15 12:00:00'),
('900000000015','Chronic sinus issues','Sinusitis','Low','Avoid cold exposure','2024-04-16 12:00:00'),
('900000000016','Bronchitis in past','Bronchitis','Medium','Respiratory exercises advised','2024-04-17 12:00:00'),
('900000000017','Cardiac risk monitored','Cardiac risk','High','Regular cardiac screening','2024-04-18 12:00:00'),
('900000000018','Joint inflammation','Arthritis','Medium','Joint strengthening exercises','2024-04-19 12:00:00'),
('900000000019','Acid reflux complaints','GERD','Low','Avoid spicy foods','2024-04-20 12:00:00'),
('900000000020','Eye strain symptoms','Eye strain','Low','Reduce screen exposure','2024-04-21 12:00:00'),
('900000000021','Dental issues treated','Dental issues','Low','Maintain oral hygiene','2024-04-22 12:00:00'),
('900000000022','Stress related issues','Stress disorder','Medium','Counseling recommended','2024-04-23 12:00:00'),
('900000000023','Minor fractures healed','None','Low','Bone health monitoring','2024-04-24 12:00:00'),
('900000000024','Overall healthy profile','None','Low','Annual health checkup','2024-04-25 12:00:00');

INSERT INTO doctor
(doctor_reg_id, first_name, last_name, speciality, phone, email, created_at, updated_at) VALUES
('DOC1001','Anil','Rao','General Medicine','9800000000','anil.rao@hospital.com','2024-01-01 10:00:00','2024-01-01 10:00:00'),

('DOC1002','Bhavesh','Shah','Cardiology','9800000001','bhavesh.shah@hospital.com','2024-01-02 10:00:00','2024-01-02 10:00:00'),

('DOC1003','Chetan','Kulkarni','Orthopedics','9800000002','chetan.kulkarni@hospital.com','2024-01-03 10:00:00','2024-01-03 10:00:00'),

('DOC1004','Deepa','Nair','Endocrinology','9800000003','deepa.nair@hospital.com','2024-01-04 10:00:00','2024-01-04 10:00:00'),

('DOC1005','Esha','Jain','Dermatology','9800000004','esha.jain@hospital.com','2024-01-05 10:00:00','2024-01-05 10:00:00'),

('DOC1006','Farhan','Khan','Neurology','9800000005','farhan.khan@hospital.com','2024-01-06 10:00:00','2024-01-06 10:00:00'),

('DOC1007','Gaurav','Patil','Pediatrics','9800000006','gaurav.patil@hospital.com','2024-01-07 10:00:00','2024-01-07 10:00:00'),

('DOC1008','Heena','Malhotra','Gynecology','9800000007','heena.malhotra@hospital.com','2024-01-08 10:00:00','2024-01-08 10:00:00'),

('DOC1009','Irfan','Sheikh','ENT','9800000008','irfan.sheikh@hospital.com','2024-01-09 10:00:00','2024-01-09 10:00:00'),

('DOC1010','Jyoti','Desai','Oncology','9800000009','jyoti.desai@hospital.com','2024-01-10 10:00:00','2024-01-10 10:00:00'),

('DOC1011','Kunal','Mehta','Pulmonology','9800000010','kunal.mehta@hospital.com','2024-01-11 10:00:00','2024-01-11 10:00:00'),

('DOC1012','Leena','Iyer','Nephrology','9800000011','leena.iyer@hospital.com','2024-01-12 10:00:00','2024-01-12 10:00:00'),

('DOC1013','Mohit','Verma','Gastroenterology','9800000012','mohit.verma@hospital.com','2024-01-13 10:00:00','2024-01-13 10:00:00'),

('DOC1014','Neeraj','Singh','Psychiatry','9800000013','neeraj.singh@hospital.com','2024-01-14 10:00:00','2024-01-14 10:00:00'),

('DOC1015','Ojas','Kulkarni','Urology','9800000014','ojas.kulkarni@hospital.com','2024-01-15 10:00:00','2024-01-15 10:00:00'),

('DOC1016','Pankaj','Joshi','Radiology','9800000015','pankaj.joshi@hospital.com','2024-01-16 10:00:00','2024-01-16 10:00:00'),

('DOC1017','Radhika','Nair','Anesthesiology','9800000016','radhika.nair@hospital.com','2024-01-17 10:00:00','2024-01-17 10:00:00'),

('DOC1018','Sameer','Bansal','Rheumatology','9800000017','sameer.bansal@hospital.com','2024-01-18 10:00:00','2024-01-18 10:00:00'),

('DOC1019','Tanmay','Chavan','Ophthalmology','9800000018','tanmay.chavan@hospital.com','2024-01-19 10:00:00','2024-01-19 10:00:00'),

('DOC1020','Uday','Gokhale','Dentistry','9800000019','uday.gokhale@hospital.com','2024-01-20 10:00:00','2024-01-20 10:00:00'),

('DOC1021','Varsha','Patil','Pathology','9800000020','varsha.patil@hospital.com','2024-01-21 10:00:00','2024-01-21 10:00:00'),

('DOC1022','Wasim','Qureshi','Emergency Medicine','9800000021','wasim.qureshi@hospital.com','2024-01-22 10:00:00','2024-01-22 10:00:00'),

('DOC1023','Yash','Agarwal','Sports Medicine','9800000022','yash.agarwal@hospital.com','2024-01-23 10:00:00','2024-01-23 10:00:00'),

('DOC1024','Zoya','Khan','Immunology','9800000023','zoya.khan@hospital.com','2024-01-24 10:00:00','2024-01-24 10:00:00'),

('DOC1025','Aarav','Mishra','Geriatrics','9800000024','aarav.mishra@hospital.com','2024-01-25 10:00:00','2024-01-25 10:00:00');

INSERT INTO doctor_hospital 
(doctor_reg_id, hospital_id, start_date, end_date) VALUES
('DOC1001','HOSP1001','2020-01-01','2021-12-31'),
('DOC1002','HOSP1002','2020-03-01','2022-03-01'),
('DOC1003','HOSP1003','2020-04-30','2022-04-30'),
('DOC1004','HOSP1004','2020-06-29','2022-06-29'),
('DOC1005','HOSP1005','2020-08-28','2022-08-28'),
('DOC1006','HOSP1006','2020-10-27','2022-10-27'),
('DOC1007','HOSP1007','2020-12-26','2022-12-26'),
('DOC1008','HOSP1008','2021-02-24','2023-02-24'),
('DOC1009','HOSP1009','2021-04-25','2023-04-25'),
('DOC1010','HOSP1010','2021-06-24','2023-06-24'),
('DOC1011','HOSP1011','2021-08-23','2023-08-23'),
('DOC1012','HOSP1012','2021-10-22','2023-10-22'),
('DOC1013','HOSP1013','2021-12-21','2023-12-21'),
('DOC1014','HOSP1014','2022-02-19','2024-02-19'),
('DOC1015','HOSP1015','2022-04-20','2024-04-19'),
('DOC1016','HOSP1016','2022-06-19','2024-06-18'),
('DOC1017','HOSP1017','2022-08-18','2024-08-17'),
('DOC1018','HOSP1018','2022-10-17','2024-10-16'),
('DOC1019','HOSP1019','2022-12-16','2024-12-15'),
('DOC1020','HOSP1020','2023-02-14','2025-02-13'),
('DOC1021','HOSP1021','2023-04-15','2025-04-14'),
('DOC1022','HOSP1022','2023-06-14','2025-06-13'),
('DOC1023','HOSP1023','2023-08-13','2025-08-12'),
('DOC1024','HOSP1024','2023-10-12','2025-10-11'),
('DOC1025','HOSP1025','2023-12-11','2025-12-10');

INSERT INTO hospital
(hospital_id, name, address, city, state, pincode, contact_number, created_at, updated_at) VALUES
('HOSP1001','Apollo Hospital Pune','Building 1, Main Road, Pune','Pune','Maharashtra','411000','9100000000','2024-01-01 09:00:00','2024-01-01 09:00:00'),
('HOSP1002','Fortis Hospital Mumbai','Building 2, Main Road, Mumbai','Mumbai','Maharashtra','411001','9100000001','2024-01-02 09:00:00','2024-01-02 09:00:00'),
('HOSP1003','Ruby Hall Clinic Pune','Building 3, Main Road, Pune','Pune','Maharashtra','411002','9100000002','2024-01-03 09:00:00','2024-01-03 09:00:00'),
('HOSP1004','Max Hospital Delhi','Building 4, Main Road, Delhi','Delhi','Delhi','411003','9100000003','2024-01-04 09:00:00','2024-01-04 09:00:00'),
('HOSP1005','AIIMS Delhi','Building 5, Main Road, Delhi','Delhi','Delhi','411004','9100000004','2024-01-05 09:00:00','2024-01-05 09:00:00'),
('HOSP1006','Manipal Hospital Bangalore','Building 6, Main Road, Bangalore','Bangalore','Karnataka','411005','9100000005','2024-01-06 09:00:00','2024-01-06 09:00:00'),
('HOSP1007','Kokilaben Hospital Mumbai','Building 7, Main Road, Mumbai','Mumbai','Maharashtra','411006','9100000006','2024-01-07 09:00:00','2024-01-07 09:00:00'),
('HOSP1008','Lilavati Hospital Mumbai','Building 8, Main Road, Mumbai','Mumbai','Maharashtra','411007','9100000007','2024-01-08 09:00:00','2024-01-08 09:00:00'),
('HOSP1009','Medanta Gurgaon','Building 9, Main Road, Gurgaon','Gurgaon','Haryana','411008','9100000008','2024-01-09 09:00:00','2024-01-09 09:00:00'),
('HOSP1010','Care Hospital Hyderabad','Building 10, Main Road, Hyderabad','Hyderabad','Telangana','411009','9100000009','2024-01-10 09:00:00','2024-01-10 09:00:00'),
('HOSP1011','Yashoda Hospital Hyderabad','Building 11, Main Road, Hyderabad','Hyderabad','Telangana','411010','9100000010','2024-01-11 09:00:00','2024-01-11 09:00:00'),
('HOSP1012','Narayana Health Bangalore','Building 12, Main Road, Bangalore','Bangalore','Karnataka','411011','9100000011','2024-01-12 09:00:00','2024-01-12 09:00:00'),
('HOSP1013','Jaslok Hospital Mumbai','Building 13, Main Road, Mumbai','Mumbai','Maharashtra','411012','9100000012','2024-01-13 09:00:00','2024-01-13 09:00:00'),
('HOSP1014','Breach Candy Hospital Mumbai','Building 14, Main Road, Mumbai','Mumbai','Maharashtra','411013','9100000013','2024-01-14 09:00:00','2024-01-14 09:00:00'),
('HOSP1015','Sahyadri Hospital Pune','Building 15, Main Road, Pune','Pune','Maharashtra','411014','9100000014','2024-01-15 09:00:00','2024-01-15 09:00:00'),
('HOSP1016','Columbia Asia Hospital Bangalore','Building 16, Main Road, Bangalore','Bangalore','Karnataka','411015','9100000015','2024-01-16 09:00:00','2024-01-16 09:00:00'),
('HOSP1017','Hinduja Hospital Mumbai','Building 17, Main Road, Mumbai','Mumbai','Maharashtra','411016','9100000016','2024-01-17 09:00:00','2024-01-17 09:00:00'),
('HOSP1018','SevenHills Hospital Mumbai','Building 18, Main Road, Mumbai','Mumbai','Maharashtra','411017','9100000017','2024-01-18 09:00:00','2024-01-18 09:00:00'),
('HOSP1019','Aster Hospital Kochi','Building 19, Main Road, Kochi','Kochi','Kerala','411018','9100000018','2024-01-19 09:00:00','2024-01-19 09:00:00'),
('HOSP1020','Sterling Hospital Ahmedabad','Building 20, Main Road, Ahmedabad','Ahmedabad','Gujarat','411019','9100000019','2024-01-20 09:00:00','2024-01-20 09:00:00'),
('HOSP1021','Cloudnine Hospital Bangalore','Building 21, Main Road, Bangalore','Bangalore','Karnataka','411020','9100000020','2024-01-21 09:00:00','2024-01-21 09:00:00'),
('HOSP1022','Wockhardt Hospital Mumbai','Building 22, Main Road, Mumbai','Mumbai','Maharashtra','411021','9100000021','2024-01-22 09:00:00','2024-01-22 09:00:00'),
('HOSP1023','Global Hospital Chennai','Building 23, Main Road, Chennai','Chennai','Tamil Nadu','411022','9100000022','2024-01-23 09:00:00','2024-01-23 09:00:00'),
('HOSP1024','KIMS Hospital Hyderabad','Building 24, Main Road, Hyderabad','Hyderabad','Telangana','411023','9100000023','2024-01-24 09:00:00','2024-01-24 09:00:00'),
('HOSP1025','SRCC Hospital Mumbai','Building 25, Main Road, Mumbai','Mumbai','Maharashtra','411024','9100000024','2024-01-25 09:00:00','2024-01-25 09:00:00');

INSERT INTO lab_result
(treatment_id, test_name, result_value, unit, reference_range, test_date) VALUES
(1,'Hemoglobin','10','g/dL','12-16','2024-01-01 11:00:00'),
(2,'Blood Sugar','11','mg/dL','70-140','2024-01-03 11:00:00'),
(3,'HbA1c','12','percent','4.0-6.0','2024-01-05 11:00:00'),
(4,'TSH','13','uIU/mL','0.5-4.5','2024-01-07 11:00:00'),
(5,'Vitamin D','14','ng/mL','30-100','2024-01-09 11:00:00'),
(6,'Cholesterol','15','mg/dL','<200','2024-01-11 11:00:00'),
(7,'Lipid Profile','16','mg/dL','<200','2024-01-13 11:00:00'),
(8,'CBC','17','cells/mm3','Normal','2024-01-15 11:00:00'),
(9,'ESR','18','mm/hr','0-20','2024-01-17 11:00:00'),
(10,'CRP','19','mg/L','<10','2024-01-19 11:00:00'),
(11,'Liver Function Test','20','U/L','10-40','2024-01-21 11:00:00'),
(12,'Kidney Function Test','21','mg/dL','0.6-1.3','2024-01-23 11:00:00'),
(13,'Uric Acid','22','mg/dL','3.5-7.2','2024-01-25 11:00:00'),
(14,'Calcium','23','mg/dL','8.5-10.5','2024-01-27 11:00:00'),
(15,'Electrolytes','24','mmol/L','135-145','2024-01-29 11:00:00'),
(16,'Iron Studies','25','ug/dL','60-170','2024-01-31 11:00:00'),
(17,'Platelet Count','26','lakhs/mm3','1.5-4.5','2024-02-02 11:00:00'),
(18,'ECG','27','NA','Normal','2024-02-04 11:00:00'),
(19,'Chest X-Ray','28','NA','Normal','2024-02-06 11:00:00'),
(20,'Urine Routine','29','NA','Normal','2024-02-08 11:00:00'),
(21,'Creatinine','30','mg/dL','0.6-1.3','2024-02-10 11:00:00'),
(22,'Bilirubin','31','mg/dL','0.3-1.2','2024-02-12 11:00:00'),
(23,'Protein Total','32','g/dL','6.0-8.3','2024-02-14 11:00:00'),
(24,'Sodium','33','mmol/L','135-145','2024-02-16 11:00:00'),
(25,'Potassium','34','mmol/L','3.5-5.0','2024-02-18 11:00:00');

INSERT INTO patient
(aadhaar_id, first_name, last_name, dob, gender, phone, email) VALUES
('900000000000','Ananya','Gupta','1975-01-15','Female','9800000000','ananya.gupta@gmail.com'),
('900000000001','Rahul','Mehta','1976-01-15','Male','9800000001','rahul.mehta@gmail.com'),
('900000000002','Sneha','Patil','1977-01-15','Female','9800000002','sneha.patil@gmail.com'),
('900000000003','Amit','Sharma','1978-01-15','Male','9800000003','amit.sharma@gmail.com'),
('900000000004','Neha','Joshi','1979-01-15','Female','9800000004','neha.joshi@gmail.com'),
('900000000005','Rohit','Kulkarni','1980-01-15','Male','9800000005','rohit.kulkarni@gmail.com'),
('900000000006','Pooja','Deshmukh','1981-01-15','Female','9800000006','pooja.deshmukh@gmail.com'),
('900000000007','Karan','Verma','1982-01-15','Male','9800000007','karan.verma@gmail.com'),
('900000000008','Isha','Nair','1983-01-15','Female','9800000008','isha.nair@gmail.com'),
('900000000009','Arjun','Singh','1984-01-15','Male','9800000009','arjun.singh@gmail.com'),
('900000000010','Mehul','Bansal','1985-01-15','Female','9800000010','mehul.bansal@gmail.com'),
('900000000011','Riya','Malhotra','1986-01-15','Male','9800000011','riya.malhotra@gmail.com'),
('900000000012','Saurabh','Kale','1987-01-15','Female','9800000012','saurabh.kale@gmail.com'),
('900000000013','Tanvi','Chavan','1988-01-15','Male','9800000013','tanvi.chavan@gmail.com'),
('900000000014','Nikhil','Rane','1989-01-15','Female','9800000014','nikhil.rane@gmail.com'),
('900000000015','Priya','Iyer','1990-01-15','Male','9800000015','priya.iyer@gmail.com'),
('900000000016','Akash','Khanna','1991-01-15','Female','9800000016','akash.khanna@gmail.com'),
('900000000017','Shreya','Pillai','1992-01-15','Male','9800000017','shreya.pillai@gmail.com'),
('900000000018','Vikram','Jadhav','1993-01-15','Female','9800000018','vikram.jadhav@gmail.com'),
('900000000019','Kavya','Gokhale','1994-01-15','Male','9800000019','kavya.gokhale@gmail.com'),
('900000000020','Aditya','Agarwal','1995-01-15','Female','9800000020','aditya.agarwal@gmail.com'),
('900000000021','Palak','Kapoor','1996-01-15','Male','9800000021','palak.kapoor@gmail.com'),
('900000000022','Siddharth','Shetty','1997-01-15','Female','9800000022','siddharth.shetty@gmail.com'),
('900000000023','Ayesha','Qureshi','1998-01-15','Male','9800000023','ayesha.qureshi@gmail.com'),
('900000000024','Manish','Tiwari','1999-01-15','Female','9800000024','manish.tiwari@gmail.com');

INSERT INTO patient_hospital_visit
(aadhaar_id, hospital_id, visit_date, reason_for_visit) VALUES
('900000000000','HOSP1001','2024-01-01 09:30:00','General health checkup'),
('900000000001','HOSP1002','2024-01-04 09:30:00','Fever and cold symptoms'),
('900000000002','HOSP1003','2024-01-07 09:30:00','Routine blood tests'),
('900000000003','HOSP1004','2024-01-10 09:30:00','Follow-up consultation'),
('900000000004','HOSP1005','2024-01-13 09:30:00','Chest pain evaluation'),
('900000000005','HOSP1006','2024-01-16 09:30:00','Diabetes monitoring'),
('900000000006','HOSP1007','2024-01-19 09:30:00','Thyroid checkup'),
('900000000007','HOSP1008','2024-01-22 09:30:00','Joint pain complaint'),
('900000000008','HOSP1009','2024-01-25 09:30:00','Skin allergy consultation'),
('900000000009','HOSP1010','2024-01-28 09:30:00','Headache evaluation'),
('900000000010','HOSP1011','2024-01-31 09:30:00','Annual physical examination'),
('900000000011','HOSP1012','2024-02-03 09:30:00','Blood pressure check'),
('900000000012','HOSP1013','2024-02-06 09:30:00','Respiratory infection'),
('900000000013','HOSP1014','2024-02-09 09:30:00','Stomach pain'),
('900000000014','HOSP1015','2024-02-12 09:30:00','Eye examination'),
('900000000015','HOSP1016','2024-02-15 09:30:00','ENT consultation'),
('900000000016','HOSP1017','2024-02-18 09:30:00','Back pain assessment'),
('900000000017','HOSP1018','2024-02-21 09:30:00','Cardiac screening'),
('900000000018','HOSP1019','2024-02-24 09:30:00','Pediatric consultation'),
('900000000019','HOSP1020','2024-02-27 09:30:00','Gynecology visit'),
('900000000020','HOSP1021','2024-03-01 09:30:00','Orthopedic follow-up'),
('900000000021','HOSP1022','2024-03-04 09:30:00','Neurology consultation'),
('900000000022','HOSP1023','2024-03-07 09:30:00','Dental pain'),
('900000000023','HOSP1024','2024-03-10 09:30:00','Health insurance check'),
('900000000024','HOSP1025','2024-03-13 09:30:00','Post-treatment follow-up');

INSERT INTO treatment_record_no_id
(visit_id, doctor_reg_id, diagnosis, treatment_summary, medications, procedures, treatment_date) VALUES
(1,'DOC1001','Viral fever','Symptomatic treatment and rest','Paracetamol','Clinical examination','2024-01-01 10:00:00'),
(2,'DOC1002','Upper respiratory infection','Antibiotics and hydration','Azithromycin','Chest auscultation','2024-01-04 10:00:00'),
(3,'DOC1003','Type 2 diabetes','Insulin and diet control','Insulin','Blood glucose test','2024-01-07 10:00:00'),
(4,'DOC1004','Hypothyroidism','Thyroxine medication started','Levothyroxine','TSH blood test','2024-01-10 10:00:00'),
(5,'DOC1005','Knee osteoarthritis','Physiotherapy and pain management','Ibuprofen','Knee X-ray','2024-01-13 10:00:00'),
(6,'DOC1006','Skin allergy','Antihistamines prescribed','Cetirizine','Skin patch test','2024-01-16 10:00:00'),
(7,'DOC1007','Migraine','Pain relief and lifestyle advice','Sumatriptan','Neurological exam','2024-01-19 10:00:00'),
(8,'DOC1008','Hypertension','Blood pressure monitoring','Amlodipine','BP monitoring','2024-01-22 10:00:00'),
(9,'DOC1009','Gastritis','Antacids and diet modification','Omeprazole','Abdominal exam','2024-01-25 10:00:00'),
(10,'DOC1010','Anemia','Iron supplementation','Iron tablets','CBC test','2024-01-28 10:00:00'),
(11,'DOC1011','Vitamin D deficiency','Vitamin D supplements','Vitamin D3','Vitamin D test','2024-01-31 10:00:00'),
(12,'DOC1012','Lower back pain','Physiotherapy exercises','Muscle relaxant','Lumbar spine exam','2024-02-03 10:00:00'),
(13,'DOC1013','Asthma','Inhaler prescribed','Salbutamol','Pulmonary function test','2024-02-06 10:00:00'),
(14,'DOC1014','Urinary tract infection','Antibiotics course','Nitrofurantoin','Urine analysis','2024-02-09 10:00:00'),
(15,'DOC1015','PCOS','Hormonal therapy advised','Metformin','Pelvic ultrasound','2024-02-12 10:00:00'),
(16,'DOC1016','Sinusitis','Decongestants prescribed','Xylometazoline','Nasal endoscopy','2024-02-15 10:00:00'),
(17,'DOC1017','Bronchitis','Bronchodilators given','Salbutamol syrup','Chest X-ray','2024-02-18 10:00:00'),
(18,'DOC1018','Cardiac risk assessment','ECG and monitoring','Aspirin','ECG','2024-02-21 10:00:00'),
(19,'DOC1019','Joint inflammation','Anti-inflammatory drugs','Diclofenac','Joint mobility test','2024-02-24 10:00:00'),
(20,'DOC1020','Acid reflux','Proton pump inhibitors','Pantoprazole','Upper GI exam','2024-02-27 10:00:00'),
(21,'DOC1021','Eye strain','Eye drops prescribed','Lubricating eye drops','Vision test','2024-03-01 10:00:00'),
(22,'DOC1022','Dental infection','Dental antibiotics','Amoxicillin','Dental X-ray','2024-03-04 10:00:00'),
(23,'DOC1023','Stress related disorder','Counseling advised','No medication','Psychological assessment','2024-03-07 10:00:00'),
(24,'DOC1024','Minor fracture','Immobilization and rest','Calcium tablets','X-ray imaging','2024-03-10 10:00:00'),
(25,'DOC1025','Routine health review','No treatment required','Multivitamins','General physical exam','2024-03-13 10:00:00');