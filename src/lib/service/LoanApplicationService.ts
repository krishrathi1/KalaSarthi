import LoanApplication, { ILoanApplication } from '../models/LoanApplication';
import connectDB from '../mongodb';
import { v4 as uuidv4 } from 'uuid';

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CreateLoanApplicationRequest {
  userId: string;
  personalInfo: ILoanApplication['personalInfo'];
  businessInfo: ILoanApplication['businessInfo'];
  loanDetails: ILoanApplication['loanDetails'];
  documents?: ILoanApplication['documents'];
  bankDetails?: ILoanApplication['bankDetails'];
  createdBy: string;
}

interface UpdateLoanApplicationRequest {
  status?: ILoanApplication['status'];
  subStatus?: string;
  creditScore?: number;
  riskAssessment?: ILoanApplication['riskAssessment'];
  bankDetails?: ILoanApplication['bankDetails'];
  portalApplicationId?: string;
  portalUrl?: string;
  rejectionReason?: string;
  updatedBy?: string;
}

export class LoanApplicationService {
  static async createLoanApplication(request: CreateLoanApplicationRequest): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = new LoanApplication({
        applicationId: `LA${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        userId: request.userId,
        personalInfo: request.personalInfo,
        businessInfo: request.businessInfo,
        loanDetails: request.loanDetails,
        documents: request.documents || [],
        bankDetails: request.bankDetails,
        status: 'draft',
        createdBy: request.createdBy,
      });

      const savedApplication = await application.save();

      return {
        success: true,
        data: savedApplication
      };

    } catch (error: any) {
      console.error('Error creating loan application:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async getLoanApplicationById(applicationId: string): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = await LoanApplication.findOne({ applicationId });

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      return {
        success: true,
        data: application
      };

    } catch (error: any) {
      console.error('Error fetching loan application:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async getUserLoanApplications(userId: string): Promise<ServiceResponse<ILoanApplication[]>> {
    try {
      await connectDB();

      const applications = await LoanApplication.find({ userId })
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: applications
      };

    } catch (error: any) {
      console.error('Error fetching user loan applications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async updateLoanApplication(
    applicationId: string,
    updates: UpdateLoanApplicationRequest
  ): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = await LoanApplication.findOne({ applicationId });

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      // Update fields
      if (updates.status) application.status = updates.status;
      if (updates.subStatus) application.subStatus = updates.subStatus;
      if (updates.creditScore !== undefined) application.creditScore = updates.creditScore;
      if (updates.riskAssessment) application.riskAssessment = updates.riskAssessment;
      if (updates.bankDetails) application.bankDetails = updates.bankDetails;
      if (updates.portalApplicationId) application.portalApplicationId = updates.portalApplicationId;
      if (updates.portalUrl) application.portalUrl = updates.portalUrl;
      if (updates.rejectionReason) application.rejectionReason = updates.rejectionReason;
      if (updates.updatedBy) application.updatedBy = updates.updatedBy;

      application.updatedAt = new Date();

      const savedApplication = await application.save();

      return {
        success: true,
        data: savedApplication
      };

    } catch (error: any) {
      console.error('Error updating loan application:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async submitLoanApplication(applicationId: string, submittedBy: string): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = await LoanApplication.findOne({ applicationId });

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      if (application.status !== 'draft') {
        return {
          success: false,
          error: 'Application can only be submitted from draft status'
        };
      }

      application.status = 'submitted';
      application.submittedAt = new Date();
      application.trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      application.updatedBy = submittedBy;
      application.updatedAt = new Date();

      const savedApplication = await application.save();

      return {
        success: true,
        data: savedApplication
      };

    } catch (error: any) {
      console.error('Error submitting loan application:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async addDocument(
    applicationId: string,
    document: {
      type: string;
      fileName: string;
      fileUrl: string;
    },
    addedBy: string
  ): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = await LoanApplication.findOne({ applicationId });

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      if (!application.documents) {
        application.documents = [];
      }

      application.documents.push({
        type: document.type,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        uploadedAt: new Date(),
        verified: false,
      });

      application.updatedBy = addedBy;
      application.updatedAt = new Date();

      const savedApplication = await application.save();

      return {
        success: true,
        data: savedApplication
      };

    } catch (error: any) {
      console.error('Error adding document to loan application:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async getLoanApplicationsByStatus(status: string): Promise<ServiceResponse<ILoanApplication[]>> {
    try {
      await connectDB();

      const applications = await LoanApplication.find({ status })
        .sort({ updatedAt: -1 });

      return {
        success: true,
        data: applications
      };

    } catch (error: any) {
      console.error('Error fetching loan applications by status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async getLoanApplicationStats(): Promise<ServiceResponse<any>> {
    try {
      await connectDB();

      const stats = await LoanApplication.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$loanDetails.loanAmount' },
            averageAmount: { $avg: '$loanDetails.loanAmount' }
          }
        }
      ]);

      const totalApplications = await LoanApplication.countDocuments();
      const totalLoanAmount = await LoanApplication.aggregate([
        { $group: { _id: null, total: { $sum: '$loanDetails.loanAmount' } } }
      ]);

      return {
        success: true,
        data: {
          totalApplications,
          totalLoanAmount: totalLoanAmount[0]?.total || 0,
          statusBreakdown: stats
        }
      };

    } catch (error: any) {
      console.error('Error fetching loan application stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async updateAutomationStatus(
    applicationId: string,
    rpaSessionId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    logMessage?: string
  ): Promise<ServiceResponse<ILoanApplication>> {
    try {
      await connectDB();

      const application = await LoanApplication.findOne({ applicationId });

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      application.rpaSessionId = rpaSessionId;
      application.automationStatus = status;

      if (logMessage) {
        if (!application.automationLogs) {
          application.automationLogs = [];
        }

        application.automationLogs.push({
          timestamp: new Date(),
          action: 'automation_update',
          status: status === 'failed' ? 'error' : 'info',
          message: logMessage
        });
      }

      const savedApplication = await application.save();

      return {
        success: true,
        data: savedApplication
      };

    } catch (error: any) {
      console.error('Error updating automation status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async searchLoanApplications(searchTerm: string): Promise<ServiceResponse<ILoanApplication[]>> {
    try {
      await connectDB();

      const applications = await LoanApplication.find({
        $or: [
          { applicationId: { $regex: searchTerm, $options: 'i' } },
          { 'personalInfo.fullName': { $regex: searchTerm, $options: 'i' } },
          { 'personalInfo.panNumber': { $regex: searchTerm, $options: 'i' } },
          { 'businessInfo.businessName': { $regex: searchTerm, $options: 'i' } },
          { trackingNumber: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 });

      return {
        success: true,
        data: applications
      };

    } catch (error: any) {
      console.error('Error searching loan applications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
