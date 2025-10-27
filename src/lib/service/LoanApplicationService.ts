import { ILoanApplication } from '../models/LoanApplication';
import { FirestoreService, COLLECTIONS, where, orderBy } from '../firestore';

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
      const applicationId = `LA${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const application: ILoanApplication = {
        applicationId,
        userId: request.userId,
        personalInfo: request.personalInfo,
        businessInfo: request.businessInfo,
        loanDetails: request.loanDetails,
        documents: request.documents || [],
        bankDetails: request.bankDetails,
        status: 'draft',
        createdBy: request.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await FirestoreService.set(COLLECTIONS.LOAN_APPLICATIONS, applicationId, application);

      return {
        success: true,
        data: application
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
      const application = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

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
      const applications = await FirestoreService.query<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        [where('userId', '==', userId), orderBy('createdAt', 'desc')]
      );

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
      const application = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      // Prepare update data
      const updateData: Partial<ILoanApplication> = {
        ...updates,
        updatedAt: new Date()
      };

      await FirestoreService.update(COLLECTIONS.LOAN_APPLICATIONS, applicationId, updateData);

      const updatedApplication = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      return {
        success: true,
        data: updatedApplication!
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
      const application = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

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

      const updateData: Partial<ILoanApplication> = {
        status: 'submitted',
        submittedAt: new Date(),
        trackingNumber: `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        updatedBy: submittedBy,
        updatedAt: new Date()
      };

      await FirestoreService.update(COLLECTIONS.LOAN_APPLICATIONS, applicationId, updateData);

      const updatedApplication = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      return {
        success: true,
        data: updatedApplication!
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
      const application = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      const newDocument = {
        type: document.type,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        uploadedAt: new Date(),
        verified: false,
      };

      const documents = application.documents || [];
      documents.push(newDocument);

      await FirestoreService.update(COLLECTIONS.LOAN_APPLICATIONS, applicationId, {
        documents,
        updatedBy: addedBy,
        updatedAt: new Date()
      });

      const updatedApplication = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      return {
        success: true,
        data: updatedApplication!
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
      const applications = await FirestoreService.query<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        [where('status', '==', status), orderBy('updatedAt', 'desc')]
      );

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
      // Get all applications
      const allApplications = await FirestoreService.getAll<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS
      );

      // Calculate stats
      const statusBreakdown: Record<string, { count: number; totalAmount: number; averageAmount: number }> = {};
      let totalLoanAmount = 0;

      allApplications.forEach(app => {
        const status = app.status;
        if (!statusBreakdown[status]) {
          statusBreakdown[status] = { count: 0, totalAmount: 0, averageAmount: 0 };
        }
        statusBreakdown[status].count++;
        statusBreakdown[status].totalAmount += app.loanDetails.loanAmount;
        totalLoanAmount += app.loanDetails.loanAmount;
      });

      // Calculate averages
      Object.keys(statusBreakdown).forEach(status => {
        statusBreakdown[status].averageAmount = 
          statusBreakdown[status].totalAmount / statusBreakdown[status].count;
      });

      return {
        success: true,
        data: {
          totalApplications: allApplications.length,
          totalLoanAmount,
          statusBreakdown: Object.entries(statusBreakdown).map(([status, data]) => ({
            _id: status,
            ...data
          }))
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
      const application = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      if (!application) {
        return {
          success: false,
          error: 'Loan application not found'
        };
      }

      const updateData: Partial<ILoanApplication> = {
        rpaSessionId,
        automationStatus: status,
        updatedAt: new Date()
      };

      if (logMessage) {
        const automationLogs = application.automationLogs || [];
        automationLogs.push({
          timestamp: new Date(),
          action: 'automation_update',
          status: status === 'failed' ? 'error' : 'info',
          message: logMessage
        });
        updateData.automationLogs = automationLogs;
      }

      await FirestoreService.update(COLLECTIONS.LOAN_APPLICATIONS, applicationId, updateData);

      const updatedApplication = await FirestoreService.getById<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS,
        applicationId
      );

      return {
        success: true,
        data: updatedApplication!
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
      // Firestore doesn't support regex search natively
      // Fetch all applications and filter client-side
      // For production, consider using Algolia or similar service
      const allApplications = await FirestoreService.getAll<ILoanApplication>(
        COLLECTIONS.LOAN_APPLICATIONS
      );

      const searchLower = searchTerm.toLowerCase();
      const filteredApplications = allApplications.filter(app =>
        app.applicationId.toLowerCase().includes(searchLower) ||
        app.personalInfo.fullName.toLowerCase().includes(searchLower) ||
        app.personalInfo.panNumber.toLowerCase().includes(searchLower) ||
        app.businessInfo.businessName.toLowerCase().includes(searchLower) ||
        app.trackingNumber?.toLowerCase().includes(searchLower)
      );

      // Sort by createdAt descending
      filteredApplications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        data: filteredApplications
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
