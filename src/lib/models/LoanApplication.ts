export interface ILoanApplication {
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

// Loan Application document interface (includes Firestore document ID)
export interface ILoanApplicationDocument extends ILoanApplication {
  id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default ILoanApplication;

/* Firestore structure notes:
const LoanApplicationSchema = {
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

}
// Firestore indexes should be created in Firebase Console:
// - applicationId (ascending)
// - userId (ascending)
// - status (ascending)
// - personalInfo.panNumber (ascending)
// - businessInfo.gstNumber (ascending)
// - submittedAt (descending)
// - createdAt (descending)
*/
