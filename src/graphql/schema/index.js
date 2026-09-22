import { gql } from "apollo-server-express";

export default gql`
  schema {
    query: Query
    mutation: Mutation
  }

  type User {
    id: ID!
    username: String!
    email: String
    full_name: String
    password: String!
    role: String!
    permissions: [String]
    isActive: Boolean
    createdAt: String
    lastLogin: String
  }
  type Patient {
    id: ID!
    name: String!
    age: Int
    phone: String
    history: [String]
    createdAt: Date
  }

  type Drug {
    id: ID!
    name: String!
    category: String
    description: String
    price: Float!
    stock: Int!
    createdBy: User
    createdAt: String
    updatedAt: String
    reorderLevel: Int!
  }

  type Prescription {
    herbName: String
    dosage: String
    frequency: String
    duration: String
  }

  type Consultation {
    id: ID!
    patient: User
    consultant: User
    symptoms: String
    diagnosis: String
    prescription: [Prescription]
    followUpDate: String
    createdAt: String
  }

  type Appointment {
    id: ID!
    patient: User!
    consultant: User!
    reason: String!
    appointmentDate: String!
    status: String!
    createdAt: String!

    meetingLink: String
    meetingStatus: String
  }
  enum AppointmentStatus {
    PENDING
    APPROVED
    REJECTED
  }

  input CreateAppointmentInput {
    consultantName: String
    reason: String!
    appointmentDate: String!
  }

  input PrescriptionInput {
    herbName: String
    dosage: String
    frequency: String
    duration: String
  }
  type Order {
    id: ID!
    patient: User!
    dispensedBy: User
    items: [OrderItem!]!
    totalAmount: Float!
    status: String!
    createdAt: String
  }

  type OrderItem {
    id: ID!
    drug: Drug!
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
  }
  input CartItemInput {
    drugId: ID!
    quantity: Int!
  }

  input CreateDrugInput {
    name: String!
    category: String
    description: String
    price: Float!
    stock: Int
    reorderLevel: Int
  }

  input UpdateAppointmentStatusInput {
    appointmentId: ID!
    status: String!
  }

  type DrugPurchase {
    id: ID!
    user: User!
    drug: Drug!
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    createdAt: String
  }
  type DailySalesSummary {
    totalRevenue: Float!
    totalDrugsSold: Int!
    date: String!
  }
  type FreelanceJob {
  id: ID!
  title: String!
  description: String!
  freelancerType: FreelancerType!
  location: String
  budget: Float
  employer: User!
  status: String!
  createdAt: String
}
  enum FreelancerType {
  DOCTOR
  NURSE
  PHARMACIST
  LAB_SCIENTIST
  PHYSIOTHERAPIST
  MIDWIFE
}
  type FreelancerProfile {
  id: ID!
  user: User!
  type: FreelancerType!
  specialty: String
  qualification: String
  experience: Int
  location: String
  hourlyRate: Float
  availability: String
  bio: String
  createdAt: String
}
  type FreelanceBooking {
  id: ID!
  patient: User!
  freelancer: FreelancerProfile!
  service: String!
  date: String
  status: String
}
    input CreateFreelancerProfileInput {
  type: FreelancerType!
  specialty: String
  qualification: String
  experience: Int
  location: String
  hourlyRate: Float
  availability: String
  bio: String
}

  input CreateFreelanceJobInput {
  title: String!
  description: String!
  freelancerType: FreelancerType!
  location: String
  budget: Float
}

  input BookFreelancerInput {
    freelancerId: ID!
    service: String!
    date: String!
  }
type JobApplication {
  id: ID!
  freelancer: User!
  job: FreelanceJob!
  status: String!
  appliedAt: String
}
  type OutpatientPrescriptionItem {
    drug: Drug
    dosage: String
    duration: String
  }

  input OutpatientPrescriptionInput {
    drugId: ID!
    dosage: String
    duration: String
  }

  type OutpatientRecord {
    id: ID!
    patient: User!
    consultant: User!
    patientName: String
    consultantName: String
    temp: String
    bp: String
    weight: String
    pulse: String
    notes: String
    diagnosis: String
    prescriptions: [OutpatientPrescriptionItem]
    status: String!
    message: String
    createdAt: String
  }

  input OutpatientInput {
    patientId: ID!
    temp: String
    bp: String
    weight: String
    pulse: String
    notes: String
    diagnosis: String
    prescriptions: [OutpatientPrescriptionInput]
  }

  type LabTest {
    id: ID!
    name: String!
    category: String
    description: String
    price: Float
    sampleType: String
    createdAt: String
  }

  input CreateLabTestInput {
    name: String!
    category: String
    description: String
    price: Float
    sampleType: String
  }

  type LabOrder {
    id: ID!
    patient: User!
    orderedBy: User!
    patientName: String
    orderedByName: String
    processedByName: String
    testName: String!
    notes: String
    status: String!
    result: String
    resultNotes: String
    processedBy: User
    createdAt: String
    completedAt: String
  }

  input OrderLabTestInput {
    patientId: ID!
    testName: String!
    notes: String
  }

  input SubmitLabResultInput {
    labOrderId: ID!
    result: String!
    resultNotes: String
  }

  scalar Date

  type AuthPayload {
    token: String!
    user: User!
  }

  input ApproveAndAssignAppointmentInput {
    appointmentId: ID!
    consultantId: ID!
  }
    input ApplyForFreelanceJobInput {
  jobId: ID!
}

type Query {
  getUsers: [User!]!

  getDrugs: [Drug!]!
  getDrug(id: ID!): Drug

  getPatients: [User!]!
  myPatients: [User!]!

  myOrders: [Order!]!
  orderReceipt(id: ID!): Order!
  getAllOrders: [Order!]!

  getDailySalesSummary: DailySalesSummary!
  lowStockDrugs: [Drug!]!

  getFreelancers: [FreelancerProfile!]!

  getFreelancersByType(
    type: FreelancerType!
  ): [FreelancerProfile!]!

  getFreelanceJobs: [FreelanceJob!]!

  myFreelanceBookings: [FreelanceBooking!]!

  getMyAppointments: [Appointment!]!
  getConsultations: [Consultation!]!
  getConsultantAppointments: [Appointment]
  getAppointments: [Appointment!]!
  myAppointments: [Appointment!]!

  myDrugPurchaseHistory: [DrugPurchase!]!
  drugPurchaseReceipt(id: ID!): DrugPurchase!

  myConsultations: [Consultation!]!
  consultationsForConsultant: [Consultation!]!
  allConsultations: [Consultation!]!

  pendingAppointments: [Appointment!]!
  allAppointments: [Appointment]
  consultantAppointments: [Appointment]

  getUsersByRole(role: String!): [User]

  getAllOutpatientRecords: [OutpatientRecord!]!
  myOutpatientRecords: [OutpatientRecord!]!

  getLabTests: [LabTest!]!
  getPendingLabOrders: [LabOrder!]!
  myLabOrders: [LabOrder!]!
  labOrdersForConsultant: [LabOrder!]!
  getAllLabOrders: [LabOrder!]!
}
  type Mutation {
  signup(
    username: String!
    email: String!
    full_name: String!
    password: String!
    role: String!
  ): AuthPayload!

  login(
    username: String!
    password: String!
  ): AuthPayload!

  createAppointment(
    input: CreateAppointmentInput!
  ): Appointment!

  updateAppointmentStatus(
    input: UpdateAppointmentStatusInput!
  ): Appointment

  approveAndAssignAppointment(
    input: ApproveAndAssignAppointmentInput!
  ): Appointment!

  createConsultation(
    patientName: String!
    symptoms: String!
    diagnosis: String!
    prescription: [PrescriptionInput]
    followUpDate: String
  ): Consultation

  createDrug(
    input: CreateDrugInput!
  ): Drug!

  checkoutDrugs(
    patientId: ID!
    items: [CartItemInput!]!
  ): Order!

  restockDrug(
    id: ID!
    quantity: Int!
  ): Drug!

  createLabTest(
    input: CreateLabTestInput!
  ): LabTest!

  orderLabTest(
    input: OrderLabTestInput!
  ): LabOrder!

  startLabOrder(
    labOrderId: ID!
  ): LabOrder!

  submitLabResult(
    input: SubmitLabResultInput!
  ): LabOrder!

  createFreelancerProfile(
    input: CreateFreelancerProfileInput!
  ): FreelancerProfile!

  createFreelanceJob(
    input: CreateFreelanceJobInput!
  ): FreelanceJob!

  applyForFreelanceJob(
    input: ApplyForFreelanceJobInput!
  ): JobApplication!

  bookFreelancer(
    input: BookFreelancerInput!
  ): FreelanceBooking!

  createOutpatientRecord(
    input: OutpatientInput!
  ): OutpatientRecord!

  startVideoConsultation(
    appointmentId: ID!
  ): Appointment

  endVideoConsultation(
    appointmentId: ID!
  ): Appointment
}
`;
