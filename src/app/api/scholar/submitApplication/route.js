import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../_utils/session';
import { query } from '../../_utils/db';
import { uploadFileToDrive, getOrCreateSubfolder } from '../../_utils/auth';

const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID || '1X3XPOwWTEuZdOHW6CJLfUpZG1FI15CEb';

export async function POST(req) {
  try {
    // 1. Session verification
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'scholar') {
      return NextResponse.json({ error: 'AUTH_EXPIRED: Only logged-in scholars can submit applications.' }, { status: 401 });
    }

    // Automatically migrate column lengths in Supabase if not already done
    try {
      await query(`
        ALTER TABLE scholar_applications ALTER COLUMN letter_to_mayor_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN valid_id_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN enrollment_cert_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN grade_transcript_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN barangay_clearance_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN special_id_file_id TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN parent_guardian_name TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN source_of_income TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN school_enrolled TYPE VARCHAR(255);
        ALTER TABLE scholar_applications ALTER COLUMN course_program TYPE VARCHAR(255);
        ALTER TABLE documents ALTER COLUMN file_id TYPE VARCHAR(255);
      `);
    } catch (migErr) {
      console.warn('Database schema migration warning:', migErr.message);
    }

    const body = await req.json();
    const {
      semesterSy,
      // Personal
      lastName,
      firstName,
      middleName,
      suffix,
      dateOfBirth,
      sex,
      civilStatus,
      contactNumber,
      address,
      barangay,
      email,
      // Education
      schoolEnrolled,
      courseProgram,
      yearLevel,
      studentIdNo,
      gwa,
      gwaScale,
      q1Grade,
      q2Grade,
      q3Grade,
      q4Grade,
      // Family
      parentGuardianName,
      relationship,
      parentContact,
      monthlyIncome,
      numDependents,
      sourceOfIncome,
      // Special Circumstances
      isSoloParentBeneficiary,
      isOrphan,
      isPwd,
      isIp,
      isOutOfSchoolYouth,
      isMarginalized,
      specialCircumstancesSpecify,
      // Leadership
      leadershipActivities,
      // Files (Objects: { fileData, fileName, mimeType })
      letterToMayorFile,
      validIdFile,
      enrollmentCertFile,
      gradeTranscriptFile,
      barangayClearanceFile,
      specialIdFile
    } = body;

    // Check required fields
    if (!semesterSy || !lastName || !firstName || !dateOfBirth || !sex || !civilStatus || !contactNumber || !address || !barangay || !email || !schoolEnrolled || !courseProgram || !yearLevel || !gwa || !parentGuardianName || !relationship || !parentContact || !monthlyIncome || !numDependents || !sourceOfIncome) {
      return NextResponse.json({ error: 'Missing required application fields.' }, { status: 400 });
    }

    // 2. Fetch existing application to preserve old file references if not re-uploaded
    const checkRes = await query('SELECT * FROM scholar_applications WHERE username = $1', [session.username]);
    const existing = checkRes.rows[0] || {};

    // 3. Resolve student Google Drive folder
    const appFolderId = await getOrCreateSubfolder('[SCHOLAR_APPLICATIONS]', ROOT_FOLDER_ID);
    const folderName = `${lastName.trim()}_${firstName.trim()}_${session.username}`;
    const studentFolderId = await getOrCreateSubfolder(folderName, appFolderId);

    // Upload Helper
    const handleDriveUpload = async (fileObj, keyPrefix) => {
      if (fileObj && fileObj.fileData && fileObj.fileName) {
        const res = await uploadFileToDrive({
          base64Data: fileObj.fileData,
          fileName: `${keyPrefix}_${fileObj.fileName}`,
          mimeType: fileObj.mimeType || 'application/pdf',
          folderId: studentFolderId
        });
        return res;
      }
      return {
        fileId: existing[`${keyPrefix}_file_id`] || null,
        url: existing[`${keyPrefix}_url`] || null
      };
    };

    // Upload files concurrently
    const [
      letterToMayorUpload,
      validIdUpload,
      enrollmentCertUpload,
      gradeTranscriptUpload,
      barangayClearanceUpload,
      specialIdUpload
    ] = await Promise.all([
      handleDriveUpload(letterToMayorFile, 'letter_to_mayor'),
      handleDriveUpload(validIdFile, 'valid_id'),
      handleDriveUpload(enrollmentCertFile, 'enrollment_cert'),
      handleDriveUpload(gradeTranscriptFile, 'grade_transcript'),
      handleDriveUpload(barangayClearanceFile, 'barangay_clearance'),
      handleDriveUpload(specialIdFile, 'special_id')
    ]);

    // 4. Save to Database
    await query(
      `INSERT INTO scholar_applications (
        username, semester_sy, last_name, first_name, middle_name, suffix, date_of_birth, sex, civil_status, contact_number, address, barangay, email,
        school_enrolled, course_program, year_level, student_id_no, gwa, gwa_scale, q1_grade, q2_grade, q3_grade, q4_grade,
        parent_guardian_name, relationship, parent_contact, monthly_income, num_dependents, source_of_income,
        is_solo_parent_beneficiary, is_orphan, is_pwd, is_ip, is_out_of_school_youth, is_marginalized, special_circumstances_specify,
        leadership_activities,
        letter_to_mayor_file_id, letter_to_mayor_url,
        valid_id_file_id, valid_id_url,
        enrollment_cert_file_id, enrollment_cert_url,
        grade_transcript_file_id, grade_transcript_url,
        barangay_clearance_file_id, barangay_clearance_url,
        special_id_file_id, special_id_url,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36,
        $37,
        $38, $39,
        $40, $41,
        $42, $43,
        $44, $45,
        $46, $47,
        $48, $49,
        'Pending'
      )
      ON CONFLICT (username) DO UPDATE SET
        semester_sy = EXCLUDED.semester_sy,
        last_name = EXCLUDED.last_name,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        suffix = EXCLUDED.suffix,
        date_of_birth = EXCLUDED.date_of_birth,
        sex = EXCLUDED.sex,
        civil_status = EXCLUDED.civil_status,
        contact_number = EXCLUDED.contact_number,
        address = EXCLUDED.address,
        barangay = EXCLUDED.barangay,
        email = EXCLUDED.email,
        school_enrolled = EXCLUDED.school_enrolled,
        course_program = EXCLUDED.course_program,
        year_level = EXCLUDED.year_level,
        student_id_no = EXCLUDED.student_id_no,
        gwa = EXCLUDED.gwa,
        gwa_scale = EXCLUDED.gwa_scale,
        q1_grade = EXCLUDED.q1_grade,
        q2_grade = EXCLUDED.q2_grade,
        q3_grade = EXCLUDED.q3_grade,
        q4_grade = EXCLUDED.q4_grade,
        parent_guardian_name = EXCLUDED.parent_guardian_name,
        relationship = EXCLUDED.relationship,
        parent_contact = EXCLUDED.parent_contact,
        monthly_income = EXCLUDED.monthly_income,
        num_dependents = EXCLUDED.num_dependents,
        source_of_income = EXCLUDED.source_of_income,
        is_solo_parent_beneficiary = EXCLUDED.is_solo_parent_beneficiary,
        is_orphan = EXCLUDED.is_orphan,
        is_pwd = EXCLUDED.is_pwd,
        is_ip = EXCLUDED.is_ip,
        is_out_of_school_youth = EXCLUDED.is_out_of_school_youth,
        is_marginalized = EXCLUDED.is_marginalized,
        special_circumstances_specify = EXCLUDED.special_circumstances_specify,
        leadership_activities = EXCLUDED.leadership_activities,
        letter_to_mayor_file_id = EXCLUDED.letter_to_mayor_file_id,
        letter_to_mayor_url = EXCLUDED.letter_to_mayor_url,
        valid_id_file_id = EXCLUDED.valid_id_file_id,
        valid_id_url = EXCLUDED.valid_id_url,
        enrollment_cert_file_id = EXCLUDED.enrollment_cert_file_id,
        enrollment_cert_url = EXCLUDED.enrollment_cert_url,
        grade_transcript_file_id = EXCLUDED.grade_transcript_file_id,
        grade_transcript_url = EXCLUDED.grade_transcript_url,
        barangay_clearance_file_id = EXCLUDED.barangay_clearance_file_id,
        barangay_clearance_url = EXCLUDED.barangay_clearance_url,
        special_id_file_id = EXCLUDED.special_id_file_id,
        special_id_url = EXCLUDED.special_id_url,
        status = 'Pending', -- Reset status to Pending on resubmission
        date_filed = CURRENT_TIMESTAMP`,
      [
        session.username, semesterSy, lastName, firstName, middleName, suffix, dateOfBirth, sex, civilStatus, contactNumber, address, barangay, email,
        schoolEnrolled, courseProgram, yearLevel, studentIdNo, Number(gwa), gwaScale || '100', q1Grade ? Number(q1Grade) : null, q2Grade ? Number(q2Grade) : null, q3Grade ? Number(q3Grade) : null, q4Grade ? Number(q4Grade) : null,
        parentGuardianName, relationship, parentContact, Number(monthlyIncome), parseInt(numDependents), sourceOfIncome,
        !!isSoloParentBeneficiary, !!isOrphan, !!isPwd, !!isIp, !!isOutOfSchoolYouth, !!isMarginalized, specialCircumstancesSpecify,
        leadershipActivities,
        letterToMayorUpload.fileId, letterToMayorUpload.url,
        validIdUpload.fileId, validIdUpload.url,
        enrollmentCertUpload.fileId, enrollmentCertUpload.url,
        gradeTranscriptUpload.fileId, gradeTranscriptUpload.url,
        barangayClearanceUpload.fileId, barangayClearanceUpload.url,
        specialIdUpload.fileId, specialIdUpload.url
      ]
    );

    // Audit Log
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [
        session.username,
        'SCHOLAR_APPLY',
        `Scholar application submitted by ${session.username} (${firstName} ${lastName}) for S.Y. ${semesterSy}`
      ]
    );

    return NextResponse.json({
      success: true,
      message: '✅ Your application for financial assistance has been submitted successfully.'
    });

  } catch (err) {
    console.error('submitApplication API error:', err);
    return NextResponse.json({ error: `Application submission failed: ${err.message}` }, { status: 500 });
  }
}
