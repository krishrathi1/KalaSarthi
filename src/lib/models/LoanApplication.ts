import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILoanApplication extends Document {
  applicationId: string;
  userId: string;

  // Personal Information
  personalInfo: {
    fullName: string;
    dateOfBirth: Date;
    panNumber: string;
    aadhaarNumber: string;
    phoneNumber: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
  };

  // Business Information
  businessInfo: {
    businessName: string;
    businessType: string;
    gstNumber?: string;
    businessAddress: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    annualTurnover: number;
    businessExperience: number;
  };

  // Loan Details
  loanDetails: {
    loanAmount: number;
    loanPurpose: string;
    loanTenure: number;
    collateralType?: string;
    interestRate?: number;
  };

  // Application Status
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  subStatus?: string;

  // Financial Assessment
  creditScore?: number;
  riskAssessment?: {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
  };

  // Documents
  documents: Array<{
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    verified: boolean;
    verificationNotes?: string;
  }>;

  // Bank Integration
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };

  // Processing Information
  submittedAt?: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;

  // Tracking
  trackingNumber?: string;
  portalApplicationId?: string;
  portalUrl?: string;

  // RPA Automation
  rpaSessionId?: string;
  automationStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  automationLogs?: Array<{
    timestamp: Date;
    action: string;
    status: 'success' | 'error' | 'info';
    message: string;
  }>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

const LoanApplicationSchema = new Schema<ILoanApplication>(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },

    // Personal Information
    personalInfo: {
      fullName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      panNumber: { type: String, required: true },
      aadhaarNumber: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      email: { type: String, required: true },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' },
      },
    },

    // Business Information
    businessInfo: {
      businessName: { type: String, required: true },
      businessType: { type: String, required: true },
      gstNumber: String,
      businessAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
      },
      annualTurnover: { type: Number, required: true },
      businessExperience: { type: Number, required: true },
    },

    // Loan Details
    loanDetails: {
      loanAmount: { type: Number, required: true },
      loanPurpose: { type: String, required: true },
      loanTenure: { type: Number, required: true },
      collateralType: String,
      interestRate: Number,
    },

    // Application Status
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed'],
      default: 'draft',
    },
    subStatus: String,

    // Financial Assessment
    creditScore: Number,
    riskAssessment: {
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
      riskFactors: [String],
      recommendations: [String],
    },

    // Documents
    documents: [{
      type: { type: String, required: true },
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      verified: { type: Boolean, default: false },
      verificationNotes: String,
    }],

    // Bank Integration
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String,
    },

    // Processing Information
    submittedAt: Date,
    approvedAt: Date,
    disbursedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,

    // Tracking
    trackingNumber: String,
    portalApplicationId: String,
    portalUrl: String,

    // RPA Automation
    rpaSessionId: String,
    automationStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
    },
    automationLogs: [{
      timestamp: { type: Date, default: Date.now },
      action: String,
      status: { type: String, enum: ['success', 'error', 'info'] },
      message: String,
    }],

    // Audit
    createdBy: { type: String, required: true },
    updatedBy: String,
  },
  {
    timestamps: true,
    collection: 'loan_applications'
  }
);

// Indexes
LoanApplicationSchema.index({ applicationId: 1 });
LoanApplicationSchema.index({ userId: 1 });
LoanApplicationSchema.index({ status: 1 });
LoanApplicationSchema.index({ 'personalInfo.panNumber': 1 });
LoanApplicationSchema.index({ 'businessInfo.gstNumber': 1 });
LoanApplicationSchema.index({ submittedAt: -1 });
LoanApplicationSchema.index({ createdAt: -1 });

// Pre-save middleware
LoanApplicationSchema.pre('save', function(next) {
  // Auto-generate application ID if not provided
  if (!this.applicationId) {
    this.applicationId = `LA${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // Auto-generate tracking number when submitted
  if (this.status === 'submitted' && !this.trackingNumber) {
    this.trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Set timestamps based on status
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  if (this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  if (this.status === 'disbursed' && !this.disbursedAt) {
    this.disbursedAt = new Date();
  }
  if (this.status === 'rejected' && !this.rejectedAt) {
    this.rejectedAt = new Date();
  }

  next();
});

// Static methods
LoanApplicationSchema.statics.findByApplicationId = function(applicationId: string) {
  return this.findOne({ applicationId });
};

LoanApplicationSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

LoanApplicationSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ updatedAt: -1 });
};

LoanApplicationSchema.statics.getApplicationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$loanDetails.loanAmount' },
      }
    }
  ]);
};

// Instance methods
LoanApplicationSchema.methods.addAutomationLog = function(action: string, status: 'success' | 'error' | 'info', message: string) {
  if (!this.automationLogs) {
    this.automationLogs = [];
  }

  this.automationLogs.push({
    timestamp: new Date(),
    action,
    status,
    message
  });

  return this.save();
};

LoanApplicationSchema.methods.updateStatus = function(newStatus: ILoanApplication['status'], subStatus?: string, updatedBy?: string) {
  this.status = newStatus;
  if (subStatus) this.subStatus = subStatus;
  if (updatedBy) this.updatedBy = updatedBy;
  this.updatedAt = new Date();

  return this.save();
};

const LoanApplication: Model<ILoanApplication> =
  mongoose.models.LoanApplication || mongoose.model<ILoanApplication>("LoanApplication", LoanApplicationSchema);

export default LoanApplication;