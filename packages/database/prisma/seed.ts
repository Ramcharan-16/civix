import { PrismaClient, Role, Severity, Priority, ComplaintStatus } from '../src/client';

const prisma = new PrismaClient();

const PASSWORD_HASH = '$2a$10$8.K.fKk7p7xH05F.l2k9ueg0d3V726pT4oGZgPszk0qZ6u3mNfUvS'; // password123

async function main() {
  console.log('Clearing all database tables...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.upvote.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.statusLog.deleteMany({});
  await prisma.complaintMedia.deleteMany({});
  await prisma.complaintAssignment.deleteMany({});
  await prisma.complaintProgressUpdate.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.staffMember.deleteMany({});
  await prisma.departmentAdmin.deleteMany({});
  await prisma.superAdmin.deleteMany({});
  await prisma.citizen.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.slaSetting.deleteMany({});

  console.log('1. Seeding 10 Departments...');
  const departmentsData = [
    { name: 'Roads & Infrastructure', description: 'Repairs potholes and footpaths.', contactEmail: 'roads@civix.gov.in', contactPhone: '+91 80 2221 0001' },
    { name: 'Electricity Board', description: 'Handles outages and live wires.', contactEmail: 'electricity@civix.gov.in', contactPhone: '+91 80 2221 0002' },
    { name: 'Water Supply & Sewerage', description: 'Manages water supply and pipe leaks.', contactEmail: 'water@civix.gov.in', contactPhone: '+91 80 2221 0003' },
    { name: 'Sanitation & Waste', description: 'Daily garbage clearance and street sweeping.', contactEmail: 'sanitation@civix.gov.in', contactPhone: '+91 80 2221 0004' },
    { name: 'Street Lighting', description: 'Street lamps and pole maintenance.', contactEmail: 'lighting@civix.gov.in', contactPhone: '+91 80 2221 0005' },
    { name: 'Traffic & Signage', description: 'Traffic signals and road signage.', contactEmail: 'traffic@civix.gov.in', contactPhone: '+91 80 2221 0006' },
    { name: 'Public Safety', description: 'Open manholes and hazard removal.', contactEmail: 'safety@civix.gov.in', contactPhone: '+91 80 2221 0007' },
    { name: 'Parks & Trees', description: 'Tree clearing and public garden care.', contactEmail: 'parks@civix.gov.in', contactPhone: '+91 80 2221 0008' },
    { name: 'Public Health', description: 'Public restrooms and hygiene.', contactEmail: 'health@civix.gov.in', contactPhone: '+91 80 2221 0009' },
    { name: 'Drainage Division', description: 'Stormwater culverts and gutters.', contactEmail: 'drainage@civix.gov.in', contactPhone: '+91 80 2221 0010' }
  ];

  const departments: any[] = [];
  for (const d of departmentsData) {
    const created = await prisma.department.create({ data: d });
    departments.push(created);
  }

  console.log('2. Seeding 10 Categories...');
  const categoriesData = [
    { name: 'Pothole on Main Road', description: 'Deep potholes on roads.', deptIdx: 0 },
    { name: 'Hanging Live Wire', description: 'Exposed power cables.', deptIdx: 1 },
    { name: 'Water Pipe Leakage', description: 'Burst drinking water pipeline.', deptIdx: 2 },
    { name: 'Garbage Pileup', description: 'Uncollected solid waste dump.', deptIdx: 3 },
    { name: 'Broken Streetlight', description: 'Non-functional streetlamp.', deptIdx: 4 },
    { name: 'Faulty Traffic Signal', description: 'Traffic lights malfunctioning.', deptIdx: 5 },
    { name: 'Open Manhole', description: 'Missing sewer cover hazard.', deptIdx: 6 },
    { name: 'Fallen Tree Blockage', description: 'Tree branch blocking lane.', deptIdx: 7 },
    { name: 'Public Toilet Maintenance', description: 'Restroom sanitation issues.', deptIdx: 8 },
    { name: 'Drainage Overflow', description: 'Sewage overflow on street.', deptIdx: 9 }
  ];

  const categories: any[] = [];
  for (const c of categoriesData) {
    const created = await prisma.category.create({
      data: {
        name: c.name,
        description: c.description,
        departmentId: departments[c.deptIdx].id
      }
    });
    categories.push(created);
  }

  console.log('3. Seeding 10 SLA Settings...');
  const slaData = [
    { key: 'CRITICAL', durationHours: 4 },
    { key: 'HIGH', durationHours: 24 },
    { key: 'MEDIUM', durationHours: 72 },
    { key: 'LOW', durationHours: 168 },
    { key: 'Hanging Live Wire', durationHours: 4 },
    { key: 'Open Manhole', durationHours: 4 },
    { key: 'Pothole on Main Road', durationHours: 48 },
    { key: 'Water Pipe Leakage', durationHours: 24 },
    { key: 'Drainage Overflow', durationHours: 24 },
    { key: 'Garbage Pileup', durationHours: 24 }
  ];
  for (const s of slaData) {
    await prisma.slaSetting.create({ data: s });
  }

  console.log('4. Seeding 10 Super Admins...');
  const superAdminNames = [
    { name: 'Rajesh Kumar', email: 'admin@civix.gov.in', title: 'Chief Municipal Commissioner' },
    { name: 'Sunil Rao', email: 'sunil.rao@civix.gov.in', title: 'Additional Commissioner' },
    { name: 'Kavita Menon', email: 'kavita.menon@civix.gov.in', title: 'Chief Operations Officer' },
    { name: 'Deepak Varma', email: 'deepak.varma@civix.gov.in', title: 'Public Works Director' },
    { name: 'Anand Kulkarni', email: 'anand.kulkarni@civix.gov.in', title: 'Chief Technology Officer' },
    { name: 'Shalini Nambiar', email: 'shalini.nambiar@civix.gov.in', title: 'Vigilance Head' },
    { name: 'Vivek Joshi', email: 'vivek.joshi@civix.gov.in', title: 'Disaster Coordinator' },
    { name: 'Pooja Hegde', email: 'pooja.hegde@civix.gov.in', title: 'Grievance Director' },
    { name: 'Arun Nair', email: 'arun.nair@civix.gov.in', title: 'Urban Planning Head' },
    { name: 'Rashmi Iyer', email: 'rashmi.iyer@civix.gov.in', title: 'Chief Audit Officer' }
  ];

  const superAdmins: any[] = [];
  for (let i = 0; i < superAdminNames.length; i++) {
    const sa = await prisma.superAdmin.create({
      data: {
        name: superAdminNames[i].name,
        email: superAdminNames[i].email,
        phone: `+91 98000 000${i.toString().padStart(2, '0')}`,
        passwordHash: PASSWORD_HASH,
        roleTitle: superAdminNames[i].title
      }
    });
    superAdmins.push(sa);
  }

  console.log('5. Seeding 10 Department Admins...');
  const deptAdminNames = [
    'Amit Sharma', 'Priya Patel', 'Suresh Nair', 'Anjali Rao', 'Manoj Bajpayee',
    'Geeta Phogat', 'Naveen Jindal', 'Rekha Swaminathan', 'Harish Chandra', 'Bhavna Pandey'
  ];

  const deptAdmins: any[] = [];
  for (let i = 0; i < 10; i++) {
    const da = await prisma.departmentAdmin.create({
      data: {
        employeeId: `DADM-${(i + 1).toString().padStart(3, '0')}`,
        name: deptAdminNames[i],
        email: `${deptAdminNames[i].toLowerCase().replace(' ', '.')}@civix.gov.in`,
        phone: `+91 91000 000${i.toString().padStart(2, '0')}`,
        passwordHash: PASSWORD_HASH,
        departmentId: departments[i].id,
        designation: `Head of ${departments[i].name}`
      }
    });
    deptAdmins.push(da);
  }

  console.log('6. Seeding 10 Staff Members...');
  const staffNames = [
    'Ramesh Gowda', 'Vijay Mhatre', 'Sunita Deshmukh', 'Karan Johar', 'Vikram Singh',
    'Meera Nair', 'Rohan Das', 'Arjun Prasad', 'Shweta Tiwari', 'Manish Pandey'
  ];

  const staffMembers: any[] = [];
  for (let i = 0; i < 10; i++) {
    const sm = await prisma.staffMember.create({
      data: {
        employeeId: `STF-${(i + 1).toString().padStart(3, '0')}`,
        name: staffNames[i],
        email: `${staffNames[i].toLowerCase().replace(' ', '.')}@civix.gov.in`,
        phone: `+91 82000 000${i.toString().padStart(2, '0')}`,
        passwordHash: PASSWORD_HASH,
        departmentId: departments[i].id,
        designation: i % 2 === 0 ? 'Senior Field Engineer' : 'Operations Specialist'
      }
    });
    staffMembers.push(sm);
  }

  console.log('7. Seeding 10 Citizens...');
  const citizenNames = [
    'Aarav Mehta', 'Ananya Iyer', 'Rahul Sharma', 'Sneha Reddy', 'Aditya Verma',
    'Riya Sen', 'Kabir Bansal', 'Tanvi Hegde', 'Divya Teja', 'Sanjay Dutt'
  ];

  const citizens: any[] = [];
  for (let i = 0; i < 10; i++) {
    const ct = await prisma.citizen.create({
      data: {
        name: citizenNames[i],
        email: `${citizenNames[i].toLowerCase().replace(' ', '.')}@gmail.com`,
        phone: `+91 70000 000${i.toString().padStart(2, '0')}`,
        passwordHash: PASSWORD_HASH,
        address: `#${i * 12 + 10}, 100 Feet Road, Indiranagar, Bengaluru`
      }
    });
    citizens.push(ct);
  }

  console.log('8. Seeding 10 Complaints...');
  const complaintTitles = [
    { title: 'Dangerous Pothole on Outer Ring Road', catIdx: 0, status: ComplaintStatus.IN_PROGRESS, severity: Severity.HIGH, priority: Priority.HIGH },
    { title: 'Sparking Live Cable Fallen near School', catIdx: 1, status: ComplaintStatus.ASSIGNED, severity: Severity.CRITICAL, priority: Priority.URGENT },
    { title: 'Major Drinking Water Pipeline Rupture', catIdx: 2, status: ComplaintStatus.RESOLVED, severity: Severity.MEDIUM, priority: Priority.HIGH },
    { title: 'Severe Garbage Dump Overflowing', catIdx: 3, status: ComplaintStatus.CLOSED, severity: Severity.MEDIUM, priority: Priority.MEDIUM },
    { title: 'Streetlight Inoperative for 2 Weeks', catIdx: 4, status: ComplaintStatus.SUBMITTED, severity: Severity.LOW, priority: Priority.LOW },
    { title: 'Faulty Signal at MG Road Junction', catIdx: 5, status: ComplaintStatus.PENDING_VERIFICATION, severity: Severity.HIGH, priority: Priority.HIGH },
    { title: 'Uncovered Deep Sewer Manhole', catIdx: 6, status: ComplaintStatus.IN_PROGRESS, severity: Severity.CRITICAL, priority: Priority.URGENT },
    { title: 'Large Tree Branch Fallen Blocking Lane', catIdx: 7, status: ComplaintStatus.RESOLVED, severity: Severity.HIGH, priority: Priority.MEDIUM },
    { title: 'Public Restroom Choked and Dirty', catIdx: 8, status: ComplaintStatus.UNDER_AI_ANALYSIS, severity: Severity.LOW, priority: Priority.LOW },
    { title: 'Stormwater Culvert Blocked by Debris', catIdx: 9, status: ComplaintStatus.ASSIGNED, severity: Severity.HIGH, priority: Priority.MEDIUM }
  ];

  const complaints: any[] = [];
  for (let i = 0; i < 10; i++) {
    const t = complaintTitles[i];
    const category = categories[t.catIdx];
    const citizen = citizens[i];
    const dept = departments[t.catIdx];
    const staff = staffMembers[t.catIdx];
    const isAssigned = t.status === ComplaintStatus.ASSIGNED || t.status === ComplaintStatus.IN_PROGRESS || t.status === ComplaintStatus.RESOLVED || t.status === ComplaintStatus.CLOSED;

    const createdAt = new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000);
    const resolvedAt = (t.status === ComplaintStatus.RESOLVED || t.status === ComplaintStatus.CLOSED) ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null;

    const cmp = await prisma.complaint.create({
      data: {
        complaintNumber: `CIVIX-2026-00000${i + 1}`,
        title: t.title,
        description: `Citizen reported ${t.title.toLowerCase()} causing civic disruption. Immediate attention requested.`,
        categoryId: category.id,
        citizenId: citizen.id,
        assignedDepartmentId: isAssigned ? dept.id : null,
        assignedStaffId: isAssigned ? staff.id : null,
        address: citizen.address || 'Bengaluru, Karnataka',
        severity: t.severity,
        priority: t.priority,
        status: t.status,
        createdAt,
        resolvedAt
      }
    });
    complaints.push(cmp);
  }

  console.log('9. Seeding 10 Complaint Assignments...');
  for (let i = 0; i < 10; i++) {
    await prisma.complaintAssignment.create({
      data: {
        complaintId: complaints[i].id,
        departmentId: departments[i].id,
        staffId: staffMembers[i].id,
        assignedBy: superAdmins[0].name,
        reason: 'Assigned to zonal specialist for immediate remediation.'
      }
    });
  }

  console.log('10. Seeding 10 Complaint Progress Updates...');
  for (let i = 0; i < 10; i++) {
    await prisma.complaintProgressUpdate.create({
      data: {
        complaintId: complaints[i].id,
        staffId: staffMembers[i].id,
        progressPercentage: (i + 1) * 10,
        description: `Technician inspected location #${i + 1}. Necessary materials staged and repair underway.`
      }
    });
  }

  console.log('11. Seeding 10 Media Records...');
  for (let i = 0; i < 10; i++) {
    await prisma.complaintMedia.create({
      data: {
        complaintId: complaints[i].id,
        fileUrl: `https://images.unsplash.com/photo-${1600000000000 + i}?auto=format&fit=crop&q=80&w=600`,
        mimeType: 'image/jpeg'
      }
    });
  }

  console.log('12. Seeding 10 Status Logs...');
  for (let i = 0; i < 10; i++) {
    await prisma.statusLog.create({
      data: {
        complaintId: complaints[i].id,
        oldStatus: 'SUBMITTED',
        newStatus: complaints[i].status,
        changedByName: citizens[i].name,
        comment: `Logged civic issue ticket: ${complaints[i].title}`
      }
    });
  }

  console.log('13. Seeding 10 Feedbacks...');
  for (let i = 0; i < 10; i++) {
    await prisma.feedback.create({
      data: {
        complaintId: complaints[i].id,
        citizenId: citizens[i].id,
        rating: 4 + (i % 2),
        comment: `Civic issue attended promptly. Satisfied with resolution quality (${4 + (i % 2)}/5 stars).`
      }
    });
  }

  console.log('14. Seeding 10 Upvotes...');
  for (let i = 0; i < 10; i++) {
    await prisma.upvote.create({
      data: {
        complaintId: complaints[i].id,
        citizenId: citizens[(i + 1) % 10].id
      }
    });
  }

  console.log('15. Seeding 10 Comments...');
  for (let i = 0; i < 10; i++) {
    await prisma.comment.create({
      data: {
        complaintId: complaints[i].id,
        userName: citizens[i].name,
        userRole: Role.CITIZEN,
        content: `Checking on update for ticket CIVIX-2026-00000${i + 1}. Thank you.`
      }
    });
  }

  console.log('16. Seeding 10 Notifications...');
  for (let i = 0; i < 10; i++) {
    await prisma.notification.create({
      data: {
        userId: citizens[i].id,
        title: `Ticket Update: CIVIX-2026-00000${i + 1}`,
        message: `Your complaint is currently marked as: ${complaints[i].status}.`
      }
    });
  }

  console.log('17. Seeding 10 Audit Logs...');
  for (let i = 0; i < 10; i++) {
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_AUDIT_CHECK',
        entity: 'Complaint',
        entityId: complaints[i].id
      }
    });
  }

  console.log('\n=========================================');
  console.log(' DATABASE SEED COMPLETED SUCCESSFULLY!  ');
  console.log(' Clean schema: Exactly 10 clean rows.  ');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
