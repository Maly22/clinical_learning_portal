-- PhasePrep development content derived from the current Eglin Phase II portal.
-- Safe to rerun after migrations. No auth users, schedules, private notes, or real evaluations.

begin;

-- Make the baseline migration inserts rerunnable and populate all five 4N0 programs.
insert into public.location_programs (location_id, afsc_program_id, required_hours)
select l.id, a.id, 240
from public.locations l cross join public.afsc_programs a
where a.code = '4N0'
on conflict (location_id, afsc_program_id) do update set required_hours = excluded.required_hours;

insert into public.departments (id, category_id, name, slug, description) values
('10000000-0000-0000-0000-000000000001', (select id from public.department_categories where slug='outpatient-services'), 'Internal Medicine Clinic', 'internal-medicine-clinic', 'Adult disease prevention, diagnosis, treatment, and readiness-focused clinical care.'),
('10000000-0000-0000-0000-000000000002', (select id from public.department_categories where slug='outpatient-services'), 'Neurology Clinic', 'neurology-clinic', 'Neurologic assessment, diagnostic support, and outpatient specialty care.'),
('10000000-0000-0000-0000-000000000003', (select id from public.department_categories where slug='outpatient-services'), 'Orthopedic Clinic', 'orthopedic-clinic', 'Musculoskeletal assessment, treatment support, and procedure preparation.'),
('10000000-0000-0000-0000-000000000004', (select id from public.department_categories where slug='outpatient-services'), 'Dermatology Clinic', 'dermatology-clinic', 'Outpatient skin assessment, minor procedures, and patient education.'),
('10000000-0000-0000-0000-000000000005', (select id from public.department_categories where slug='outpatient-services'), 'General Surgery Clinic', 'general-surgery-clinic', 'Preoperative and postoperative care in the ambulatory setting.'),
('10000000-0000-0000-0000-000000000006', (select id from public.department_categories where slug='outpatient-services'), 'Immunization Clinic', 'immunization-clinic', 'Vaccine preparation, administration support, documentation, and education.'),
('10000000-0000-0000-0000-000000000007', (select id from public.department_categories where slug='outpatient-services'), 'Cardiology Clinic', 'cardiology-clinic', 'Cardiovascular assessment, diagnostics, monitoring, and education.'),
('10000000-0000-0000-0000-000000000008', (select id from public.department_categories where slug='outpatient-services'), 'Flight and Operational Medicine', 'flight-and-operational-medicine', 'Operational readiness, occupational medicine, and flight-focused clinical support.'),
('10000000-0000-0000-0000-000000000009', (select id from public.department_categories where slug='outpatient-services'), 'OB/GYN Clinic', 'ob-gyn-clinic', 'Outpatient reproductive health, preventive care, and procedure support.'),
('10000000-0000-0000-0000-000000000010', (select id from public.department_categories where slug='outpatient-services'), 'Pediatric Clinic', 'pediatric-clinic', 'Outpatient care for infants, children, and adolescents.'),
('10000000-0000-0000-0000-000000000011', (select id from public.department_categories where slug='outpatient-services'), 'Family Medicine Residency Clinic', 'family-medicine-residency-clinic', 'Continuity care across the lifespan in a teaching clinic.'),
('10000000-0000-0000-0000-000000000012', (select id from public.department_categories where slug='outpatient-services'), 'Family Health Clinic', 'family-health-clinic', 'Primary and preventive care for patients across the lifespan.'),
('10000000-0000-0000-0000-000000000013', (select id from public.department_categories where slug='outpatient-services'), 'Warrior Operational Medicine Clinic', 'warrior-operational-medicine-clinic', 'Readiness-centered primary and occupational care.'),
('10000000-0000-0000-0000-000000000014', (select id from public.department_categories where slug='inpatient-services'), 'Labor & Delivery', 'labor-delivery', 'Maternal, fetal, delivery, and immediate postpartum care.'),
('10000000-0000-0000-0000-000000000015', (select id from public.department_categories where slug='inpatient-services'), 'Multi Service Unit', 'multi-service-unit', 'Medical-surgical inpatient care, monitoring, treatment, and recovery support.'),
('10000000-0000-0000-0000-000000000016', (select id from public.department_categories where slug='inpatient-services'), 'Intensive Care Unit', 'intensive-care-unit', 'Continuous monitoring and advanced multidisciplinary care for critically ill patients.'),
('10000000-0000-0000-0000-000000000017', (select id from public.department_categories where slug='inpatient-services'), 'Operating Room', 'operating-room', 'Perioperative safety, sterile technique, and surgical team workflows.'),
('10000000-0000-0000-0000-000000000018', (select id from public.department_categories where slug='inpatient-services'), 'Ambulatory Surgical Unit', 'ambulatory-surgical-unit', 'Same-day surgical preparation, recovery, and discharge support.'),
('10000000-0000-0000-0000-000000000019', (select id from public.department_categories where slug='emergency-services'), 'Emergency Room', 'emergency-room', 'Rapid assessment, stabilization, emergency procedures, and team-based care.')
on conflict (slug) do update set name=excluded.name, category_id=excluded.category_id, description=excluded.description;

-- Eglin is the first fully populated location. Other sites remain configurable records.
insert into public.location_departments (location_program_id, department_id, display_name, required_hours, overview, is_active)
select lp.id, d.id, d.name,
  case when d.slug='emergency-room' then 48 when d.slug in ('multi-service-unit','intensive-care-unit','labor-delivery') then 32 else 0 end,
  case d.slug
    when 'internal-medicine-clinic' then 'Internal Medicine focuses on prevention, diagnosis, and treatment of adult diseases. Students observe patient intake, blood glucose testing, blood-pressure checks, injections, IV starts, telephone consult support, and readiness-focused treatment-room workflows.'
    when 'intensive-care-unit' then 'The ICU operates continuously with advanced monitoring and life-support capability. Students learn situational awareness around airway management, arterial and central lines, hemodynamic monitoring, medication infusions, telemetry, emergency response, and multidisciplinary critical care.'
    when 'labor-delivery' then 'Labor and Delivery provides care through labor, childbirth, and the immediate postpartum period. Students observe triage, fetal monitoring, maternal assessment, delivery support, newborn assessment, postpartum care, and coordinated response to obstetric emergencies.'
    when 'multi-service-unit' then 'The Multi Service Unit provides inpatient care for postoperative recovery, acute medical conditions, and chronic disease exacerbations. Students observe assessments, charting, supervised medication workflows, IV therapy, wound care, mobility support, and interdisciplinary communication.'
    when 'emergency-room' then 'Emergency Services provides rapid assessment and stabilization for patients with urgent and emergent needs. Students prepare for fast-changing workflows, prioritization, monitoring, procedures, documentation, and closed-loop team communication.'
    else d.description
  end,
  true
from public.location_programs lp
join public.locations l on l.id=lp.location_id and l.installation_code='EGLIN'
join public.afsc_programs a on a.id=lp.afsc_program_id and a.code='4N0'
cross join public.departments d
on conflict (location_program_id, department_id) do update
set display_name=excluded.display_name, required_hours=excluded.required_hours, overview=excluded.overview, is_active=true;

insert into public.department_procedures
(id, location_department_id, name, slug, what_it_is, why_it_is_used, how_it_works, student_learning_objectives, equipment, external_resource_url, sort_order, status, reviewed_at)
values
('20000000-0000-0000-0000-000000000001', (select ld.id from public.location_departments ld join public.departments d on d.id=ld.department_id join public.location_programs lp on lp.id=ld.location_program_id join public.locations l on l.id=lp.location_id where l.installation_code='EGLIN' and d.slug='internal-medicine-clinic'), 'Peripheral IV Insertion', 'peripheral-iv-insertion', 'Placement of a small catheter into a peripheral vein.', 'Provides direct bloodstream access for fluids, medications, contrast, and stabilization.', 'A suitable vein is identified, the area is cleansed, the catheter is advanced, secured, flushed, and monitored for patency and complications.', 'Observe vein selection, aseptic technique, patient communication, safety checks, documentation, and recognition of infiltration or phlebitis.', 'Gloves, tourniquet, antiseptic, IV catheter, saline flush, extension tubing, transparent dressing, tape, and sharps container.', 'https://youtu.be/W4_9louZ4OU', 1, 'published', now()),
('20000000-0000-0000-0000-000000000002', (select ld.id from public.location_departments ld join public.departments d on d.id=ld.department_id join public.location_programs lp on lp.id=ld.location_program_id join public.locations l on l.id=lp.location_id where l.installation_code='EGLIN' and d.slug='intensive-care-unit'), 'Central Venous Catheter Insertion', 'central-venous-catheter-insertion', 'Placement of a large IV catheter into a central vein.', 'Supports multiple infusions, vasopressors, parenteral nutrition, and central venous monitoring.', 'Under sterile conditions and commonly ultrasound guidance, a guidewire and dilator are used to place and secure the catheter.', 'Recognize sterile technique, ultrasound-guided access, central-line handling, and infection-prevention practices.', 'CVC kit, sterile barriers, ultrasound and probe cover, chlorhexidine, flushes, sutures, and sterile dressing.', 'https://www.ncbi.nlm.nih.gov/books/NBK499895/', 1, 'published', now()),
('20000000-0000-0000-0000-000000000003', (select ld.id from public.location_departments ld join public.departments d on d.id=ld.department_id join public.location_programs lp on lp.id=ld.location_program_id join public.locations l on l.id=lp.location_id where l.installation_code='EGLIN' and d.slug='labor-delivery'), 'Epidural Analgesia', 'epidural-analgesia', 'Administration of local anesthetic into the epidural space for labor analgesia.', 'Provides significant pain relief during labor while the patient remains awake and responsive.', 'The patient is positioned, the lower back is prepared using sterile technique, a catheter is placed, and medication is infused with continued maternal and fetal monitoring.', 'Observe patient positioning, sterile-field maintenance, maternal blood-pressure monitoring, fetal monitoring, and pain assessment.', 'Epidural kit, sterile preparation and drapes, local anesthetic, infusion pump, fetal monitor, and blood-pressure cuff.', 'https://youtu.be/2tw-SXI3wKU', 1, 'published', now()),
('20000000-0000-0000-0000-000000000004', (select ld.id from public.location_departments ld join public.departments d on d.id=ld.department_id join public.location_programs lp on lp.id=ld.location_program_id join public.locations l on l.id=lp.location_id where l.installation_code='EGLIN' and d.slug='multi-service-unit'), 'Wound Care Dressing Change', 'wound-care-dressing-change', 'Cleaning, assessment, and redressing of a wound or surgical incision.', 'Promotes healing, reduces infection risk, and supports early recognition of complications.', 'The old dressing is removed, the wound is assessed and cleansed, prescribed treatment is applied, and a new sterile dressing is secured.', 'Practice preparation, sterile technique, wound assessment, disposal, documentation, and identification of infection or delayed healing.', 'Gloves, sterile dressing kit, cleansing solution, gauze, tape, wound measurement supplies, ordered treatments, and biohazard disposal.', 'https://youtu.be/5Cid7q9_Uq0', 1, 'published', now())
on conflict (id) do update set name=excluded.name, what_it_is=excluded.what_it_is, why_it_is_used=excluded.why_it_is_used, how_it_works=excluded.how_it_works, student_learning_objectives=excluded.student_learning_objectives, equipment=excluded.equipment, external_resource_url=excluded.external_resource_url, status='published', reviewed_at=now();

insert into public.learning_resources (id,title,description,resource_url,resource_type,is_free,reviewed_at,is_active) values
('30000000-0000-0000-0000-000000000001','UpToDate','Clinical decision support and evidence summaries.','https://www.uptodate.com','clinical-reference',false,now(),true),
('30000000-0000-0000-0000-000000000002','Medscape','Medical reference, drug information, and professional education.','https://www.medscape.com','clinical-reference',true,now(),true),
('30000000-0000-0000-0000-000000000003','MSD Manual','Medical reference for conditions, symptoms, and clinical topics.','https://www.msdmanuals.com','clinical-reference',true,now(),true),
('30000000-0000-0000-0000-000000000004','Prognosis: Your Diagnosis','Case-based diagnostic reasoning practice.','https://clinicalodyssey.com/game/prognosis-your-diagnosis','clinical-reference',true,now(),true),
('30000000-0000-0000-0000-000000000005','NurseLabs','Nursing study guides, care plans, and reference material.','https://nurseslabs.com','clinical-reference',true,now(),true),
('30000000-0000-0000-0000-000000000006','Open RN Project','Open nursing textbooks and learning resources.','https://openrn.org','clinical-reference',true,now(),true),
('30000000-0000-0000-0000-000000000007','Complete Anatomy','Interactive 3D anatomy learning.','https://3d4medical.com','anatomy-procedures',false,now(),true),
('30000000-0000-0000-0000-000000000008','Touch Surgery','Interactive procedure and surgical simulation learning.','https://www.touchsurgery.com','anatomy-procedures',true,now(),true),
('30000000-0000-0000-0000-000000000009','Nerve Whiz','Neurologic localization reference.','https://apps.apple.com/us/app/nerve-whiz/id380714187','anatomy-procedures',true,now(),true),
('30000000-0000-0000-0000-000000000010','RegisteredNurseRN','Free nursing lessons and clinical demonstrations.','https://www.registerednursern.com','anatomy-procedures',true,now(),true),
('30000000-0000-0000-0000-000000000011','Osmosis','Medical education videos and study support.','https://www.osmosis.org','anatomy-procedures',true,now(),true),
('30000000-0000-0000-0000-000000000012','Khan Academy Health & Medicine','Free foundational health and medicine lessons.','https://www.khanacademy.org/science/health-and-medicine','anatomy-procedures',true,now(),true),
('30000000-0000-0000-0000-000000000013','Anki','Spaced-repetition flashcards for durable learning.','https://apps.ankiweb.net','study-flashcards',true,now(),true),
('30000000-0000-0000-0000-000000000014','MedNotes','Organized medical notes and study support.','https://mednotes.app','study-flashcards',true,now(),true)
on conflict (id) do update set title=excluded.title, description=excluded.description, resource_url=excluded.resource_url, resource_type=excluded.resource_type, is_free=excluded.is_free, reviewed_at=now(), is_active=true;

insert into public.checklist_items (id,afsc_program_id,title,description,resource_id,requirement_type,sort_order)
select ('40000000-0000-0000-0000-' || lpad(row_number() over(order by r.title)::text,12,'0'))::uuid,
       (select id from public.afsc_programs where code='4N0'),
       'Explore ' || r.title,
       r.description,
       r.id,
       'recommended',
       row_number() over(order by r.resource_type,r.title)
from public.learning_resources r
where r.id::text like '30000000-%'
on conflict (id) do update set title=excluded.title, description=excluded.description, resource_id=excluded.resource_id, requirement_type=excluded.requirement_type, sort_order=excluded.sort_order;

insert into public.handbooks (id,afsc_program_id,location_id,title,slug,version_label,effective_from,status) values
('50000000-0000-0000-0000-000000000001',(select id from public.afsc_programs where code='4N0'),(select id from public.locations where installation_code='EGLIN'),'AMSA Phase II Student Handbook','amsa-phase-ii-student-handbook','Current Webflow Edition',current_date,'published')
on conflict (id) do update set status='published';

insert into public.handbook_sections (id,handbook_id,heading,body,sort_order) values
('51000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Introduction','Program overview, student responsibilities, and the purpose of Phase II clinical training.',1),
('51000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','Pre- and Post-Conferences','Guidance for preparing for and reflecting on supervised clinical learning.',2),
('51000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001','General Student Information and Guidance','Standards covering conduct, attendance, mandatory items, devices, computer use, and class leadership.',3),
('51000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','Customs and Courtesies','General military customs, courtesy, flag honors, and Air Force Core Values.',4)
on conflict (id) do update set heading=excluded.heading, body=excluded.body, sort_order=excluded.sort_order;

insert into public.event_sources (id,location_id,name,description,source_type,source_url,audience,is_active) values
('60000000-0000-0000-0000-000000000001',null,'Mayo Clinic CME','Medical continuing education and webinars.','external_link','https://ce.mayo.edu','all',true),
('60000000-0000-0000-0000-000000000002',null,'NEJM Resident 360','Case discussions and learning resources.','external_link','https://resident360.nejm.org','all',true),
('60000000-0000-0000-0000-000000000003',null,'Radiopaedia Courses','Radiology cases, quizzes, and courses.','external_link','https://radiopaedia.org/courses','all',true),
('60000000-0000-0000-0000-000000000004',null,'Medscape Live Events','Specialty updates and live medical events.','external_link','https://www.medscapelive.com/','all',true),
('60000000-0000-0000-0000-000000000005',null,'Military OneSource Webinars','Leadership, readiness, stress management, and wellness webinars.','external_link','https://www.militaryonesource.mil/webinars','all',true),
('60000000-0000-0000-0000-000000000006',null,'Emergency Medicine Cases','Emergency medicine cases, podcasts, and learning sessions.','external_link','https://emergencymedicinecases.com','all',true),
('60000000-0000-0000-0000-000000000007',(select id from public.locations where installation_code='EGLIN'),'Eglin FSS Events','Official Eglin Force Support Squadron events.','external_link','https://myairforcelife.com/Eglin','eglin',true),
('60000000-0000-0000-0000-000000000008',(select id from public.locations where installation_code='EGLIN'),'Eglin Library Events','Official Eglin library programs and events.','external_link','https://eglin96fss.com/library/','eglin',true),
('60000000-0000-0000-0000-000000000009',(select id from public.locations where installation_code='EGLIN'),'Eglin Fitness Events','Official fitness center schedules and events.','external_link','https://myairforcelife.com/Eglin/Fitness','eglin',true),
('60000000-0000-0000-0000-000000000010',(select id from public.locations where installation_code='EGLIN'),'Eglin Outdoor Recreation','Official outdoor recreation activities and resources.','external_link','https://myairforcelife.com/Eglin/Outdoor-Rec','eglin',true)
on conflict (id) do update set name=excluded.name,description=excluded.description,source_url=excluded.source_url,is_active=true;

-- Generic local contact fixture. Real personnel contact data belongs in controlled production administration.
insert into public.location_contacts (id,location_id,display_name,title,email,phone,is_primary,is_active) values
('70000000-0000-0000-0000-000000000001',(select id from public.locations where installation_code='EGLIN'),'Phase II Clinical Supervisors','Program Support',null,null,true,true)
on conflict (id) do update set display_name=excluded.display_name,title=excluded.title,is_primary=true,is_active=true;

commit;
