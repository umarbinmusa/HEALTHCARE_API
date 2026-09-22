import argon2 from "argon2";
import { GraphQLDateTime } from "graphql-scalars";
import jwt from "jsonwebtoken";
import mongoose, { model } from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../../utils/requireRole.js";

import { AuthenticationError, ForbiddenError } from "apollo-server-express";
import User from "../../models/user.js";
import Consultation from "../../models/consultation.js";
import Drug from "../../models/drug.js";
import DrugPurchase from "../../models/drugPurchase.js";
import Appointment from "../../models/appointment.js";
import Order from "../../models/order.js";
import Freelancer from "../../models/freelancer.js";
import FreelanceBooking from "../../models/freelanceBooking.js";
import FreelanceJob from "../../models/freelanceJob.js";
import JobApplication from "../../models/jobApplication.js";
import OutpatientRecord from "../../models/outpatientRecord.js";
import LabTest from "../../models/labTest.js";
import LabOrder from "../../models/labOrder.js";

const CONSULTANT_RESTRICTED = false; 

dotenv.config();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const resolvers = {
  Appointment: {
  appointmentDate: (parent) => {
    if (!parent.appointmentDate) return null;
    return parent.appointmentDate.toISOString();
  }
},

  OutpatientRecord: {
    patientName: (parent) => parent.patient?.full_name || null,
    consultantName: (parent) => parent.consultant?.full_name || null,
  },

  LabOrder: {
    patientName: (parent) => parent.patient?.full_name || null,
    orderedByName: (parent) => parent.orderedBy?.full_name || null,
    processedByName: (parent) => parent.processedBy?.full_name || null,
  },

  Query: {
    getUsers: async (_, __, { models, user }) => {
      if (!user || user.role !== "ADMIN") {
        throw new ForbiddenError("Access denied. Admins only.");
      }
      return await models.User.find();
    },
    getUsersByRole: async (_, { role }, { user }) => {
  // Optional: requireRole(user, ["PATIENT", "ADMIN"]);
  return await User.find({ role: role });
},
  getDrugs: async () => {
  const drugs = await Drug.find().sort({ createdAt: -1 }).populate("createdBy");
  
  // Map each drug to convert IDs to string and include reorderLevel
  return drugs.map(drug => ({
    id: drug._id.toString(),
    name: drug.name,
    category: drug.category,
    description: drug.description,
    price: drug.price,
    stock: drug.stock,
    reorderLevel: drug.reorderLevel || 0, // <-- ADD THIS LINE (with a safe fallback)
    createdBy: drug.createdBy
      ? {
          id: drug.createdBy._id.toString(),
          full_name: drug.createdBy.full_name
        }
      : null
  }));
},


    getPatients: async (_, __, { user }) => {
      requireRole(user, ["ADMIN", "CONSULTANT"]);

      return await User.find({ role: "PATIENT" }).sort({
        createdAt: -1
      });
    },
    myConsultations: async (_, __, { user }) => {
      requireRole(user, ["PATIENT"]);

      return await Consultation.find({
        patient: user.id
      })
        .populate("patient", "full_name email role")
        .populate("consultant", "full_name role")
        .sort({ createdAt: -1 });
    },
   getConsultations: async (_, __, { models }) => {
      return await models.Consultation.find().sort({ createdAt: -1 });
    },

   getConsultantAppointments: async (_, __, { user }) => {
      requireRole(user, ["CONSULTANT"]);

      return await Appointment.find({ consultant: user.id })
        .populate("patient", "full_name email")
        .sort({ createdAt: -1 });
    },
  


  /**
   * CONSULTANT: Get my patients (distinct)
   */
  myPatients: async (_, __, { user }) => {
    requireRole(user, ["CONSULTANT"]);

    const consultations = await Consultation.find({
      consultant: user.id,
    }).populate("patient");

    const patientsMap = new Map();

    consultations.forEach((c) => {
      if (c.patient) {
        patientsMap.set(c.patient._id.toString(), c.patient);
      }
    });

    return Array.from(patientsMap.values());
  },
  getAppointments: async (_, __, { models, user }) => {
  requireRole(user, ["CONSULTANT"]);

  return await models.Appointment.find()
  },

  myAppointments: async (_, __, { user }) => {
  if (user.role === "PATIENT") {
    return await Appointment.find({ patient: user.id })
      .populate("patient", "full_name email")
      .populate("consultant", "full_name email");
  } else if (user.role === "ADMIN") {
    return await Appointment.find()
      .populate("patient", "full_name email")
      .populate("consultant", "full_name email");
  } else {
    throw new AuthenticationError("Access denied");
  }
},
lowStockDrugs: async (_, __, { models }) => {
  const drugs = await models.Drug.find();

  return drugs.filter(
    (drug) => drug.stock <= drug.reorderLevel
  );
},




   myDrugPurchaseHistory: async (_, __, { user }) => {
      if (!user || user.role !== "PATIENT") {
        throw new Error("Access denied");
      }

      return DrugPurchase.find({ user: user.id })
        .populate("drug", "name price")
        .sort({ createdAt: -1 });
    },

    // 🔹 SINGLE RECEIPT
    // 🔹 SINGLE RECEIPT
    drugPurchaseReceipt: async (_, { id }, { models, user }) => {
      if (!user) throw new Error("Unauthorized");

      // Fetch from Order collection and populate everything
      const order = await models.Order.findById(id)
        .populate("patient")
        .populate("items.drug");

      if (!order) throw new Error("Receipt not found");

      // Authorization guard
      if (order.patient._id.toString() !== user.id) {
        throw new Error("Access denied");
      }

      // Extract the first item safely for your current GraphQL schema mapping
      const firstItem = order.items[0];

      return {
        id: order._id.toString(),
        createdAt: order.createdAt,
        totalPrice: order.totalAmount,
        quantity: firstItem ? firstItem.quantity : 0,
        unitPrice: firstItem ? firstItem.unitPrice : 0,
        // CRITICAL SAFETY CHECK: If the drug document was deleted, provide a fallback object 
        // so GraphQL doesn't panic with a "cannot return null for non-nullable field" error
        drug: firstItem && firstItem.drug ? firstItem.drug : {
          id: "deleted",
          name: "Discontinued Medication",
          price: 0,
          stock: 0,
          category: "Unknown"
        }
      };
    },
    // 🔹 MULTI-DRUG RECEIPT RESOLVER
    orderReceipt: async (_, { id }, { models, user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      // Fetch the order and deeply hydrate patient and items.drug paths
      const order = await models.Order.findById(id)
        .populate("patient")
        .populate("dispensedBy")
        .populate("items.drug");

      if (!order) {
        throw new Error("Receipt not found");
      }

      // Authorization check
      if (order.patient._id.toString() !== user.id && user.role !== "ADMIN") {
        throw new Error("Access denied");
      }

      return order;
    },
  // ================= CONSULTANT =================
  consultationsForConsultant: async (_, __, { user }) => {
    requireRole(user, ["CONSULTANT"]);

    return await Consultation.find({ consultant: user.id })
      .populate("patient", "full_name email role")
      .populate("consultant", "full_name role")
      .sort({ createdAt: -1 });
  },
  allConsultations: async (_, __, { user }) => {
  requireRole(user, ["ADMIN"]);

  return Consultation.find()
    .populate("patient", "full_name email")
    .populate("consultant", "full_name email")
    .sort({ createdAt: -1 });
},


  // ================= ADMIN =================
  allAppointments: async () => {
  return Appointment.find()
    .populate("patient", "full_name email")
    .populate("consultant", "full_name email")
    .sort({ createdAt: -1 });
},

  pendingAppointments: async (_, __, { user }) => {
  requireRole(user, ["ADMIN"]);

  return Appointment.find({ status: "PENDING" })
    .populate("patient", "full_name email")
    .sort({ createdAt: -1 });
},
consultantAppointments: async (_, __, { user }) => {
  requireRole(user, ["CONSULTANT"]);

  return Appointment.find({
    consultant: user.id
  })
    .populate("patient", "full_name email")
    .populate("consultant", "full_name email")
    .sort({ appointmentDate: 1 });
},
myOrders: async (_, __, { models, user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      // Deeply populate both the patient and the drug inside the nested items array
      const orders = await models.Order.find({
        patient: user.id,
      })
      .populate("patient")
      .populate("dispensedBy")
      .populate("items.drug"); // <-- THIS IS THE CRITICAL MISSING POPULATION

      return orders || [];
    },

    getAllOrders: async (_, __, { models, user }) => {
      requireRole(user, ["ADMIN", "PHARMACY"]);

      return await models.Order.find()
        .populate("patient")
        .populate("dispensedBy")
        .populate("items.drug")
        .sort({ createdAt: -1 });
    },

    // 🔹 ADMIN ONLY: Get Total Drug Sales For Today
    getDailySalesSummary: async (_, __, { models, user }) => {
      // 1. Enforce strict Admin-only check
      if (!user || user.role !== "ADMIN") {
        throw new ForbiddenError("Access denied. Admins only.");
      }

      // 2. Compute the start of today (00:00:00.000 local time)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // 3. Run Aggregation pipeline on the Order collection
      const salesData = await models.Order.aggregate([
        {
          // Filter records created today
          $match: {
            createdAt: { $gte: startOfToday }
          }
        },
        {
          // Unwind the items array to inspect individual drug quantities
          $unwind: "$items"
        },
        {
          // Sum totalAmount from orders and item quantities
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalDrugsSold: { $sum: "$items.quantity" }
          }
        }
      ]);

      // 4. Return summary values (or zeros if no sales occurred yet)
      const summary = salesData[0] || { totalRevenue: 0, totalDrugsSold: 0 };

      return {
        totalRevenue: summary.totalRevenue,
        totalDrugsSold: summary.totalDrugsSold,
        date: new Date().toLocaleDateString()
      };
    },
    getFreelancers: async () => {
  return await Freelancer.find()
    .populate("user");
},

    getFreelancersByType: async (_, { type }) => {
      return await Freelancer.find({ type }).populate("user");
    },

    getFreelanceJobs: async () => {
      return await FreelanceJob.find()
        .populate("employer", "full_name email role")
        .sort({ createdAt: -1 });
    },

    myFreelanceBookings: async (_, __, { user }) => {
      if (!user) throw new Error("Authentication required");

      return await FreelanceBooking.find({ patient: user.id })
        .populate({ path: "freelancer", populate: { path: "user" } })
        .sort({ createdAt: -1 });
    },

    getAllOutpatientRecords: async (_, __, { user }) => {
      requireRole(user, ["ADMIN"]);

      return await OutpatientRecord.find()
        .populate("patient", "full_name email")
        .populate("consultant", "full_name email")
        .populate("prescriptions.drug")
        .sort({ createdAt: -1 });
    },

    myOutpatientRecords: async (_, __, { user }) => {
      requireRole(user, ["CONSULTANT"]);

      return await OutpatientRecord.find({ consultant: user.id })
        .populate("patient", "full_name email")
        .populate("consultant", "full_name email")
        .populate("prescriptions.drug")
        .sort({ createdAt: -1 });
    },

    getLabTests: async () => {
      return await LabTest.find().sort({ name: 1 });
    },

    getPendingLabOrders: async (_, __, { user }) => {
      requireRole(user, ["LAB", "ADMIN"]);

      return await LabOrder.find({ status: { $in: ["PENDING", "IN_PROGRESS"] } })
        .populate("patient", "full_name email")
        .populate("orderedBy", "full_name email role")
        .populate("processedBy", "full_name email")
        .sort({ createdAt: 1 });
    },

    myLabOrders: async (_, __, { user }) => {
      requireRole(user, ["PATIENT"]);

      return await LabOrder.find({ patient: user.id })
        .populate("patient", "full_name email")
        .populate("orderedBy", "full_name email role")
        .populate("processedBy", "full_name email")
        .sort({ createdAt: -1 });
    },

    labOrdersForConsultant: async (_, __, { user }) => {
      requireRole(user, ["CONSULTANT"]);

      return await LabOrder.find({ orderedBy: user.id })
        .populate("patient", "full_name email")
        .populate("orderedBy", "full_name email role")
        .populate("processedBy", "full_name email")
        .sort({ createdAt: -1 });
    },

    getAllLabOrders: async (_, __, { user }) => {
      requireRole(user, ["ADMIN"]);

      return await LabOrder.find()
        .populate("patient", "full_name email")
        .populate("orderedBy", "full_name email role")
        .populate("processedBy", "full_name email")
        .sort({ createdAt: -1 });
    },





  
  },

  Mutation: {
    signup: async (
      _,
      { username, password, role, email, full_name },
      { models }
    ) => {
      if (!username || !password || !role) {
        throw new AuthenticationError("All fields are required");
      }
      const existingUser = await models.User.findOne({ username });
      if (existingUser) throw new AuthenticationError("Username already taken");
      const hashedPassword = await argon2.hash(password);
      const user = await models.User.create({
        username,
        email,
        full_name,
        password: hashedPassword,
        role,
      });
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
      return { token, user };
    },

    login: async (_, { username, password }, { models }) => {
      const user = await models.User.findOne({ username });
      if (!user || !(await argon2.verify(user.password, password))) {
        throw new AuthenticationError("Invalid credentials");
      }
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
      return { token, user };
    },
    
  createConsultation: async (
  _,
  { patientName, symptoms, diagnosis, prescription, followUpDate },
  { user }
) => {
  // 1. Authorization
  requireRole(user, ["ADMIN", "CONSULTANT"]);

  // 2. Build Query
  let query = { 
    full_name: { $regex: new RegExp(`^${patientName}$`, 'i') }, 
    role: "PATIENT" 
  };

  // 3. Handle Consultant Restrictions
  // Note: Ensure CONSULTANT_RESTRICTED is imported or defined in this scope
  if (user.role === "CONSULTANT" && typeof CONSULTANT_RESTRICTED !== 'undefined' && CONSULTANT_RESTRICTED) {
    query.createdBy = user.id;
  }

  // 4. Find Patient
  const patient = await User.findOne(query);

  if (!patient) {
    throw new Error(`Patient "${patientName}" not found. Check spelling or verify they are registered.`);
  }

  // 5. Save Consultation
  const consultation = new Consultation({
    patient: patient._id,
    consultant: user.id,
    symptoms,
    diagnosis,
    prescription, // This will be the array of objects from your PrescriptionInput
    followUpDate
  });

  await consultation.save();

  // 6. Return Populated Data
  return await consultation
    .populate([
      { path: "patient", select: "full_name email role" },
      { path: "consultant", select: "full_name role" }
    ]);
},
     createDrug: async (_, { input }, { user }) => {
  requireRole(user, ["ADMIN", "PHARMACY"]);

  // Destructure reorderLevel from input
  const { name, category, description, price, stock, reorderLevel } = input;

  if (price < 0) {
    throw new Error("Price cannot be negative");
  }

  if (stock < 0) {
    throw new Error("Stock cannot be negative");
  }

  // Add validation rule for reorder level
  if (reorderLevel !== undefined && reorderLevel < 0) {
    throw new Error("Reorder level cannot be negative");
  }

  const drug = new Drug({
    name,
    category,
    description,
    price,
    stock,
    reorderLevel: reorderLevel || 0, // <-- ADD THIS LINE
    createdBy: user.id
  });

  await drug.save();

  await drug.populate("createdBy", "full_name role");

  return drug;
},
restockDrug: async (_, { id, quantity }, { user }) => {
      requireRole(user, ["ADMIN", "PHARMACY"]);

      // { new: true } is critical—it tells Mongoose to return the UPDATED document, not the old one
      const updatedDrug = await Drug.findByIdAndUpdate(
        id,
        { $inc: { stock: quantity } },
        { new: true } 
      );

      if (!updatedDrug) {
        throw new Error("Drug not found");
      }

      return updatedDrug; // 👈 Make sure this is returned!
    },
  
   
  checkoutDrugs: async (_, { patientId, items }, { models, user }) => {
    requireRole(user, ["PHARMACY", "ADMIN"]);

    const patient = await models.User.findOne({ _id: patientId, role: "PATIENT" });
    if (!patient) {
      throw new Error("Patient not found");
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const drug = await models.Drug.findById(item.drugId);

      if (!drug) {
        throw new Error(`Drug not found: ${item.drugId}`);
      }

      if (drug.stock < item.quantity) {
        throw new Error(
          `${drug.name} has only ${drug.stock} units remaining`
        );
      }

      const unitPrice = drug.price;
      const totalPrice = unitPrice * item.quantity;

      totalAmount += totalPrice;

      orderItems.push({
        drug: drug._id,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });

      drug.stock -= item.quantity;
      await drug.save();
    }

   const order = await models.Order.create({
  patient: patient._id,
  dispensedBy: user.id,
  items: orderItems,
  totalAmount,
});

   return await models.Order.findById(order._id)
  .populate("patient")
  .populate("dispensedBy")
  .populate("items.drug");
},


    createAppointment: async (_, { input }, { user }) => {
  requireRole(user, ["PATIENT"]);

  // We now expect 'consultantName' instead of 'consultantId'
  const { consultantName, reason, appointmentDate } = input;

  if (!appointmentDate) {
    throw new Error("Appointment date is required");
  }

  // --- 1. Find Consultant by Name ---
  let consultantId = null;
  
  if (consultantName) {
    const consultant = await User.findOne({
      full_name: { $regex: new RegExp(`^${consultantName}$`, 'i') },
      role: "CONSULTANT"
    });

    if (!consultant) {
      throw new Error(`Consultant "${consultantName}" not found.`);
    }
    consultantId = consultant.id;
  }

  // --- 2. Date Parsing ---
  let parsedDate;
  if (/^\d+$/.test(String(appointmentDate))) {
    parsedDate = new Date(Number(appointmentDate));
  } else {
    parsedDate = new Date(appointmentDate);
  }

  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid appointment date format");
  }

  // --- 3. Save Appointment ---
  const appointment = new Appointment({
    patient: user.id,
    consultant: consultantId, 
    reason,
    appointmentDate: parsedDate,
    status: "PENDING"
  });

  await appointment.save();

  return appointment.populate([
    { path: "patient", select: "full_name email role" },
    { path: "consultant", select: "full_name email role" }
  ]);
},


   
    updateAppointmentStatus: async (_, { input }, { user }) => {
      requireRole(user, ["CONSULTANT"]);

      const { appointmentId, status } = input;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        throw new Error("Invalid status");
      }

      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      // Consultant can only update their own appointments
      if (appointment.consultant.toString() !== user.id) {
        throw new AuthenticationError("Access denied");
      }

      appointment.status = status;
      await appointment.save();

      await appointment.populate("patient", "full_name email");
      await appointment.populate("consultant", "full_name email");

      return appointment;
    }, 
    approveAndAssignAppointment: async (
  _,
  { input },
  { user }
) => {
  requireRole(user, ["ADMIN"]);

  const { appointmentId, consultantId } = input;

  // Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(appointmentId) ||
    !mongoose.Types.ObjectId.isValid(consultantId)
  ) {
    throw new Error("Invalid ID");
  }

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "PENDING") {
    throw new Error("Appointment already processed");
  }

  // Validate consultant
  const consultant = await User.findOne({
    _id: consultantId,
    role: "CONSULTANT"
  });

  if (!consultant) {
    throw new Error("Consultant not found");
  }

  appointment.status = "APPROVED";
  appointment.consultant = consultantId;

  await appointment.save();

  await appointment.populate("patient", "full_name email");
  await appointment.populate("consultant", "full_name email");

  return appointment;
},
startVideoConsultation: async (
  _,
  { appointmentId },
  { user }
) => {
  try {
    console.log("USER:", user);
    console.log("APPOINTMENT ID:", appointmentId);

    const appointment = await Appointment.findById(
      appointmentId
    );

    console.log("FOUND APPOINTMENT:", appointment);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (!appointment.consultant) {
      throw new Error(
        "No consultant assigned to appointment"
      );
    }

    console.log(
      "CONSULTANT:",
      appointment.consultant.toString()
    );

    console.log("USER ID:", user.id);

    const roomId = uuidv4();

    appointment.meetingLink =
      `https://meet.jit.si/${roomId}`;

    appointment.meetingStatus = "ACTIVE";

    await appointment.save();

    return appointment;

  } catch (err) {
    console.error(err);
    throw err;
  }
},

endVideoConsultation: async (
  _,
  { appointmentId },
  { user }
) => {

  requireRole(user, ["CONSULTANT"]);

  const appointment =
    await Appointment.findById(
      appointmentId
    );

  if (!appointment) {
    throw new Error(
      "Appointment not found"
    );
  }

  appointment.meetingStatus =
    "ENDED";

  await appointment.save();

  return appointment;
},
createFreelancerProfile: async (
  _,
  { input },
  { user }
) => {
  if (!user) {
    throw new Error("Login required");
  }

  return await Freelancer.create({
    ...input,
    user: user.id,
  });
},
bookFreelancer: async (
  _,
  { input },
  { user }
) => {
  if (!user) {
    throw new Error("Login required");
  }

  return await FreelanceBooking.create({
    patient: user.id,
    freelancer: input.freelancerId,
    service: input.service,
    date: input.date,
  });
},

createFreelanceJob: async (
  _,
  { input },
  { user }
) => {
  requireRole(user, ["ADMIN"]);

  return await FreelanceJob.create({
    ...input,
    employer: user.id,
    status: "OPEN"
  });
},

applyForFreelanceJob: async (
  _,
  { input },
  { user }
) => {
  if (!user) {
    throw new Error("Login required");
  }

  const job = await FreelanceJob.findById(input.jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const existing = await JobApplication.findOne({
    freelancer: user.id,
    job: input.jobId
  });
  if (existing) {
    throw new Error("You have already applied for this job");
  }

  const application = await JobApplication.create({
    freelancer: user.id,
    job: input.jobId,
    status: "PENDING"
  });

  return await application.populate([
    { path: "freelancer", select: "full_name email role" },
    { path: "job" }
  ]);
},

createOutpatientRecord: async (
  _,
  { input },
  { user }
) => {
  requireRole(user, ["CONSULTANT", "ADMIN"]);

  const { patientId, temp, bp, weight, pulse, notes, diagnosis, prescriptions } = input;

  const patient = await User.findOne({ _id: patientId, role: "PATIENT" });
  if (!patient) {
    throw new Error("Patient not found");
  }

  const record = await OutpatientRecord.create({
    patient: patient._id,
    consultant: user.id,
    temp,
    bp,
    weight,
    pulse,
    notes,
    diagnosis,
    prescriptions: (prescriptions || []).map((p) => ({
      drug: p.drugId,
      dosage: p.dosage,
      duration: p.duration
    })),
    status: "COMPLETED"
  });

  await record.populate([
    { path: "patient", select: "full_name email" },
    { path: "consultant", select: "full_name email" },
    { path: "prescriptions.drug" }
  ]);

  return {
    ...record.toObject(),
    id: record._id.toString(),
    message: "Outpatient record saved successfully"
  };
},

createLabTest: async (_, { input }, { user }) => {
  requireRole(user, ["LAB", "ADMIN"]);

  return await LabTest.create({
    ...input,
    createdBy: user.id
  });
},

orderLabTest: async (_, { input }, { user }) => {
  requireRole(user, ["CONSULTANT", "ADMIN"]);

  const { patientId, testName, notes } = input;

  const patient = await User.findOne({ _id: patientId, role: "PATIENT" });
  if (!patient) {
    throw new Error("Patient not found");
  }

  const labOrder = await LabOrder.create({
    patient: patient._id,
    orderedBy: user.id,
    testName,
    notes,
    status: "PENDING"
  });

  return await labOrder.populate([
    { path: "patient", select: "full_name email" },
    { path: "orderedBy", select: "full_name email role" }
  ]);
},

startLabOrder: async (_, { labOrderId }, { user }) => {
  requireRole(user, ["LAB"]);

  const labOrder = await LabOrder.findById(labOrderId);
  if (!labOrder) {
    throw new Error("Lab order not found");
  }

  if (labOrder.status !== "PENDING") {
    throw new Error("Only pending lab orders can be started");
  }

  labOrder.status = "IN_PROGRESS";
  labOrder.processedBy = user.id;
  await labOrder.save();

  return await labOrder.populate([
    { path: "patient", select: "full_name email" },
    { path: "orderedBy", select: "full_name email role" },
    { path: "processedBy", select: "full_name email" }
  ]);
},

submitLabResult: async (_, { input }, { user }) => {
  requireRole(user, ["LAB"]);

  const { labOrderId, result, resultNotes } = input;

  const labOrder = await LabOrder.findById(labOrderId);
  if (!labOrder) {
    throw new Error("Lab order not found");
  }

  if (labOrder.status === "COMPLETED") {
    throw new Error("This lab order has already been completed");
  }

  labOrder.status = "COMPLETED";
  labOrder.result = result;
  labOrder.resultNotes = resultNotes;
  labOrder.processedBy = user.id;
  labOrder.completedAt = new Date();
  await labOrder.save();

  return await labOrder.populate([
    { path: "patient", select: "full_name email" },
    { path: "orderedBy", select: "full_name email role" },
    { path: "processedBy", select: "full_name email" }
  ]);
},

  }


};

export default resolvers;
