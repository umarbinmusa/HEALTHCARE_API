import argon2 from "argon2";
import { GraphQLDateTime } from "graphql-scalars";
import jwt from "jsonwebtoken";
import mongoose, { model } from "mongoose";
import dotenv from "dotenv";
import { requireRole } from "../../utils/requireRole.js";

import { AuthenticationError, ForbiddenError } from "apollo-server-express";
import User from "../../models/user.js";
import Consultation from "../../models/consultation.js";
import Drug from "../../models/drug.js";
import DrugPurchase from "../../models/drugPurchase.js";
import Appointment from "../../models/appointment.js";

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
  
  // Map each drug to convert IDs to string
  return drugs.map(drug => ({
    id: drug._id.toString(),
    name: drug.name,
    category: drug.category,
    description: drug.description,
    price: drug.price,
    stock: drug.stock,
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
        .populate("consultant")
        .sort({ createdAt: -1 });
    },
   getConsultations: async (_, __, { models }) => {
      return await models.Consultation.find().sort({ createdAt: -1 });
    },
    

  myConsultations: async (_, __, { user }) => {
    requireRole(user, ["CONSULTANT"]);

    return await Consultation.find({ consultant: user.id })
      .populate("patient", "full_name email")
      .populate("consultant", "full_name role")
      .sort({ createdAt: -1 });
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




   myDrugPurchaseHistory: async (_, __, { user }) => {
      if (!user || user.role !== "PATIENT") {
        throw new Error("Access denied");
      }

      return DrugPurchase.find({ user: user.id })
        .populate("drug", "name price")
        .sort({ createdAt: -1 });
    },

    // 🔹 SINGLE RECEIPT
    drugPurchaseReceipt: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const purchase = await DrugPurchase.findById(id)
        .populate("drug", "name price");

      if (!purchase) throw new Error("Receipt not found");

      if (purchase.user.toString() !== user.id) {
        throw new Error("Access denied");
      }

      return purchase;
    },
    
  // ================= PATIENT =================
  myConsultations: async (_, __, { user }) => {
    requireRole(user, ["PATIENT"]);

    return await Consultation.find({ patient: user.id })
      .populate("patient", "full_name email role")
      .populate("consultant", "full_name role")
      .sort({ createdAt: -1 });
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
      
      requireRole(user, ["ADMIN"]);

      const { name, category, description, price, stock } = input;

      
      if (price < 0) {
        throw new Error("Price cannot be negative");
      }

      if (stock < 0) {
        throw new Error("Stock cannot be negative");
      }

   
      const drug = new Drug({
        name,
        category,
        description,
        price,
        stock,
        createdBy: user.id
      });

      await drug.save();

   
      await drug.populate("createdBy", "full_name role");

      return drug;
    },
    buyDrug: async (_, { input }, { user }) => {
      // 1️⃣ Only PATIENT can buy drugs
      requireRole(user, ["PATIENT"]);

      const { drugId, quantity } = input;

      // 2️⃣ Validate inputs
      if (!mongoose.Types.ObjectId.isValid(drugId)) {
        throw new Error("Invalid drug ID");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than zero");
      }

      // 3️⃣ Find drug
      const drug = await Drug.findById(drugId);

      if (!drug) {
        throw new Error("Drug not found");
      }

      // 4️⃣ Check stock
      if (drug.stock < quantity) {
        throw new Error("Insufficient stock");
      }

      // 5️⃣ Calculate prices
      const unitPrice = drug.price;
      const totalPrice = unitPrice * quantity;

     
      drug.stock -= quantity;
      await drug.save();

    
      const purchase = new DrugPurchase({
        user: user.id,
        drug: drug._id,
        quantity,
        unitPrice,
        totalPrice
      });

      await purchase.save();

      
      
      await purchase.populate("user", "full_name email role");
      await purchase.populate("drug", "name price");

      return purchase;
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
}

  }


};

export default resolvers;
