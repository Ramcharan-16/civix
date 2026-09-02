
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CitizenScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  passwordHash: 'passwordHash',
  address: 'address',
  createdAt: 'createdAt'
};

exports.Prisma.StaffMemberScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  passwordHash: 'passwordHash',
  departmentId: 'departmentId',
  designation: 'designation',
  createdAt: 'createdAt'
};

exports.Prisma.DepartmentAdminScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  passwordHash: 'passwordHash',
  departmentId: 'departmentId',
  designation: 'designation',
  createdAt: 'createdAt'
};

exports.Prisma.SuperAdminScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  passwordHash: 'passwordHash',
  roleTitle: 'roleTitle',
  createdAt: 'createdAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  departmentId: 'departmentId'
};

exports.Prisma.ComplaintScalarFieldEnum = {
  id: 'id',
  complaintNumber: 'complaintNumber',
  title: 'title',
  description: 'description',
  categoryId: 'categoryId',
  citizenId: 'citizenId',
  assignedDepartmentId: 'assignedDepartmentId',
  assignedStaffId: 'assignedStaffId',
  address: 'address',
  latitude: 'latitude',
  longitude: 'longitude',
  severity: 'severity',
  priority: 'priority',
  status: 'status',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt'
};

exports.Prisma.ComplaintMediaScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  fileUrl: 'fileUrl',
  mimeType: 'mimeType',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.StatusLogScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  oldStatus: 'oldStatus',
  newStatus: 'newStatus',
  changedByName: 'changedByName',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.FeedbackScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  citizenId: 'citizenId',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  userName: 'userName',
  userRole: 'userRole',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.UpvoteScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  citizenId: 'citizenId',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  createdAt: 'createdAt'
};

exports.Prisma.ComplaintAssignmentScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  departmentId: 'departmentId',
  staffId: 'staffId',
  assignedBy: 'assignedBy',
  assignedAt: 'assignedAt',
  reason: 'reason'
};

exports.Prisma.ComplaintProgressUpdateScalarFieldEnum = {
  id: 'id',
  complaintId: 'complaintId',
  staffId: 'staffId',
  progressPercentage: 'progressPercentage',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.SlaSettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  durationHours: 'durationHours'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Severity = exports.$Enums.Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.Priority = exports.$Enums.Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.ComplaintStatus = exports.$Enums.ComplaintStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_AI_ANALYSIS: 'UNDER_AI_ANALYSIS',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED'
};

exports.Role = exports.$Enums.Role = {
  CITIZEN: 'CITIZEN',
  STAFF: 'STAFF',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

exports.Prisma.ModelName = {
  Citizen: 'Citizen',
  StaffMember: 'StaffMember',
  DepartmentAdmin: 'DepartmentAdmin',
  SuperAdmin: 'SuperAdmin',
  Department: 'Department',
  Category: 'Category',
  Complaint: 'Complaint',
  ComplaintMedia: 'ComplaintMedia',
  StatusLog: 'StatusLog',
  Feedback: 'Feedback',
  Comment: 'Comment',
  Upvote: 'Upvote',
  Notification: 'Notification',
  AuditLog: 'AuditLog',
  ComplaintAssignment: 'ComplaintAssignment',
  ComplaintProgressUpdate: 'ComplaintProgressUpdate',
  SlaSetting: 'SlaSetting'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
